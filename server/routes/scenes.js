const { get, all } = require('../db')

const Scene = require('../decorators/scene')
const Shot = require('../decorators/shot')

exports.index = (req, res) => {
  let { projectId } = req.params

  let project = get('SELECT * FROM projects WHERE id = ?', projectId)

  let scenes = all(`
    SELECT
      scenes.*,
      COUNT(shots.id) AS shots_count,
      SUM(shots.duration) AS shots_duration,
      COUNT(takes.id) AS takes_count
    FROM
      scenes
      LEFT OUTER JOIN shots ON scenes.id = shots.scene_id
      LEFT OUTER JOIN takes ON scenes.id = takes.scene_id
    WHERE
      scenes.project_id = ?
    GROUP BY 1
    `,
    projectId
  )

  let shots = all('SELECT * FROM shots WHERE project_id = ?', projectId)

  res.render('scenes', {
    project,
    scenes: Scene.decorateCollection(scenes),
    shots: Shot.decorateCollection(shots)
  })
}
