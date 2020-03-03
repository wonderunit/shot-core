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

const closestScheduleEvent = el => el.closest('[data-controller="schedule-event"]')

// very basic turbolinks-style HTML reloader
function reload () {
  document.body.style.cursor = 'wait'

  fetch(window.location.toString())
    .then(response => response.text())
    .then(html => {
      let element = document.createElement('html')
      element.innerHTML = html
      let body = element.querySelector('body') || document.createElement('body')
      document.body.parentElement.replaceChild(body, document.body)
    })
    .catch(err => {
      document.body.style.cursor = ''
      console.error(err)
      alert('An error occurred. Please reload.')
    })
}

// const yPos = target => target.getBoundingClientRect().y + window.scrollY

const application = Stimulus.Application.start()

application.register('schedule', class extends Stimulus.Controller {
  static targets = [ 'dragHandle' ]

  dragState = {}

  initialize () {
    this.placeholder = document.createElement('div')
    this.placeholder.classList.add('placeholder')
    this.placeholder.dataset.controller = 'placeholder'
    this.placeholder.dataset.action = `
      dragover->placeholder#dragOver
      dragenter->placeholder#dragOver

      dragleave->placeholder#dragLeave
    `
  }

  placeholderByElement (el) {
    return this.application.getControllerForElementAndIdentifier(
      el,
      'placeholder'
    )
  }

  scheduleEventByElement (el) {
    return this.application.getControllerForElementAndIdentifier(
      closestScheduleEvent(el),
      'schedule-event'
    )
  }

  pointerDown (event) {
    if (this.dragHandleTargets.includes(event.target)) {
      this.dragState = {
        // offset: event.pageY - yPos(event.target)
      }
    }
  }

  dragStart (event) {
    let scheduleEvent = this.scheduleEventByElement(event.target)

    if (scheduleEvent) {
      this.dragState = {
        ...this.dragState,
        source: scheduleEvent,
        rank: null
      }

      let height = scheduleEvent.element.getBoundingClientRect().height
      this.placeholder.style.height = `${height}px`
    }

    event.dataTransfer.dropEffect = 'move'
    event.dataTransfer.setData('text/plain', scheduleEvent.data.get('id'))

    setTimeout(() => { event.target.style.opacity = 0.1 }, 0)
  }

  dragOver (event) {
    let scheduleEvent = this.scheduleEventByElement(event.target)

    if (scheduleEvent) {
      if (scheduleEvent != this.dragState.source) {
        let head = scheduleEvent.data.get('event-type') == 'day'

        let rect = scheduleEvent.element.getBoundingClientRect()
        let before = (event.clientY - rect.top) / rect.height > .5

        if (head) before = false

        let oldRank = parseInt(this.dragState.source.data.get('rank'))
        let newRank = parseInt(scheduleEvent.data.get('rank'))

        if (before) {
          scheduleEvent.element.parentNode.insertBefore(
            this.placeholder,
            scheduleEvent.element
          )
          // before
          this.dragState.rank = newRank + ((newRank > oldRank) ? -1 : 0)
        } else {
          scheduleEvent.element.parentNode.insertBefore(
            this.placeholder,
            scheduleEvent.element.nextSibling
          )
          // after 
          this.dragState.rank = newRank + ((newRank > oldRank) ? 0 : +1)
        }
      }
    }
  }

  drop (event) {
    event.preventDefault()

    let id = parseInt(event.dataTransfer.getData('text/plain'), 10)
    let rank = this.dragState.rank

    this.moveScheduledEvent(id, rank)
  }

  dragEnd (event) {
    // const { screenX, screenY } = event
    let scheduleEvent = this.scheduleEventByElement(event.target)

    scheduleEvent.element.style.opacity = 1.0

    this.dragState = {
      // offset: null
    }

    if (event.dataTransfer.dropEffect === 'none') {
      if (this.placeholder.parentNode) {
        this.placeholder.parentNode.removeChild(this.placeholder)
      }
    }
  }

  moveScheduledEvent (id, rank) {
    let projectId = this.data.get('project-id')
    let uri = `/projects/${projectId}/schedule`
    let body = {
      [id]: { rank }
    }
    fetch(
      uri,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    )
    .then(handler)
    .then(([{ ok, status }, result]) => {
      reload()
    })
    .catch(err => {
      alert(err)
    })
  }
})

application.register('schedule-event', class extends Stimulus.Controller {
  static targets = [ 'dragHandle' ]

  pointerDown (event) {
    // only allow drag from handle. interior text is selectable, not draggable.
    if (this.dragHandleTargets.includes(event.target) != true) {
      this.element.draggable = false
    } else {
      this.element.draggable = true
    }
  }

  addDay (event) {
    event.preventDefault()

    let id = this.data.get('id')
    let projectId = this.data.get('project-id')

    let uri = `/projects/${projectId}/events`
    let body = {
      insertAfter: id,
      eventType: 'day'
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
      reload()
    })
    .catch(err => {
      alert(err)
    })
  }

  addNote (event) {
    event.preventDefault()

    let id = this.data.get('id')
    let projectId = this.data.get('project-id')

    let uri = `/projects/${projectId}/events`
    let body = {
      insertAfter: id,
      eventType: 'note'
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
      reload()
    })
    .catch(err => {
      alert(err)
    })
  }
})

application.register('placeholder', class extends Stimulus.Controller {
  dragOver (event) {
    event.preventDefault()
    this.element.classList.add('highlight')
  }

  dragLeave (event) {
    this.element.classList.remove('highlight')
  }
})
