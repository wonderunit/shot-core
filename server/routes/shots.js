const num2fraction = require('num2fraction')

const { run, get, all } = require('../db')

const Scene = require('../decorators/scene')
const Shot = require('../decorators/shot')
const Take = require('../decorators/take')

const differenceInMilliseconds = require('date-fns/differenceInMilliseconds')

exports.index = (req, res) => {
  let { projectId } = req.params

  let project = get('SELECT id, name FROM projects WHERE id = ?', projectId)
  let shots = all('SELECT * FROM shots WHERE project_id = ?', projectId)

  res.render('shots', {
    project,
    shots: Shot.decorateCollection(shots)
  })
}

exports.show = (req, res) => {
  let { projectId, sceneId, shotId } = req.params
  let project = get('SELECT id, name FROM projects WHERE id = ?', projectId)
  let scene = get('SELECT * FROM scenes WHERE id = ?', sceneId)
  let shot = get('SELECT * FROM shots WHERE id = ?', shotId)
  let takes = all('SELECT * FROM takes WHERE shot_id = ?', shotId)

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

  // best or most recent take
  // TODO optimize queries
  let mostRecent = get(
    `SELECT *
      FROM takes
      WHERE shot_id = ?
      AND project_id = ?
      ORDER BY datetime(cut_at) DESC
      LIMIT 1`,
      shot.id,
      projectId
  )
  let highestRated = get(
    `SELECT *
      FROM takes
      WHERE rating IS NOT NULL
      AND shot_id = ?
      AND project_id = ?
      ORDER BY rating
      LIMIT 1`,
      shot.id,
      projectId
  )
  let take = highestRated || mostRecent || null

  // each day, with calculated day number
  let days = all(
    `SELECT
       id, start_at,
      ROW_NUMBER() OVER(ORDER BY date(start_at)) AS day_number
     FROM events
     WHERE event_type = 'day'
     AND project_id = ?
     ORDER BY date(start_at)`,
    projectId
  )

  const humanizedAspectRatio = aspectRatio => {
    let f = num2fraction(aspectRatio)
    return f.match(/\/100$/)
      // e.g.: 2.39:1
      ? `${f.match(/(\d+)/)[1] / 100}:1`
      // e.g.: 16:9
      : f.replace('/', ':')
  }

  res.render('shot', {
    project,
    scene: new Scene(scene),
    shot: new Shot(shot),
    take: take ? new Take(take) : null,
    takes: Take.decorateCollection(takes),

    project_scenes_count,
    scene_shots_count,
    days,

    differenceInMilliseconds,
    humanizedAspectRatio
  })
}

exports.update = (req, res) => {
  let { shotId } = req.params

  if (req.body.hasOwnProperty('fStop')) {
    let { fStop } = req.body
    if (fStop == '') fStop = null
    run(
      `UPDATE shots
      SET fStop = :fStop
      WHERE id = :shotId`,
      { fStop, shotId }
    )
    return res.sendStatus(204)
  }

  if (req.body.hasOwnProperty('shotType')) {
    let { shotType } = req.body
    if (shotType == '') shotType = null
    run(
      `UPDATE shots
      SET shotType = :shotType
      WHERE id = :shotId`,
      { shotType, shotId }
    )
    return res.sendStatus(204)
  }

  return res.sendStatus(422)
}
