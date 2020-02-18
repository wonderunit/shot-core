const addMilliseconds = require('date-fns/addMilliseconds')

const { run, get, all } = require('../db')

const { insertEventForShot } = require('../importers')

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
  for (let scene of scenes) {
    let shotsInScene = all('SELECT * FROM shots WHERE scene_id = ?', scene.id)
    // shotsInScene.forEach(deserialize)

    for (shot of shotsInScene) {
      let duration = durationOr(shot.duration, scene.defaultBoardTiming)

      startAt = addMilliseconds(startAt, duration)

      let statement = insertEventForShot({
        projectId: project.id,
        sceneId: scene.id,
        shotId: shot.id,
        rank: rank++,
        duration,
        startAt: startAt.toISOString()
      })

      let eventId = run(...statement).lastInsertRowid

      eventIds.push(eventId)
    }
  }

  // initialize slater for the schedule of the project
  // using the shot of the earliest scheduled event
  let earliest_scheduled_event_shot_id = get(
    'SELECT id, MIN(start_at) FROM events WHERE project_id = ?',
    project.id
  ).id
  run(
    `UPDATE projects
        SET slater_shot_id = ?
        WHERE id = ?`,
    earliest_scheduled_event_shot_id,
    project.id
  )
}
