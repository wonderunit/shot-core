const { get, all } = require('../db')

const Scene = require('../decorators/scene')
const Shot = require('../decorators/shot')
const Take = require('../decorators/take')

const keyBy = id => (prev, curr) => (prev[curr[id]] = curr, prev)

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

  let shots = all(
    `SELECT * FROM shots
    WHERE project_id = ?
    ORDER BY impromptu ASC, shot_number
  `, project.id)

  res.render('scenes', {
    project,
    scenes: Scene.decorateCollection(scenes),
    shots: Shot.decorateCollection(shots)
  })
}

exports.show = (req, res) => {
  let { projectId, sceneId } = req.params

  let project = get(
    `SELECT *
     FROM projects
     WHERE id = ?`,
    projectId
  )

  let scene = get(
    `SELECT *
     FROM scenes
     WHERE id = ?
     AND project_id = ?`,
    sceneId, projectId
  )

  let shots = all(
    `SELECT * FROM shots
    WHERE project_id = ?
    AND scene_id = ?
    ORDER BY impromptu ASC, shot_number
  `, project.id, scene.id)

  let { project_scenes_count } = get(
    `SELECT COUNT(id) as project_scenes_count
     FROM scenes
     WHERE project_id = ?`,
    projectId
  )

  let bestTakesByShotId = all(
    `
    SELECT
      best_take.id,
      best_take.downloaded,
      best_take.rating,
      best_take.cut_at,
      best_take.metadata_json,
      best_take.take_number,

      shots.id as 'shot_id',
      shots.shot_number as 'shot_number',
      shots.impromptu as 'impromptu',

      scenes.scene_number as 'scene_number'
    FROM
      shots
      JOIN scenes ON scenes.id = shots.scene_id

      -- find the best take
      -- e.g.: the single highest rated, most-recent take
      JOIN takes as best_take ON (best_take.id = (
        SELECT
          id
        FROM
          takes
        WHERE
          shot_id = shots.id
        ORDER BY
          rating DESC,
          datetime(cut_at) DESC
        LIMIT 1
      ))
    AND
      shots.scene_id = ?
    ORDER BY
      impromptu ASC,
      shot_number
    `,
    scene.id
  )
  .map(best => {
    let take = new Take(best)
    return {
      ...take,
      src: {
        thumbnail: take.filenameForThumbnail({
          ...{ scene_number } = best,
          ...{ shot_number, impromptu } = best
        }),
        stream: take.filenameForStream({
          ...{ scene_number } = best,
          ...{ shot_number, impromptu } = best
        })
      }
    }
  })
  .reduce(keyBy('shot_id'), {})


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

  let previewTakes = []
  for (let shot of shots) {
    let take = bestTakesByShotId[shot.id]
    if (take && take.downloaded) {
      previewTakes.push(take)
    }
  }

  res.render('scene', {
    project,
    scene: new Scene(scene),
    shots: Shot.decorateCollection(shots),

    project_scenes_count,
    takesCountByShotId,
    bestTakesByShotId,

    previewTakes
  })
}
