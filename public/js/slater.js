// remote-data
let forms = document.querySelectorAll('form[data-remote]')
for (let form of forms) {
  form.onsubmit = async function (event) {
    event.preventDefault()

    let inputs = form.querySelectorAll('input')
    let object = [...inputs].reduce((acc, { name, value }) => {
      acc[name] = value
      return acc
    }, {})

    object.at = (new Date()).toISOString()

    await fetch(
      form.action,
      {
        method: form.method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(object)
      }
    )
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
