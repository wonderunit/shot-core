const { get, all } = require('../db')

const Scene = require('../decorators/scene')
const Shot = require('../decorators/shot')
const Take = require('../decorators/take')

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
    `SELECT *
     FROM shots
     WHERE scene_id = ?
     AND project_id = ?`,
    sceneId, projectId
  )

  let { project_scenes_count } = get(
    `SELECT COUNT(id) as project_scenes_count
     FROM scenes
     WHERE project_id = ?`,
    projectId
  )

  let bestTakesByShotId = {}
  for (let shot of shots) {
    // best or most recent take
    // TODO optimize queries
    let mostRecent = get(
      `SELECT *
       FROM takes
       WHERE shot_id = ?
       AND project_id = ?
       ORDER BY datetime(cut_at)
       LIMIT 1`,
       shot.id,
       projectId
    )
    let highestRated = get(
      `SELECT *
       FROM takes
       WHERE rating IS NOT NULL
       AND shot_id = ?
       AND project_id = ?
       ORDER BY rating
       LIMIT 1`,
       shot.id,
       projectId
    )
    let take = highestRated || mostRecent || null
    // TODO optimize this
    bestTakesByShotId[shot.id] = take
      ?
        take.downloaded
          ? {
              downloaded: take.downloaded,
              src: new Take(take).filenameForThumbnail({
                ...{ scene_number } = scenesById[take.scene_id],
                ...{ shot_number, impromptu } = shot
              })
            }
          : {
              downloaded: take.downloaded,
              src: null
            }
      : null  }

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

  res.render('scene', {
    project,
    scene: new Scene(scene),
    shots: Shot.decorateCollection(shots),

    project_scenes_count,
    takesCountByShotId,
    bestTakesByShotId
  })
}
