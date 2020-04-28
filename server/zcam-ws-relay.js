global.WebSocket = global.WebSocket || require('ws')
const Sockette = require('sockette')

const { createMachine, interpret } = require('xstate')
const debug = require('debug')('shotcore:zcam-ws-relay')

const { get } = require('./db')

const create = require('./services/takes/create')
const action = require('./services/takes/action')
const cut = require('./services/takes/cut')
const updateFilepath = require('./services/takes/update-filepath')
const activityMonitorMachine = require('./machines/activity-monitor')

class ZcamWsRelay {
  constructor (url, bus, zcam, { projectId }) {
    this.url = url
    this.bus = bus
    this.zcam = zcam

    this.state = {
      ws: null,

      projectId,
      cameraListener: true
    }

    this.onCameraEnable = this.onCameraEnable.bind(this)
    this.onCameraDisable = this.onCameraDisable.bind(this)

    this.activityMonitor = interpret(
      createMachine(
        activityMonitorMachine,
        {
          actions: {
            emitIdle: () => this.bus.emit('camera/idle'),
            emitActive: () => this.bus.emit('camera/active')
          }
        }
      )
    )
    .onTransition(event => debug('->', event.value))
    .start()
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

  open () {
    this.state.ws = new Sockette(this.url, {
      timeout: 5e3,

      onopen: e => {
        debug('connected')
        this.activityMonitor.send('CONNECTED')
        this.bus.emit('zcam-ws/open')
      },

      onmessage: async event => {
        let message = event.data

        debug('message', message)

        if (message === '') {
          console.warn('[zcam-ws] got empty ws message from Z Cam.')
          return
        }

        try {
          let data = JSON.parse(message)

          // raw data
          this.bus.emit('zcam-ws/data', data)

          // as action
          const { what, value } = data
          this.bus.emit(`zcam/${what}`, value)

          switch (what) {
            case 'ConfigChanged':
              debug('ConfigChanged', value)
              this.activityMonitor.send('ACTIVITY')
              break

            case 'CardMounted':
              break
            case 'CardUnmounted':
              break

            case 'RecStarted':
              this.activityMonitor.send('OFF')
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
              this.activityMonitor.send('CONNECTED')
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
              debug('ModeChanged', value)
              this.activityMonitor.send('ACTIVITY')
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
      },

      onclose: event => {
        debug('onclose', 'code:' + event.code)
        this.activityMonitor.send('OFF')
        this.bus.emit('zcam-ws/closed')
      },

      onerror: event => {
        console.error('[zcam-ws] error connecting to', this.url)
        this.bus.emit('zcam-ws/error', event.error.code)
      }
    })
  }

  onCameraEnable () {
    this.state.cameraListener = true
  }
  onCameraDisable () {
    this.state.cameraListener = false
  }

  async start () {
    debug('start')

    this.bus.on('camera-listener/enable', this.onCameraEnable)
    this.bus.on('camera-listener/disable', this.onCameraDisable)

    this.open()
  }

  async stop () {
    debug('stop')

    this.bus.off('camera-listener/enable', this.onCameraEnable)
    this.bus.off('camera-listener/disable', this.onCameraDisable)

    if (!this.state.ws) return

    this.state.ws.close()
  }
}

module.exports = ZcamWsRelay
