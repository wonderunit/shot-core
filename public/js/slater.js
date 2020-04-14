import sockette from './sockette.js'

Turbolinks.start()

const application = Stimulus.Application.start()

function refresh () {
  Turbolinks.visit(window.location, { action: 'replace' })
}

addEventListener('turbolinks:load', () => {
  // remote-data
  let forms = document.querySelectorAll('form[data-remote]')
  for (let form of forms) {
    form.onsubmit = async function (event) {
      event.preventDefault()

      let inputs = form.querySelectorAll('input')
      let body = [...inputs].reduce((acc, { name, value }) => {
        acc[name] = value
        return acc
      }, {})

      body.at = (new Date()).toISOString()

      let method
      if (body._method) {
        method = body._method
        delete body._method
      } else {
        method = form.method
      }

      let { ok, statusText } = await fetch(form.action, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (ok) {
        refresh()
      } else {
        alert(statusText)
      }
    }
  }
})

application.register('clock', class extends Stimulus.Controller {
  initialize () {
    setInterval(() => this.update(), ~~(1000/3))
  }

  connect () {
    this.update()
  }

  update () {
    this.element.innerHTML = new Date()
  }
})

application.register('rating', class extends Stimulus.Controller {
  static targets = ['star', 'none', 'zero']

  setRating (event) {
    event.preventDefault()

    let rating = event.target.dataset.value == ''
      ? null
      : parseInt(event.target.dataset.value, 10)

    fetch(
      this.data.get('url'),
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating })
      }
    )
    .then(refresh)
    .catch(err => alert(err))
  }
})

const ws = sockette(`ws://${location.host}`, {
  onmessage: e => {
    let { action, payload } = JSON.parse(event.data)

    console.log('ws', action)
    console.log(payload)

    switch (action) {
      case 'reload':
        window.location = window.location
        break
    }
  }
})
