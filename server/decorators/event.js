const asDateOrNull = require('../../lib/asDateOrNull')

class Event {
  static decorateCollection (collection) {
    return collection.map(event => {
      return new Event(event)
    })
  }

  constructor (event) {
    for (let property in event) {
      this[property] = event[property]
    }

    this.start_at = asDateOrNull(this.start_at)
  }
}

module.exports = Event
