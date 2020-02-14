const path = require('path')

const { get, all } = require('../db')

exports.show = (req, res) => {
  let { projectId, sceneId, shotId } = req.params
  let project = get('SELECT id, name FROM projects WHERE id = ?', projectId)
  let scene = get('SELECT id, scene_number, storyboarder_path FROM scenes WHERE id = ?', sceneId)
  let shot = get('SELECT * FROM shots WHERE id = ?', shotId)
  shot.boards_json = JSON.parse(shot.boards_json)
  let takes = all('SELECT * FROM takes WHERE shot_id = ?', shotId)

  let imagesPath = '/uploads/' +
    scene.storyboarder_path
      .replace(
        path.basename(scene.storyboarder_path),
        'images'
      )

  res.render('shot', { project, scene, shot, takes, imagesPath })
}
