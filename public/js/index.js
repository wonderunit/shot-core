const application = Stimulus.Application.start()

async function handler (response) {
  if (response.ok) {
    try {
      let json = await response.json()
      return [response, json]
    } catch (err) {
      return [response]
    }
  } else {
    // try {
    //   await response.json()
    //   throw new Error(json.errors.map(error => error.title))
    // } catch (err) {
    //   throw new Error(response.statusText)
    // }
    throw new Error(response.statusText)
  }
}

application.register('shot-event', class extends Stimulus.Controller {
  addDayAfter (e) {
    e.preventDefault()
  addDayAfter (event) {
    event.preventDefault()

    let id = this.data.get('id')
    let projectId = this.data.get('project-id')

    let uri = `/projects/${projectId}/events`
    let body = {
      insertAfter: id
    }

    fetch(
      uri,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    )
    .then(handler)
    .then(([{ ok, status }, result]) => {
      window.location = window.location
    })
    .catch(err => {
      alert(err)
    })
  }
})
