const WebSocket = require('ws')

module.exports = function create (server) {
  const wss = new WebSocket.Server({ server, clientTracking: true, noServer: true })

  // server.on('upgrade', function (request, socket, head) {
  //   console.log('server: upgrade')
  //   wss.handleUpgrade(request, socket, head, function (ws) {
  //     wss.emit('connection', ws, request)
  //   })
  // })

  wss.on('connection', function (ws, request) {
    console.log('wss: connection')
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

  const broadcastUpdate = async () => {
    broadcast(
      { what: 'TempUpdate', 'value': 58 }
    )
  }

  setInterval(broadcastUpdate, 5 * 1000)
}
