const { addDays } = require('date-fns')
const { format } = require('date-fns-tz')

const asDateOrNull = require('../../lib/asDateOrNull')

class Day {
  /*
  given a complete array of all Day objects, ordered by rank
    where the first Day MUST have a valid start_at
      and subquent Days MAY have a valid start_at
  populate the start_art value for each
  */
  static assignStartAts (collection) {
    if (collection[0].start_at == null) throw new Error('First day has invalid start_at')

    let curr

    return collection.map(day => {
      if (day.start_at) {
        curr = new Date(day.start_at)
      } else {
        curr = addDays(curr, 1)
      }

      return {
        ...day,
        start_at: curr
      }
    })
  }

  static decorateCollection (collection, { events }) {
    return Day.assignStartAts(collection.map((curr, n, arr) => {
      let next = arr[n + 1]

      let dayEvents = events.filter(
        event => event.rank > curr.rank && (next ? event.rank < next.rank : true)
      )

      return new Day({
        ...curr,
        day_number: n + 1,
        days_total: arr.length,
        event_ids: dayEvents.map(event => event.id),
        shot_count: dayEvents.filter(event => event.shot_id != null).length
      })
    }))
  }

  constructor (event) {
    for (let property in event) {
      this[property] = event[property]
    }
  }
}

module.exports = Day
