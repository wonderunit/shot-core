const { get, all } = require('../db')

const q = arr => arr.map(() => '?').join(',')

const mapped = (prev, curr) => {
  prev[curr.id] = curr
  return prev
}

exports.show = async (req, res) => {
  let { projectId, startDate } = req.params

  let schedule = await get(`SELECT * FROM schedules WHERE project_id = ? AND date(start_at, 'localtime') = ?`, projectId, startDate)

  let project = await get('SELECT * FROM projects WHERE id = ?', schedule.project_id)

  let events = await all(`SELECT * FROM events WHERE schedule_id = ? ORDER BY rank`, schedule.id)

  // shots by event
  let shotIds = events.map(event => event.shot_id)
  let shots = await all(`SELECT * FROM shots WHERE id IN (${q(shotIds)})`, shotIds)

  // scenes by shot
  let sceneIds = shots.map(shot => shot.scene_id)
  let scenes = await all(`SELECT * FROM scenes WHERE id IN (${q(sceneIds)})`, sceneIds)

  // deserialize
  schedule.start_at = new Date(schedule.start_at)
  events.forEach(event => (event.start_at = new Date(event.start_at)))

  // map
  let shotsById = shots.reduce(mapped, {})
  let scenesById = scenes.reduce(mapped, {})

  res.render('schedule', { schedule, project, events, shotsById, scenesById })
}
