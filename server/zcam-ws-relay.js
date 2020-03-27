const WebSocket = require('ws')

const { get } = require('./db')

const create = require('./services/takes/create')
const action = require('./services/takes/action')
const cut = require('./services/takes/cut')

module.exports = function (url, bus, zcam) {
  let msecs = 5000
  let reconnectTimeoutId

  let state = {
    projectId: 1,
    cameraListener: true
  }
  bus.on('camera-listener/enable', () => (state.cameraListener = true))
  bus.on('camera-listener/disable', () => (state.cameraListener = false))
  async function onRecStart ({ projectId, at }) {
    // SEE: slater.show
    let project = get('SELECT * FROM projects WHERE id = ?', projectId)

    if (project && project.slater_event_id) {
      let event = get('SELECT * FROM events WHERE id = ?', project.slater_event_id)

      let sceneId = event.scene_id
      let shotId = event.shot_id

      let takeId = create({ projectId, sceneId, shotId, at })
      bus.emit('takes/create')

      action({ takeId, at })
      bus.emit('takes/action')
    }
  }
  function onRecStop ({ projectId, at }) {
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
        bus.emit('takes/cut')
      }
    }
  }

  function reconnect () {
    clearTimeout(reconnectTimeoutId)
    reconnectTimeoutId = setTimeout(function () {
      console.log('[zcam-ws] attempting to reconnect …')
      open(url, bus)
    }, msecs)
  }

  function open (url, bus) {
    const ws = new WebSocket(url)
    // let pingTimeoutId

    // function heartbeat () {
    //   console.log('[zcam-ws] heartbeat')
    //   clearTimeout(pingTimeoutId)
    //   pingTimeoutId = setTimeout(() => {
    //     console.log('[zcam-ws] timed out! terminating')
    //     ws.terminate()
    //   }, 30000 + 1000)
    // }

    ws.on('open', function open () {
      // heartbeat()
      bus.emit('zcam-ws/open')
      console.log('[zcam-ws] connected')
    })

    // ws.on('ping', function ping () {
    //   heartbeat()
    //   console.log('[zcam-ws] ping!')
    // })

    ws.on('message', async function incoming (message) {
      try {
        // console.log('[zcam-ws] data')
        let data = JSON.parse(message)

        // raw data
        bus.emit('zcam-ws/data', data)

        // as action
        const { what, value } = data
        bus.emit(`zcam/${what}`, value)

        switch (what) {
          case 'ConfigChanged':
            break

          case 'CardMounted':
            break
          case 'CardUnmounted':
            break

          case 'RecStarted':
            console.log('[zcam-ws] got RecStarted', state.cameraListener ? '…' : '(ignored)')
            if (state.cameraListener) {
              await onRecStart({
                projectId: state.projectId,
                at: new Date().toISOString()
              })
            }
            break
          case 'RecordingFile':
            console.log('[zcam-ws] got RecordingFile', value)
            console.log(data)
            break
          case 'RecStoped':
            console.log('[zcam-ws] got RecStoped', state.cameraListener ? '…' : '(ignored)')
            if (state.cameraListener) {
              onRecStop({
                projectId: state.projectId,
                at: new Date().toISOString()
              })
            }
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
        console.error(err)
        console.log({ message })
      }
    })

    ws.on('close', function close() {
      console.log('[zcam-ws] disconnected')
      // pingTimeoutId = clearTimeout(pingTimeoutId)
      reconnectTimeoutId = clearTimeout(reconnectTimeoutId)
      bus.emit('zcam-ws/closed')
      reconnect()
    })

    ws.on('error', function error (err) {
      console.error('[zcam-ws] error connecting to', url)
      // pingTimeoutId = clearTimeout(pingTimeoutId)
      reconnectTimeoutId = clearTimeout(reconnectTimeoutId)
      bus.emit('zcam-ws/error', err.code)
      reconnect()
    })
  }

  open(url, bus)
}
