const { run, get, all } = require('../db')

const format = require('date-fns/format')
const startOfDay = require('date-fns/startOfDay')

const create = require('../services/takes/create')
const action = require('../services/takes/action')
const cut = require('../services/takes/cut')
const updateFilepath = require('../services/takes/update-filepath')

const Scene = require('../decorators/scene')
const Shot = require('../decorators/shot')
const Take = require('../decorators/take')
const Day = require('../decorators/day')

const { humanizeAspectRatio } = require('../helpers')

const humanizeVideoResolution = (width, height) => {
  if (width === 3840 && height === 2160) {
    return '4K'
  } else {
    return `${width}x${height}`
  }
}

const q = arr => arr.map(() => '?').join(',')

exports.create = async (req, res) => {
  let { projectId, sceneId, shotId } = req.params
  let { at } = req.body

  let bus = req.app.get('bus')
  let zcam = req.app.get('zcam')

  try {
    bus.emit('camera-listener/disable')
    await zcam.get('/ctrl/rec?action=start')
    let takeId = create({ projectId, sceneId, shotId, at })
    bus.emit('takes/create', { id: takeId })

    res.status(201).send({ id: takeId })
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
}

exports.action = async (req, res) => {
  let { takeId } = req.params
  let { at } = req.body

  action({ takeId, at })
  req.app.get('bus').emit('takes/action')

  res.sendStatus(200)
}

exports.cut = async (req, res) => {
  let { takeId } = req.params
  let { at } = req.body

  let zcam = req.app.get('zcam')

  try {
    await zcam.get('/ctrl/rec?action=stop')
    cut({ takeId, at })

    let filepath = (await zcam.get('/ctrl/get?k=last_file_name')).data.value
    updateFilepath({ takeId, filepath })

    req.app.get('bus').emit('takes/cut')
    req.app.get('bus').emit('camera-listener/enable')

    res.sendStatus(200)
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
}

exports.update = async (req, res) => {
  let { takeId } = req.params

  if (req.body.hasOwnProperty('rating')) {
    let { rating } = req.body

    run(
      `UPDATE takes
      SET rating = ?
      WHERE id = ?`,
      rating,
      takeId
    )
  }
  res.sendStatus(204)
}

exports.show = (req, res) => {
  let { projectId, sceneId, shotId, takeId } = req.params

  let project = get(`SELECT id, name FROM projects where id = ?`, projectId)

  let scene = get(`SELECT * FROM scenes where id = ?`, sceneId)
  let shot = get(`SELECT * FROM shots where id = ?`, shotId)

  let take = get(`SELECT * FROM takes WHERE id = ?`, takeId)

  // TODO
  take.ready_at = new Date(take.ready_at)
  take.action_at = new Date(take.action_at)
  take.cut_at = new Date(take.cut_at)

  let { project_scenes_count } = get(
    `SELECT COUNT(id) as project_scenes_count
     FROM scenes
     WHERE project_id = ?`,
    projectId
  )

  let { scene_shots_count } = get(
    `SELECT COUNT(id) as scene_shots_count
     FROM shots
     WHERE scene_id = ?
     AND project_id = ?`,
    sceneId,
    projectId
  )

  let { shot_takes_count } = get(
    `SELECT COUNT(id) AS shot_takes_count
     FROM takes
     WHERE scene_id = ?
     AND project_id = ?`,
    sceneId,
    projectId
  )

  // what day?
  let events = all(
    `SELECT *
     FROM events
     WHERE project_id = ?`, projectId)
  let days = all(
    `SELECT *
     FROM events
     WHERE project_id = ? AND event_type = 'day'
     ORDER BY rank`,
    projectId
  )
  days = Day.decorateCollection(days, { events })
  let day = days.find(day =>
    format(new Date(day.start_at), 'yyyy-MM-dd') === 
    format(new Date(take.action_at), 'yyyy-MM-dd')
  )

  res.render('take', {
    project,
    scene: new Scene(scene),
    shot: new Shot(shot),
    take: new Take(take),

    day_number: day ? day.day_number : null,

    project_scenes_count,
    scene_shots_count,
    shot_takes_count,

    humanizeAspectRatio,
    humanizeVideoResolution
  })
}

exports.index = (req, res) => {
  let { projectId } = req.params

  let project = get(`SELECT * FROM projects WHERE id = ?`, projectId)

  let takes = all(`SELECT * FROM takes WHERE project_id = ?`, project.id)

  let shotIds = takes.map(shot => shot.shot_id)
  let shots = all(
    `SELECT id, shot_number, impromptu FROM shots WHERE id IN (${q(shotIds)})`, shotIds
  )

  let sceneIds = takes.map(scene => scene.scene_id)
  let scenes = all(
    `SELECT id, scene_number, metadata_json FROM scenes WHERE id IN (${q(sceneIds)})`, sceneIds
  )

  res.render('takes', {
    project,
    takes: Take.decorateCollection(takes),
    shots: Shot.decorateCollection(shots),
    scenes: Scene.decorateCollection(scenes)
  })
}
