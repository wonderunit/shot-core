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
      window.location = window.location
    } else {
      alert(statusText)
    }
  }
}

// clock
function update () {
  let el = document.getElementById('clock')
  el.innerHTML = new Date()
}
setInterval(update, ~~(1000/3))
update()

function forceReload () {
  window.location = window.location
}

const application = Stimulus.Application.start()
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
    .then(forceReload)
    .catch(err => alert(err))
  }
})
