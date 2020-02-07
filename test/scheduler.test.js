/*

TO TEST:
rm test.sqlite3; sqlite3 test.sqlite3 < db/schema.sql
node test/importers.test.js
node test/scheduler.test.js

OPTIONALLY:
cp test.sqlite3 dev.sqlite3

*/

const fs = require('fs')
const sqlite3 = require('sqlite3').verbose()
const addMilliseconds = require('date-fns/addMilliseconds')

const { promisified } = require('../lib/promisify-sqlite3')
const { insertSchedule, insertEventForShot } = require('../server/importers')

const db = new sqlite3.Database('./test.sqlite3')
const { run, get, all } = promisified(db)

;(async () => {
  try {

    // function deserialize (shot) {
    //   shot.boards_json = JSON.parse(shot.boards_json)
    // }

    // from importers.js
    function durationOr(value, defaultValue) {
      return value == null ? defaultValue : value
    }

    // schedule
    let projects = await all('SELECT * FROM projects')

    for (let project of projects) {
      console.log('scheduling', project.name)

      let scenes = await all('SELECT * from scenes where project_id = ?', project.id)

      let startAt = new Date()
      let scheduleId = (await run(...insertSchedule({
        projectId: project.id,
        startAt: startAt.toISOString()
      }))).lastID

      let eventIds = []
      let rank = 0
      for (let scene of scenes) {
        let shotsInScene = await all('SELECT * FROM shots WHERE scene_id = ?', scene.id)
        // shotsInScene.forEach(deserialize)

        for (shot of shotsInScene) {
          let duration = durationOr(shot.duration, scene.defaultBoardTiming)

          startAt = addMilliseconds(startAt, duration)

          let statement = insertEventForShot({
            projectId: project.id,
            sceneId: scene.id,
            scheduleId,
            shotId: shot.id,
            rank: rank++,
            duration,
            startAt: startAt.toISOString()
          })

          let eventId = (await run(...statement)).lastID

          eventIds.push(eventId)
        }
      }

      // initialize slater for the schedule of the project
      // using the shot of the earliest scheduled event
      let earliest_scheduled_event_shot_id = (await get(
        'SELECT id, MIN(start_at) FROM events WHERE project_id = ?',
        project.id
      )).id
      await run(
        `UPDATE projects
         SET slater_shot_id = ?
         WHERE id = ?`,
         earliest_scheduled_event_shot_id,
         project.id
      )
    }

    console.log('done.')
  } catch (err) {
    console.error(err)
  }
})()
