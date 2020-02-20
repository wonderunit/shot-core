const path = require('path')
const startOfDay = require('date-fns/startOfDay')
const { format } = require('date-fns-tz')
const isEqual = require('date-fns/isEqual')

const { get, all } = require('../db')

const { imagesPath } = require('../helpers')

const q = arr => arr.map(() => '?').join(',')

const keyById = (prev, curr) => (prev[curr.id] = curr, prev)

const dedupe = eq => (acc, curr) => {
  if (!acc.find(prev => eq(prev, curr))) {
    acc.push(curr)
  }
  return acc
}

const { entries } = Object

exports.show = (req, res) => {
  let { projectId } = req.params

  let project = get(
    'SELECT id, name FROM projects WHERE id = ?',
    projectId
  )

  let events = all(
    `SELECT *, date(start_at, 'localtime') AS day
     FROM events
     WHERE project_id = ?
     ORDER BY day, rank`,
    projectId
  )

  // shots by event
  let shotIds = events.map(event => event.shot_id)
  let shots = all(
    `SELECT * FROM shots WHERE id IN (${q(shotIds)})`, shotIds
  )

  // scenes by shot
  let sceneIds = shots.map(shot => shot.scene_id)
  let scenes = all(
    `SELECT * FROM scenes WHERE id IN (${q(sceneIds)})`, sceneIds
  )

  // deserialize
  events.forEach(event => (event.start_at = new Date(event.start_at)))
  events.forEach(event => {
    let scene = scenes.find(scene => scene.id == event.scene_id)
    let shot = shots.find(shot => shot.id == event.shot_id)
    let boards = JSON.parse(shot.boards_json)
    let board = boards.find(board => board.dialogue != null) || boards[0]
    event.thumbnail = `${imagesPath(scene)}/board-${board.number}-${board.uid}-thumbnail.png`
  })

  // map
  let eventsById = events.reduce(keyById, {})
  let shotsById = shots.reduce(keyById, {})
  let scenesById = scenes.reduce(keyById, {})

  // list days
  let startAts = events
    .map(event => event.start_at)
    .map(startOfDay)
    .reduce(dedupe(isEqual), [])

  // infer day data
  let days = startAts.map(
    (start_at, n) => {
      let dayEvents = events.filter(event => isEqual(startOfDay(event.start_at), start_at))

      return {
        id: start_at.toISOString(),
        start_at: dayEvents[0].start_at,
        day_number: n + 1,
        days_total: startAts.length,
        event_ids: dayEvents.map(event => event.id),
        shot_count: dayEvents.map(event => event.shot_id != null).length,
        text: format(start_at, 'EEEE, dd MMM yyyy'),
        lunch: '12am'
      }
    }
  )

  let daysById = days.reduce(keyById, {})

  // schedule tree
  // [
  //   [
  //     1, // day id
  //     [
  //      [
  //       // new scene
  //       'scene',
  //        2, // scene id
  //        [
  //          3 // shot event id
  //        ]
  //      ],
  //      [
  //       // note event
  //       'event',
  //       4 // event id
  //      ]
  //     ]
  //   ]
  // ]

  let scene
  let tree = []
  for (let [id, day] of entries(daysById)) {
    let children = []

    for (let id of day.event_ids) {
      let event = eventsById[id]

      if (event.shot_id == null) {
        children.push('event', id)
      } else if (event.shot_id) {
        if (scene && scene[1] != event.scene_id) {
          children.push(scene)
          scene = null
        }

        if (scene) {
          scene[2].push(event.id)
        } else {
          scene = ['scene', event.scene_id, [event.id]]
        }
      }
    }

    tree.push([id, children])
  }

  // for tree debugging
  // res.set('Content-Type', 'text/plain')
  // res.send(JSON.stringify(tree, null, 2))

  res.render('schedule', { project, scenesById, shotsById, eventsById, daysById, tree })
}
