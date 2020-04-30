const { run, get } = require('../db')

module.exports = function createEvent ({
    projectId,
    insertAfter,
    eventType,
    description
}) {
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
      (project_id, rank, event_type, description)
    VALUES
      (?, ?, ?, ?)`,
    [
      projectId,
      rank,
      eventType,
      description
    ]
  ]

  run(...rankings)

  let { changes, lastInsertRowid } = run(...insertEvent)

  return lastInsertRowid
}
