const application = Stimulus.Application.start()

application.register('monitor', class extends Stimulus.Controller {
  static targets = [
    'clock',

    'audioStatus0',
    'audioStatus1',
    'audioStatus2',
    'audioStatus3',
    'audioStatus4',
    'audioStatus5',
    'audioStatus6',
    'audioStatus7',

    'cameraStatusBatt',
    'cameraStatusDisk',
    'cameraStatusIso',
    'cameraStatusIris',
    'cameraStatusFocus',
    'cameraStatusRes',

    'trackStatusBatt',
    'trackStatusTracking'
  ]

  initialize () {
    console.log('new Monitor')

    let ws = new WebSocket(`ws://${location.hostname}:8000`)
    ws.onerror = function () {
      console.error('WebSocket error')
    }
    ws.onopen = function () {
      console.log('WebSocket connection established')
    }
    ws.onmessage = function (event) {
      let data = JSON.parse(event.data)
      console.log('WebSocket message', data)
      if (data.reload) {
        window.location = window.location
      }
    }
    ws.close = function () {
      console.log('WebSocket connection closed')
      ws = null
    }

    let el = this.clockTarget
    function update () {
      el.innerHTML = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      }).format(new Date())
    }
    setInterval(update, Math.floor(1000 / 3))
    update()
  }
})
