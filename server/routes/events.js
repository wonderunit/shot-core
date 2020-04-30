const { run, get } = require('../db')
const createEvent = require('../services/create-event')

exports.create = (req, res, next) => {
  let { projectId } = req.params
  projectId = parseInt(projectId)

  let { insertAfter, eventType, description = '' } = req.body

  createEvent({
    projectId,
    insertAfter,
    eventType,
    description
  })

  return res.status(201).send()
}

exports.update = (req, res) => {
  let { eventId } = req.params
  let { description, startAt } = req.body

  if (startAt) {
    try {
      if (new Date(startAt) == 'Invalid Date') {
        throw new Error('Invalid Date')
      }

      run(
        `UPDATE events
        SET start_at = :start_at
        WHERE id = :id`,
        { start_at: startAt, id: eventId }
      )
      return res.sendStatus(204)
    } catch (err) {
      console.error(err)
      return res.status(422).send('Invalid Date')
    }
  }

  if (description) {
    run(
      `UPDATE events
      SET description = :description
      WHERE id = :eventId`,
      { description, eventId }
    )
    return res.sendStatus(204)
  }

  return res.sendStatus(422)
}

exports.destroy = (req, res) => {
  let { eventId } = req.params

  run('DELETE FROM events WHERE id = ?', eventId)

  try {
    return res.sendStatus(204)
  } catch (err) {
    return next(err)
  }
}
