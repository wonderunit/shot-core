const WebSocket = require('ws')

module.exports = function (url, bus) {
  const ws = new WebSocket(url)

  let pingTimeout
  function heartbeat () {
    clearTimeout(pingTimeout)
    pingTimeout = setTimeout(() => ws.terminate(), 30000 + 1000)
  }

  ws.on('open', function open () {
    heartbeat()
    console.log('[zcam-ws] connected')
  })

  ws.on('ping', function ping () {
    heartbeat()
    console.log('ping!')
  })

  ws.on('message', function incoming (data) {
    console.log('[zcam-ws] data')
    bus.emit('zcam-ws/data', data)
  })

  ws.on('close', function close() {
    console.log('[zcam-ws] disconnected')
    clearTimeout(pingTimeout)
  })

  ws.on('error', function error (err) {
    console.error('[zcam-ws] error', err.message)
    if (err.code === 'ECONNREFUSED') {
      console.error('[zcam-ws] could not connect to', url)
    } else {
      console.error(err)
    }
  })
}
