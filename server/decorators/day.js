const { addDays } = require('date-fns')
const { format } = require('date-fns-tz')

const asDateOrNull = require('../../lib/asDateOrNull')

class Day {
  static decorateCollection (collection, { events }) {
    let lastStartAt = asDateOrNull(collection[0].start_at)

    return collection.map((curr, n, arr) => {
      let next = arr[n + 1]

      let dayEvents = events.filter(
        event => event.rank > curr.rank && (next ? event.rank < next.rank : true)
      )

      curr.start_at = asDateOrNull(curr.start_at)
      if (curr.start_at) {
        lastStartAt = curr.start_at
      } else {
        lastStartAt = addDays(lastStartAt, 1)
      }

      let displayDate = asDateOrNull(curr.start_at || lastStartAt)

      return new Day({
        ...curr,
        day_number: n + 1,
        days_total: arr.length,
        event_ids: dayEvents.map(event => event.id),
        shot_count: dayEvents.filter(event => event.shot_id != null).length,
        displayDate: displayDate ? format(displayDate, 'EEEE, dd MMM yyyy') : null
      })
    })
  }

  constructor (event) {
    for (let property in event) {
      this[property] = event[property]
    }
  }
}

module.exports = Day
