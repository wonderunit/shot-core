const WebSocket = require('ws')

function noop () {}

function heartbeat () {
  this.isAlive = true
}

module.exports = function create (server) {
  const wss = new WebSocket.Server({ server, clientTracking: true })

  // server.on('upgrade', function (request, socket, head) {
  //   console.log('server: upgrade')
  //   wss.handleUpgrade(request, socket, head, function (ws) {
  //     wss.emit('connection', ws, request)
  //   })
  // })

  wss.on('connection', function (ws, request) {
    console.log(`wss: connection, client #${wss.clients.size}`)
    ws.isAlive = true
    ws.on('pong', heartbeat)

    // ws.on('message', function (message) {
    //   console.log('ws: message', message)
    // })

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
  const broadcastUpdate = () => broadcast({ what: 'TempUpdate', 'value': 58 })

  setInterval(broadcastUpdate, 5 * 1000)

  return {
    broadcast
  }
}

