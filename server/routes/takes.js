const { get } = require('../db')

exports.show = async (req, res) => {
  let { projectId, sceneId, shotId, takeId } = req.params

  let project = await get(`SELECT id, name FROM projects where id = ?`, projectId)
  let scene = await get(`SELECT id, scene_number FROM scenes where id = ?`, sceneId)
  let shot = await get(`SELECT id, shot_number FROM shots where id = ?`, shotId)

  let take = await get(`SELECT * FROM takes WHERE id = ?`, takeId)

  take.ready_at = new Date(take.ready_at)
  take.action_at = new Date(take.action_at)
  take.cut_at = new Date(take.cut_at)

  res.render('take', { project, scene, shot, take })
}
