const addMilliseconds = require('date-fns/addMilliseconds')

const { run, get, all } = require('../db')

// from importers.js
function durationOr (value, defaultValue) {
  return value == null ? defaultValue : value
}

// function deserialize (shot) {
//   shot.boards_json = JSON.parse(shot.boards_json)
// }

module.exports = function ({ projectId }) {
  let project = get('SELECT * FROM projects WHERE id = ?', projectId)

  let startAt = new Date()

  let scenes = all('SELECT * from scenes WHERE project_id = ?', project.id)

  let eventIds = []
  let rank = 0

  // add an `event` for the first day
  run(
    `INSERT INTO events
      (project_id, rank, start_at, event_type)
    VALUES
      (?, ?, ?, ?)`,
    [
      project.id,
      rank++,
      startAt.toISOString(),
      'day'
    ]
  )

  for (let scene of scenes) {
    let shotsInScene = all('SELECT * FROM shots WHERE scene_id = ?', scene.id)
    // shotsInScene.forEach(deserialize)

    for (shot of shotsInScene) {
      let duration = durationOr(shot.duration, scene.defaultBoardTiming)

      // startAt = addMilliseconds(startAt, duration)

      let eventId = run(
        `INSERT INTO events
          (project_id, scene_id, shot_id, rank, duration, event_type)
        VALUES
          (?, ?, ?, ?, ?, ?)`,
        [
          project.id,
          scene.id,
          shot.id,
          rank++,
          duration,
          'shot'
        ]
      ).lastInsertRowid

      eventIds.push(eventId)
    }
  }

  // initialize slater for the schedule of the project
  let earliest_scheduled_shot_event_id = get(
    `SELECT id, shot_id, MIN(rank) FROM events
     WHERE shot_id IS NOT NULL
     AND event_type = 'shot'
     AND project_id = ?`,
    project.id
  ).id
  run(
    `UPDATE projects
        SET slater_event_id = ?
        WHERE id = ?`,
    earliest_scheduled_shot_event_id,
    project.id
  )
}
