const application = Stimulus.Application.start()

application.register('monitor', class extends Stimulus.Controller {
  static targets = ['clock']

  initialize () {
    console.log('new Monitor')

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
