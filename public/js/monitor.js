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

  webSocketScheduleReconnect () {
    let delay = 5000
    console.log('Attempting to reconnect in', delay, 'msec …')
    setTimeout(() => {
      if (!this.ws) {
        this.webSocketConnect()
      }
    }, delay)
  }

  webSocketConnect () {
    console.log('webSocketConnect')
    if (this.ws) {
      this.ws.onerror = this.ws.onopen = this.ws.onmessage = null
      this.ws.close()
      this.ws = null
    }

    this.ws = new WebSocket(`ws://${location.host}`)

    this.ws.onerror = event => {
      console.error('WebSocket error', event)
      this.webSocketScheduleReconnect()
    }

    this.ws.onopen = () => {
      console.log('WebSocket connection established')
    }

    this.ws.onmessage = event => {
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

    this.ws.onclose = () => {
      console.log('WebSocket connection closed')
      this.ws = null
      this.webSocketScheduleReconnect()
    }
  }

  initialize () {
    console.log('new Monitor')

    this.webSocketConnect()

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

  updateCameraStatus (options) {
    let { connected, query_free, query_total, battery, iso, iris } = options

    if (options.hasOwnProperty('connected')) {
      if (connected) {
        this.cameraStatusOverlayTarget.innerHTML = ''
        this.cameraStatusOverlayTarget.style.display = 'none'
      } else {
        this.cameraStatusOverlayTarget.innerHTML = 'Camera Disconnected'
        this.cameraStatusOverlayTarget.style.color = 'red'
        this.cameraStatusOverlayTarget.style.display = 'flex'
      }
    }

    if (options.hasOwnProperty('battery')) {
      this.cameraStatusBattValueTarget.style.height = battery + '%'
    }

    if (options.hasOwnProperty('query_free') && options.hasOwnProperty('query_total')) {
      let h = Math.floor(query_free / query_total * 100)
      this.cameraStatusDiskValueTarget.style.height = h + '%'
    }

    if (options.hasOwnProperty('iso')) {
      this.cameraStatusIsoTarget.innerHTML = iso
    }

    if (options.hasOwnProperty('iris')) {
      this.cameraStatusIrisTarget.innerHTML = 'f/' + iris
    }

    // this.cameraStatusFocusTarget.innerHTML = '24'
    // this.cameraStatusResTarget.innerHTML = '6k'
  }
})
