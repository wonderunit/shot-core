const path = require('path')

const { run, get, all } = require('../db')

const { imagesPath } = require('../helpers')

exports.show = (req, res) => {
  let { projectId, sceneId, shotId } = req.params
  let project = get('SELECT id, name FROM projects WHERE id = ?', projectId)
  let scene = get('SELECT id, scene_number, storyboarder_path FROM scenes WHERE id = ?', sceneId)
  let shot = get('SELECT * FROM shots WHERE id = ?', shotId)
  shot.boards_json = JSON.parse(shot.boards_json)
  let takes = all('SELECT * FROM takes WHERE shot_id = ?', shotId)

  res.render('shot', { project, scene, shot, takes, imagesPath: imagesPath(scene) })
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

  return res.sendStatus(422)
}
