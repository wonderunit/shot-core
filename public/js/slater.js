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

    await fetch(form.action, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    window.location = window.location
  }
}

// clock
function update () {
  let el = document.getElementById('clock')
  el.innerHTML = new Date()
}
setInterval(update, ~~(1000/3))
update()
