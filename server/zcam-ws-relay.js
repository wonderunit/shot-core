const WebSocket = require('ws')

module.exports = function (url, bus) {
  let msecs = 5000
  let timeoutId
  function reconnect () {
    timeoutId = setTimeout(function () {
      console.log('[zcam-ws] attempting to reconnect …')
      open(url, bus)
    }, msecs)
  }

  function open (url, bus) {
    const ws = new WebSocket(url)

    let pingTimeout
    function heartbeat () {
      clearTimeout(pingTimeout)
      pingTimeout = setTimeout(() => ws.terminate(), 30000 + 1000)
    }

    ws.on('open', function open () {
      heartbeat()
      bus.emit('zcam-ws/open')
      console.log('[zcam-ws] connected')
    })

    ws.on('ping', function ping () {
      heartbeat()
      console.log('ping!')
    })

    ws.on('message', function incoming (message) {
      // console.log('[zcam-ws] data')
      let data = JSON.parse(message)

      // raw data
      bus.emit('zcam-ws/data', data)

      // as action
      const { what, value } = data
      bus.emit(`zcam/${what}`, value)

      switch (what) {
        case 'ConfigChanged':
          break;

        case 'CardMounted':
          break;
        case 'CardUnmounted':
          break;

        case 'RecStarted':
          break;
        case 'RecStoped':
          break;
        case 'RecUpdateDur':
          break;
        case 'RecUpdateRemain':
          break;

        case 'TempUpdate':
          break;

        case 'AiDetection':
          break;

        case 'ModeChanged':
          break;

        case 'HeadphonePlug':
          break;

        case 'LtcPlug':
          break;
        case 'UsbPlug':
          break;
      }
    })

    ws.on('close', function close() {
      console.log('[zcam-ws] disconnected')
      clearTimeout(pingTimeout)
      timeoutId = clearTimeout(timeoutId)
      bus.emit('zcam-ws/closed')
      reconnect()
    })

    ws.on('error', function error (err) {
      console.error('[zcam-ws] error connecting to', url)
      bus.emit('zcam-ws/error', err.code)
      reconnect()
    })
  }

  open(url, bus)
}
