const { get, all, run } = require('../db')

const Shot = require('../decorators/shot')
const Scene = require('../decorators/scene')

exports.show = (req, res, next) => {
  let { projectId } = req.params

  let project = get('SELECT * FROM projects WHERE id = ?', projectId)

  let event = get('SELECT * FROM events WHERE id = ?', project.slater_event_id)
  let shot = get('SELECT * FROM shots WHERE id = ?', event.shot_id)
  let scene = get('SELECT * FROM scenes WHERE id = ?', shot.scene_id)
  let takes = all('SELECT * FROM takes WHERE shot_id = ?', shot.id)

  scene = new Scene(scene)
  shot = new Shot(shot)

  // TODO
  let prevShot = shot
  let prevScene = scene
  let nextShot = shot
  let nextScene = scene

  let takeNumber = takes.length + 1

  let aspectRatio = scene.metadata.aspectRatio

  res.render('monitor', {
    project,
    event,
    shot,
    scene,
    
    takeNumber,
    prevShot,
    nextShot,
    prevScene,
    nextScene,

    aspectRatio })
}
