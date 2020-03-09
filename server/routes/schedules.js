const { get, all, run } = require('../db')

const Event = require('../decorators/event')
const Day = require('../decorators/day')
const Shot = require('../decorators/shot')
const Scene = require('../decorators/scene')

const q = arr => arr.map(() => '?').join(',')

const keyById = (prev, curr) => (prev[curr.id] = curr, prev)

exports.update = (req, res) => {
  let { projectId } = req.params
  let [id, { rank }] = Object.entries(req.body)[0]

  // console.log(`update id:${id} to rank:${rank}`)

  let event = get('SELECT * FROM events WHERE id = ?', id)

  let curr_rank = event.rank
  let new_rank = rank

  run(
    `UPDATE events
     SET rank = -1
     WHERE id = ?`,
     id)

  if (new_rank > curr_rank) {
    // down
    run(`UPDATE events
          SET rank = (rank - 1)
          WHERE rank > ?
          AND rank <= ?
          AND project_id = ?`, curr_rank, new_rank, projectId)
  } else {
    // up
    run(`UPDATE events
          SET rank = (rank + 1)
          WHERE rank >= ?
          AND rank < ?
          AND project_id = ?`, new_rank, curr_rank, projectId)
  }

  run(
    `UPDATE events
     SET rank = ?
     WHERE id = ?`,
    new_rank,
    id)

  res.sendStatus(204)
}

exports.show = (req, res) => {
  let { projectId } = req.params

  let project = get(
    'SELECT id, name FROM projects WHERE id = ?',
    projectId
  )

  let days = all(
    `SELECT *
     FROM events
     WHERE project_id = ? AND event_type = 'day'
     ORDER BY rank`,
    projectId
  )

  let events = all(`
    SELECT
      events.*,
      COUNT(takes.id) as takes_count
    FROM
      events
      LEFT JOIN takes ON takes.shot_id = events.shot_id
    WHERE
      events.project_id = ?
    GROUP BY 1
    ORDER BY rank`,
    projectId
  )

  // shots by event
  let shotIds = events
    .filter(event => event.shot_id != null)
    .map(event => event.shot_id)
  let shots = all(
    `SELECT * FROM shots WHERE id IN (${q(shotIds)})`, shotIds
  )

  // scenes by shot, with shots_count (total # of shots in scene)
  let sceneIds = shots.map(shot => shot.scene_id)
  let scenes = all(`
    SELECT
      scenes.*,
      COUNT(shots.id) AS shots_count,
      SUM(shots.duration) AS shots_duration
    FROM
      scenes
      INNER JOIN shots ON shots.scene_id = scenes.id
    WHERE scenes.id IN (${q(sceneIds)})
    GROUP BY 1
    `,
    sceneIds
  )
  // total # of scenes in project
  let { project_scenes_count } = get(
    `SELECT count(id) AS project_scenes_count FROM scenes WHERE project_id = ?`,
    projectId
  )

  // decorate events
  scenes = Scene.decorateCollection(scenes)
  shots = Shot.decorateCollection(shots)
  events = Event.decorateCollection(events)
  days = Day.decorateCollection(days, { events })

  // map
  let eventsById = events.reduce(keyById, {})
  let shotsById = shots.reduce(keyById, {})
  let scenesById = scenes.reduce(keyById, {})
  let daysById = days.reduce(keyById, {})

  // schedule tree
  // [
  //   [
  //     1, // day id
  //     [
  //       [ "scene", 1 ], // type, id
  //       [ "shot", 2 ],
  //       [ "scene", 2 ],
  //       [ "shot", 3 ],
  //       [ "scene", 3 ],
  //       [ "shot", 4 ],
  //       [ "note", 12 ]
  //     ]
  //   ]
  // ]

  let sceneId
  let tree = []
  for (let day of days) {
    let children = []
    sceneId = null

    for (let id of day.event_ids) {
      let event = eventsById[id]

      if (event.shot_id == null && event.event_type == 'note') {
        sceneId = null
        children.push(['note', event.id])

      } else if (event.shot_id) {
        if (sceneId != event.scene_id) {
          sceneId = event.scene_id
          children.push(['scene', event.scene_id, { project_scenes_count }])
        }

        children.push(['shot', event.id])
      }
    }
    tree.push([day.id, children])
  }

  // for tree debugging
  // res.set('Content-Type', 'text/plain')
  // return res.send(JSON.stringify({ events }, null, 2))

  res.render('schedule', {
    project, scenesById, shotsById, eventsById, daysById, tree,
    aspectRatio: scenes[0].metadata.aspectRatio
  })
}
