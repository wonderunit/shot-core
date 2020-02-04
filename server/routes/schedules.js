const { get, all } = require('../db')

const q = arr => arr.map(() => '?').join(',')

const keyById = (prev, curr) => (prev[curr.id] = curr, prev)

exports.show = async (req, res) => {
  let { projectId, startDate } = req.params

  let schedule = await get(
    `SELECT *
     FROM schedules
     WHERE project_id = ? AND date(start_at, 'localtime') = ?`, projectId, startDate
  )

  let project = await get(
    'SELECT * FROM projects WHERE id = ?',
    schedule.project_id
  )

  let events = await all(
    `SELECT * FROM events WHERE schedule_id = ? ORDER BY rank`,
    schedule.id
  )

  // shots by event
  let shotIds = events.map(event => event.shot_id)
  let shots = await all(
    `SELECT * FROM shots WHERE id IN (${q(shotIds)})`, shotIds
  )

  // scenes by shot
  let sceneIds = shots.map(shot => shot.scene_id)
  let scenes = await all(
    `SELECT * FROM scenes WHERE id IN (${q(sceneIds)})`, sceneIds
  )

  // takes by shot
  let takes = await all(
    `SELECT * FROM takes WHERE shot_id IN (${q(shotIds)})`, shotIds
  )

  // deserialize
  schedule.start_at = new Date(schedule.start_at)
  events.forEach(event => (event.start_at = new Date(event.start_at)))

  // map
  let shotsById = shots.reduce(keyById, {})
  let scenesById = scenes.reduce(keyById, {})
  let takesByShotById = takes.reduce((prev, curr) => {
    prev[curr.shot_id] = prev[curr.shot_id] || {}
    prev[curr.shot_id][curr.id] = curr
    return prev
  }, {})

  res.render('schedule', { schedule, project, events, shotsById, scenesById, takesByShotById })
}
