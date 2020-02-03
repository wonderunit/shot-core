exports.view = async (req, res) => {
  let { projectId, sceneId, shotId } = req.params
  let project = await get('SELECT id, name FROM projects WHERE id = ?', projectId)
  let scene = await get('SELECT id, scene_number, storyboarder_path FROM scenes WHERE id = ?', sceneId)
  let shot = await get('SELECT * FROM shots WHERE id = ?', shotId)
  shot.boards_json = JSON.parse(shot.boards_json)
  let takes = await all('SELECT * FROM takes WHERE shot_id = ?', shotId)

  let imagesPath = '/' +
    scene.storyboarder_path
      .replace(
        path.basename(scene.storyboarder_path),
        'images'
      )

  res.render('shot', { project, scene, shot, takes, imagesPath })
}
