
const { run, get, all } = require('../db')

const Scene = require('../decorators/scene')
const Shot = require('../decorators/shot')
const Take = require('../decorators/take')
const Day = require('../decorators/day')

const differenceInMilliseconds = require('date-fns/differenceInMilliseconds')
const { humanizeAspectRatio } = require('../helpers')

const keyById = (prev, curr) => (prev[curr.id] = curr, prev)

// FIXME slow
exports.index = (req, res) => {
  let { projectId } = req.params

  let project = get('SELECT id, name FROM projects WHERE id = ?', projectId)
  let shots = all('SELECT * FROM shots WHERE project_id = ?', projectId)

  let scenes = all(`SELECT * FROM scenes WHERE project_id = ?`, projectId)
  scenes = Scene.decorateCollection(scenes)
  let scenesById = scenes.reduce(keyById, {})

 let bestTakesByShotId = {}
  for (let shot of shots) {
    // best or most recent take
    // TODO optimize queries
    let mostRecent = get(
      `SELECT *
       FROM takes
       WHERE shot_id = ?
       AND project_id = ?
       ORDER BY datetime(cut_at)
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
    // TODO optimize this
    bestTakesByShotId[shot.id] = take
      ? new Take(take).filenameForThumbnail({
        ...{ scene_number } = scenesById[take.scene_id],
        ...{ shot_number, impromptu } = shot
      })
      : null
  }

  let takesCountByShotId = {}
  for (let shot of shots) {
    let { takes_count } = get(
      `SELECT COUNT(id) as takes_count
       FROM takes
       WHERE shot_id = ?
       AND project_id = ?`,
      shot.id, projectId
    )
    takesCountByShotId[shot.id] = takes_count
  }

  res.render('shots', {
    project,
    shots: Shot.decorateCollection(shots),

    scenesById,
    bestTakesByShotId,
    takesCountByShotId
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
    humanizeAspectRatio
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
