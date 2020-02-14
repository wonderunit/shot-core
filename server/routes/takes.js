const { run, get } = require('../db')

exports.create = (req, res) => {
  let { projectId, sceneId, shotId } = req.params
  let { at } = req.body

  // determine the next take number given the shot id
  let { take_number } = get(
    `SELECT COUNT(id) + 1 as take_number FROM takes WHERE shot_id = ?`,
    shotId
  )

  let id = run(
    `INSERT INTO takes
    (project_id, scene_id, shot_id,
      take_number,
      ready_at)
    VALUES
    (?, ?, ?,
      ?,
      ?
    )`,
    projectId, sceneId, shotId,
    take_number,
    at
  ).lastInsertRowid

  res.status(201).send({ id })
}

exports.action = (req, res) => {
  let { takeId } = req.params
  let { at } = req.body

  run(
    `UPDATE takes
     SET action_at = ?
     WHERE id = ?`,
     at,
     takeId
  )

  res.sendStatus(200)
}

exports.cut = (req, res) => {
  let { takeId } = req.params
  let { at } = req.body

  run(
    `UPDATE takes
     SET cut_at = ?
     WHERE id = ?`,
    at,
    takeId
  )

  res.sendStatus(200)
}

exports.show = (req, res) => {
  let { projectId, sceneId, shotId, takeId } = req.params

  let project = get(`SELECT id, name FROM projects where id = ?`, projectId)
  let scene = get(`SELECT id, scene_number FROM scenes where id = ?`, sceneId)
  let shot = get(`SELECT id, shot_number FROM shots where id = ?`, shotId)

  let take = get(`SELECT * FROM takes WHERE id = ?`, takeId)

  take.ready_at = new Date(take.ready_at)
  take.action_at = new Date(take.action_at)
  take.cut_at = new Date(take.cut_at)

  res.render('take', { project, scene, shot, take })
}
