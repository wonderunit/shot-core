const WebSocket = require('ws')

const Heartbeat = require('../lib/zcam/client/heartbeat')

module.exports = function create ({ app, server }) {
  const zcam = app.get('zcam')
  const bus = app.get('bus')
  const zcamHeartbeat = new Heartbeat(zcam)

  const wss = new WebSocket.Server({ clientTracking: true, noServer: true })

  server.on('upgrade', function (request, socket, head) {
    console.log('server: upgrade')
    wss.handleUpgrade(request, socket, head, function (ws) {
      wss.emit('connection', ws, request)
    })
  })

  wss.on('connection', function (ws, request) {
    console.log('wss: connection')
    ws.send(JSON.stringify({
      action: 'camera/update',
      payload: {
        connected: zcamHeartbeat.deref() != null
          ? true
          : false
      }
    }))
    reportCameraStatus()

    ws.on('message', function (message) {
      console.log('ws: message', message)
    })

    ws.on('close', function () {
      console.log('ws: close')
    })
  })

  // wss.on('close', function close () { })

  const broadcast = data => {
    wss.clients.forEach(function (ws) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data))
      }
    })
  }

  const broadcastReload = () => broadcast({ action: 'reload' })
  bus
    .on('takes/create', broadcastReload)
    .on('takes/action', broadcastReload)
    .on('takes/cut', broadcastReload)
    .on('slater/updated', broadcastReload)

  const broadcastConnected = () => broadcast({
    action: 'camera/update', payload: { connected: true }
  })
  const broadcastDisconnected = () => broadcast({
    action: 'camera/update', payload: { connected: false }
  })
  zcamHeartbeat
    .on('connected', broadcastConnected)
    .on('disconnected', broadcastDisconnected)

  const reportCameraStatus = async () => {
    try {
      let query_free = (await zcam.get('/ctrl/card?action=query_free')).data.msg
      let query_total = (await zcam.get('/ctrl/card?action=query_total')).data.msg
      let battery = (await zcam.get('/ctrl/get?k=battery')).data.value

      let iso = (await zcam.get('/ctrl/get?k=iso')).data.value
      let iris = (await zcam.get('/ctrl/get?k=iris')).data.value

      broadcast({
        action: 'camera/update',
        payload: {
          query_free,
          query_total,
          battery,
          iso,
          iris
        }
      })
    } catch (err) {
      if (err.code !== 'ECONNREFUSED') {
        console.error(err)
      }
    }
  }

  setInterval(reportCameraStatus, 15 * 1000)
}
