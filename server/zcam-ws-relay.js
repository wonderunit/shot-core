const WebSocket = require('ws')

const { get } = require('./db')

const create = require('./services/takes/create')
const action = require('./services/takes/action')
const cut = require('./services/takes/cut')
const updateFilepath = require('./services/takes/update-filepath')

module.exports = function (url, bus, zcam, { projectId }) {
  let msecs = 5000
  let reconnectTimeoutId

  let state = {
    projectId,
    cameraListener: true
  }
  bus.on('camera-listener/enable', () => (state.cameraListener = true))
  bus.on('camera-listener/disable', () => (state.cameraListener = false))
  function onRecStart ({ projectId, at }) {
    // SEE: slater.show
    let project = get('SELECT * FROM projects WHERE id = ?', projectId)

    if (project && project.slater_event_id) {
      let event = get('SELECT * FROM events WHERE id = ?', project.slater_event_id)

      let sceneId = event.scene_id
      let shotId = event.shot_id

      let takeId = create({ projectId, sceneId, shotId, at })
      bus.emit('takes/create', { id: takeId })

      action({ takeId, at })
      bus.emit('takes/action')
    }
  }
  async function onRecStop ({ projectId, at }) {
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

        let filepath = (await zcam.get('/ctrl/get?k=last_file_name')).data.value
        updateFilepath({ takeId, filepath })

        bus.emit('takes/cut')
      } else {
        console.error('[zcam-ws] ERROR could not find take in database')
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
      console.log('[zcam-ws] message', message)

      if (message === '') {
        console.warn('[zcam-ws] got empty ws message from Z Cam.')
        return
      }

      try {
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
            if (state.cameraListener) {
              console.log('[zcam-ws] Z Cam REC (RecStarted)')
              onRecStart({
                projectId: state.projectId,
                at: new Date().toISOString()
              })
            } else {
              // Slater is currently recording. Ignore REC notification.
            }
            break
          case 'RecStoped':
            if (state.cameraListener) {
              console.log('[zcam-ws] Z Cam STOP (RecStoped)')
              await onRecStop({
                projectId: state.projectId,
                at: new Date().toISOString()
              })
            } else {
              // Slater is currently stopping. Ignore STOP notification.
            }
            break
          case 'RecordingFile':
            console.log('[zcam-ws] RecordingFile', value)
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
