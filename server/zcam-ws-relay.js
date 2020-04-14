const WebSocket = require('ws')
const debug = require('debug')('shotcore:zcam-ws-relay')

const { get } = require('./db')

const create = require('./services/takes/create')
const action = require('./services/takes/action')
const cut = require('./services/takes/cut')
const updateFilepath = require('./services/takes/update-filepath')

class ZcamWsRelay {
  constructor (url, bus, zcam, { projectId }) {
    this.url = url
    this.bus = bus
    this.zcam = zcam

    this.state = {
      ws: null,

      msecs: 5000,
      reconnectTimeoutId: null,
      stopping: false,

      // TODO
      // idleTimeoutId: null,

      projectId,
      cameraListener: true
    }
  }

  onRecStart ({ projectId, at }) {
    // SEE: slater.show
    let project = get('SELECT * FROM projects WHERE id = ?', projectId)

    if (project && project.slater_event_id) {
      let event = get('SELECT * FROM events WHERE id = ?', project.slater_event_id)

      let sceneId = event.scene_id
      let shotId = event.shot_id

      let takeId = create({ projectId, sceneId, shotId, at })
      this.bus.emit('takes/create', { id: takeId })

      action({ takeId, at })
      this.bus.emit('takes/action')
    }
  }

  async onRecStop ({ projectId, at }) {
    // SEE: slater.show
    let project = get('SELECT * FROM projects WHERE id = ?', projectId)

    if (project && project.slater_event_id) {
      let event = get('SELECT * FROM events WHERE id = ?', project.slater_event_id)

      // find active take for this shot
      // active means:
      // - highest take_number
      // - empty cut_at timestamp
      let take = get(
        `
        SELECT * FROM takes
        WHERE shot_id = ?
        AND cut_at IS NULL
        ORDER BY take_number DESC
        LIMIT 1
        `,
        event.shot_id
      )

      if (take) {
        let takeId = take.id

        cut({ takeId, at })

        let filepath = (await this.zcam.get('/ctrl/get?k=last_file_name')).data.value
        updateFilepath({ takeId, filepath })

        this.bus.emit('takes/cut')
      } else {
        console.error('[zcam-ws] ERROR could not find take in database')
      }
    }
  }

  reconnect () {
    clearTimeout(this.state.reconnectTimeoutId)
    this.state.reconnectTimeoutId = setTimeout(() => {
      debug('attempting to reconnect …')
      this.open()
    }, this.state.msecs)
  }

  open () {
    this.state.ws = new WebSocket(this.url)
    // let pingTimeoutId

    // function heartbeat () {
    //   debug('heartbeat')
    //   clearTimeout(pingTimeoutId)
    //   pingTimeoutId = setTimeout(() => {
    //     debug('timed out! terminating')
    //     this.state.ws.terminate()
    //   }, 30000 + 1000)
    // }

    this.state.ws.on('open', () => {
      // heartbeat()
      this.bus.emit('zcam-ws/open')
      debug('connected')
    })

    // this.state.ws.on('ping', function ping () {
    //   heartbeat()
    //   debug('ping!')
    // })

    this.state.ws.on('message', async (message) => {
      debug('message', message)

      if (message === '') {
        console.warn('[zcam-ws] got empty ws message from Z Cam.')
        return
      }

      try {
        let data = JSON.parse(message)

        // clearTimeout(this.idleTimeoutId)
        // this.idleTimeoutId = setTimeout(onIdle, 5000)

        // raw data
        this.bus.emit('zcam-ws/data', data)

        // as action
        const { what, value } = data
        this.bus.emit(`zcam/${what}`, value)

        switch (what) {
          case 'ConfigChanged':
            break

          case 'CardMounted':
            break
          case 'CardUnmounted':
            break

          case 'RecStarted':
            if (this.state.cameraListener) {
              debug('Z Cam REC (RecStarted)')
              this.onRecStart({
                projectId: this.state.projectId,
                at: new Date().toISOString()
              })
            } else {
              // Slater is currently recording. Ignore REC notification.
            }
            break
          case 'RecStoped':
            if (this.state.cameraListener) {
              debug('Z Cam STOP (RecStoped)')
              await this.onRecStop({
                projectId: this.state.projectId,
                at: new Date().toISOString()
              })
            } else {
              // Slater is currently stopping. Ignore STOP notification.
            }
            break
          case 'RecordingFile':
            debug('RecordingFile', value)
            break

          case 'RecUpdateDur':
            break
          case 'RecUpdateRemain':
            break

          case 'TempUpdate':
            break

          case 'AiDetection':
            break

          case 'ModeChanged':
            break

          case 'HeadphonePlug':
            break

          case 'LtcPlug':
            break
          case 'UsbPlug':
            break
        }
      } catch (err) {
        console.error('[zcam-ws] ERROR', err)
      }
    })

    this.state.ws.on('close', code => {
      debug('ws close', { code })
      // pingTimeoutId = clearTimeout(pingTimeoutId)
      this.bus.emit('zcam-ws/closed')
      if (this.state.stopping === false) {
        this.state.reconnectTimeoutId = clearTimeout(this.state.reconnectTimeoutId)
        this.reconnect()
      }
    })

    this.state.ws.on('error', (err) => {
      console.error('[zcam-ws] error connecting to', this.url)
      // pingTimeoutId = clearTimeout(pingTimeoutId)
      this.bus.emit('zcam-ws/error', err.code)
      if (this.state.stopping === false) {
        this.state.reconnectTimeoutId = clearTimeout(this.state.reconnectTimeoutId)
        this.reconnect()
      }
    })
  }

  async start () {
    debug('start')
    this.bus.on('camera-listener/enable', () => (this.state.cameraListener = true))
    this.bus.on('camera-listener/disable', () => (this.state.cameraListener = false))

    this.open()
  }

  async stop () {
    debug('stop')
    try {
      this.state.stopping = true
      clearTimeout(this.state.idleTimeoutId)
      if (this.state.ws) {
        await new Promise(resolve => {
          this.state.ws.on('close', code => resolve(code))
          this.state.ws.close()
        })
      }
      clearTimeout(this.state.reconnectTimeoutId)
    } catch (err) {
      console.error(err)
    }
  }
}

module.exports = ZcamWsRelay
