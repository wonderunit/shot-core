const startOfDay = require('date-fns/startOfDay')

const { get, all } = require('../db')

const q = arr => arr.map(() => '?').join(',')

const keyById = (prev, curr) => (prev[curr.id] = curr, prev)

exports.show = (req, res) => {
  let { projectId } = req.params

  let project = get(
    'SELECT * FROM projects WHERE id = ?',
    projectId
  )

  let events = all(
    `SELECT *, date(start_at, 'localtime') AS day
     FROM events
     WHERE project_id = ?
     ORDER BY day, rank`,
    projectId
  )

  // shots by event
  let shotIds = events.map(event => event.shot_id)
  let shots = all(
    `SELECT * FROM shots WHERE id IN (${q(shotIds)})`, shotIds
  )

  // scenes by shot
  let sceneIds = shots.map(shot => shot.scene_id)
  let scenes = all(
    `SELECT * FROM scenes WHERE id IN (${q(sceneIds)})`, sceneIds
  )

  // deserialize
  events.forEach(event => (event.start_at = new Date(event.start_at)))

  // map
  let shotsById = shots.reduce(keyById, {})
  let scenesById = scenes.reduce(keyById, {})

  let eventsByDay = events.reduce((acc, event) => {
    let day = startOfDay(event.start_at)
    acc[day] = acc[day] || []
    acc[day].push(event)
    return acc
  }, {})

  res.render('schedule', { project, eventsByDay, shotsById, scenesById })
}
