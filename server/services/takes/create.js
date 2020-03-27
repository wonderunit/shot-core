const { run, get } = require('../../db')

module.exports = function create ({ projectId, sceneId, shotId, at }) {
  // determine the next take number given the shot id
  let { take_number } = get(
    `SELECT COUNT(id) + 1 as take_number FROM takes WHERE shot_id = ?`,
    shotId
  )

  return run(
    `INSERT INTO takes
    (project_id, scene_id, shot_id,
      take_number,
      ready_at,
      downloaded)
    VALUES
    (?, ?, ?,
      ?,
      ?,
      0
    )`,
    projectId, sceneId, shotId,
    take_number,
    at
  ).lastInsertRowid
}
