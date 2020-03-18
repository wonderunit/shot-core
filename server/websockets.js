const WebSocket = require('ws')

const Heartbeat = require('../lib/zcam/client/heartbeat')

module.exports = function create ({ app, server }) {
  const zcam = app.get('zcam')
  const bus = app.get('bus')
  const zcamHeartbeat = new Heartbeat(zcam)

  const wss = new WebSocket.Server({ clientTracking: true, noServer: true })

  server.on('upgrade', function (request, socket, head) {
    wss.handleUpgrade(request, socket, head, function (ws) {
      wss.emit('connection', ws, request)
    })
  })

  wss.on('connection', function (ws, request) {
    ws.send(JSON.stringify({
      action: 'camera/update',
      payload: {
        connected: zcamHeartbeat.deref() != null
          ? true
          : false
      }
    }))

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

  const broadcastConnected = () => broadcast({ action: 'camera/update', payload: { connected: true } })
  const broadcastDisconnected = () => broadcast({ action: 'camera/update', payload: { connected: false } })
  zcamHeartbeat
    .on('connected', broadcastConnected)
    .on('disconnected', broadcastDisconnected)
}
