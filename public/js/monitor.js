const application = Stimulus.Application.start()

let ws

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

    'cameraStatus',
    'cameraStatusOverlay',
    'cameraStatusBatt',
    'cameraStatusBattValue',
    'cameraStatusDisk',
    'cameraStatusDiskValue',
    'cameraStatusIso',
    'cameraStatusIris',
    'cameraStatusFocus',
    'cameraStatusRes',

    'trackStatusBatt',
    'trackStatusTracking'
  ]

  initialize () {
    console.log('new Monitor')

    if (ws) {
      ws.onerror = ws.onopen = ws.onmessage = null
      ws.close()
      ws = null
    }
    ws = new WebSocket(`ws://${location.hostname}:8000`)
    ws.onerror = function (event) {
      console.error('WebSocket error', event)
    }
    ws.onopen = function () {
      console.log('WebSocket connection established')
    }
    ws.onmessage = event => {
      let { action, payload } = JSON.parse(event.data)
      console.log('WebSocket message', action, payload)
      switch (action) {
        case 'reload':
          window.location = window.location
          break
        case 'camera/update':
          this.updateCameraStatus(payload)
          break
      }
    }
    ws.onclose = function () {
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

    this.updateCameraStatus({ connected: false })
  }

  updateCameraStatus ({ connected }) {
    if (connected) {
      this.cameraStatusOverlayTarget.innerHTML = ''
      this.cameraStatusOverlayTarget.style.display = 'none'
    } else {
      this.cameraStatusOverlayTarget.innerHTML = 'Camera Disconnected'
      this.cameraStatusOverlayTarget.style.color = 'red'
      this.cameraStatusOverlayTarget.style.display = 'flex'
    }

    this.cameraStatusBattValueTarget.style.height = '0%'
    this.cameraStatusDiskValueTarget.style.height = '0%'

    this.cameraStatusIsoTarget.innerHTML = '200'
    this.cameraStatusIrisTarget.innerHTML = 'f/5.6'
    this.cameraStatusFocusTarget.innerHTML = '24'
    this.cameraStatusResTarget.innerHTML = '6k'
  }
})
