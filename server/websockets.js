const WebSocket = require('ws')

const Heartbeat = require('../lib/zcam/client/heartbeat')

function noop () {}

function heartbeat () {
  this.isAlive = true
}

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
    ws.isAlive = true
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

    ws.on('pong', heartbeat)

    ws.on('close', function () {
      console.log('ws: close')
    })
  })

  const interval = setInterval(function ping () {
    wss.clients.forEach(function each (ws) {
      if (ws.isAlive === false) {
        console.log('ws: client unreachable. terminating')
        ws.terminate()
        return
      }

      ws.isAlive = false
      ws.ping(noop)
    })
  }, 30000)

  wss.on('close', function close () {
    clearInterval(interval)
  })

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

  // publish Z Cam data to monitors
  bus
    .on(
      'zcam-ws/data',
      data => broadcast(
        {
          action: 'zcam-ws/data',
          payload: { data }
        }
      )
    )
    .on(
      'zcam-ws/closed',
      () => broadcast({ action: 'zcam-ws/closed', payload: {} })
    )
    .on(
      'zcam-ws/error',
      code => broadcast({ action: 'zcam-ws/error', payload: { code } })
    )
    .on(
      'zcam-ws/open',
      () => broadcast({ action: 'zcam-ws/open', payload: {} })
    )
}
