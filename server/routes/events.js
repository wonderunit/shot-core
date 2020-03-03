const { run, get } = require('../db')

exports.create = (req, res, next) => {
  let { projectId } = req.params
  let { insertAfter, eventType } = req.body

  projectId = parseInt(projectId)

  let prev = get('SELECT * FROM events WHERE id = ?', insertAfter)

  let rank = prev.rank + 1

  // re-rank (push all items down to make a gap for the new item)
  let rankings = [
    `UPDATE events
     SET rank = rank + 1
     WHERE rank >= ?
     AND project_id = ?`,
     rank,
     projectId
  ]

  // insert the new event
  let insertEvent = [
    `INSERT INTO events
      (project_id, rank, event_type)
    VALUES
      (?, ?, ?)`,
    [
      projectId,
      rank,
      eventType
    ]
  ]

  run(...rankings)
  let { changes, lastInsertRowId } = run(...insertEvent)

  return res.status(201).send()
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
