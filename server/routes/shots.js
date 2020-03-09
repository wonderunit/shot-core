const path = require('path')

const { run, get, all } = require('../db')

const Scene = require('../decorators/scene')
const Shot = require('../decorators/shot')

exports.show = (req, res) => {
  let { projectId, sceneId, shotId } = req.params
  let project = get('SELECT id, name FROM projects WHERE id = ?', projectId)
  let scene = get('SELECT id, scene_number, storyboarder_path, metadata_json FROM scenes WHERE id = ?', sceneId)
  let shot = get('SELECT * FROM shots WHERE id = ?', shotId)
  let takes = all('SELECT * FROM takes WHERE shot_id = ?', shotId)

  scene = new Scene(scene)
  shot = new Shot(shot)

  res.render('shot', { project, scene, shot, takes })
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
