const { get, all, run } = require('../db')

const { friendlyDuration } = require('../helpers')

const Event = require('../decorators/event')
const Day = require('../decorators/day')
const Shot = require('../decorators/shot')
const Scene = require('../decorators/scene')

const q = arr => arr.map(() => '?').join(',')

const keyById = (prev, curr) => (prev[curr.id] = curr, prev)

function getEventsBetween ({ minRank, maxRank, projectId }) {
  return all(`
    SELECT * FROM events
    WHERE rank > ?
    AND rank <= ?
    AND events.project_id = ?
    ORDER BY rank`,
    minRank,
    maxRank,
    projectId
  )
}

exports.show = (req, res, next) => {
  let { projectId } = req.params

  let project = get('SELECT * FROM projects WHERE id = ?', projectId)

  let event = get('SELECT * FROM events WHERE id = ?', project.slater_event_id)
  let shot = get('SELECT * FROM shots WHERE id = ?', event.shot_id)
  let scene = get('SELECT * FROM scenes WHERE id = ?', shot.scene_id)
  let takes = all('SELECT * FROM takes WHERE shot_id = ?', shot.id)

  let dates = Day.decorateCollection(all(`
    SELECT id, rank, start_at FROM events
    WHERE event_type = 'day'
    AND project_id = ?
    ORDER BY rank
  `, project.id
  ), { events: [] })

  let day = get(`
    SELECT * FROM events
    WHERE rank < ?
    AND event_type = 'day'
    AND project_id = ?
    ORDER BY rank DESC
    LIMIT 1
  `, event.rank, project.id
  )

  scene = new Scene(scene)
  shot = new Shot(shot)
  day = new Day({
    // single day properties
    ...day,
    // fill in calculated properties from collection
    ...dates.find(event => event.id == day.id),
  })

  let prevEvent = get(`
    SELECT * FROM events
    WHERE rank < ?
    AND shot_id IS NOT NULL
    AND event_type = 'shot'
    AND project_id = ?
    ORDER BY rank
    LIMIT 1
  `, event.rank, project.id)
  let prevShot = prevEvent && new Shot(get('SELECT * FROM shots WHERE id = ?', prevEvent.shot_id))
  let prevScene = prevEvent && new Scene(get('SELECT * FROM scenes WHERE id = ?', prevEvent.scene_id))

  let nextEvent = get(`
    SELECT * FROM events
    WHERE rank > ?
    AND shot_id IS NOT NULL
    AND event_type = 'shot'
    AND project_id = ?
    ORDER BY rank
    LIMIT 1
  `, event.rank, project.id)
  let nextShot = nextEvent && new Shot(get('SELECT * FROM shots WHERE id = ?', nextEvent.shot_id))
  let nextScene = nextEvent && new Scene(get('SELECT * FROM scenes WHERE id = ?', nextEvent.scene_id))

  let nextDay = get(`
    SELECT * FROM events
    WHERE rank > ?
    AND event_type = 'day'
    AND project_id = ?
    `,
    event.rank, projectId
  )

  let lastEvent = get(`
    SELECT * FROM events
    WHERE project_id = ?
    ORDER BY rank DESC
    LIMIT 1
    `,
    projectId
  )

  // TODO extract, copied from schedule.js
  let events = getEventsBetween({
    minRank: event.rank,
    maxRank: nextDay ? nextDay.rank : lastEvent.rank,
    projectId
  })
  // shots by event
  let shotIds = events
    .filter(event => event.shot_id != null)
    .map(event => event.shot_id)
  let shots = all(
    `SELECT * FROM shots WHERE id IN (${q(shotIds)})`, shotIds
  )
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

  // decorate events
  events = Event.decorateCollection(events)
  shots = Shot.decorateCollection(shots)
  scenes = Scene.decorateCollection(scenes)

  // map
  let shotsById = shots.reduce(keyById, {})
  let scenesById = scenes.reduce(keyById, {})

  let takeNumber = takes.length + 1

  let aspectRatio = scene.metadata.aspectRatio

  // TODO count in SQL instead, for better performance
  let shotsComplete = getEventsBetween({ minRank: day.rank, maxRank: event.rank, projectId })
      .filter(e => e.event_type == 'shot')
      .length - 1
  let shotsRemaining = events
      .filter(e => e.event_type == 'shot')
      .length
  let shotsPercent = Math.floor(shotsRemaining / (shotsComplete + shotsRemaining) * 100)

  res.render('monitor', {
    project,
    event,
    shot,
    scene,
    day,
    
    takeNumber,

    prevShot,
    nextShot,
    prevScene,
    nextScene,

    aspectRatio,

    remaining: {
      events,
      shotsById,
      scenesById
    },

    // TODO calculate stats
    timeRemaining: -1.59e7,
    timePercent: 36,
    timeDistance: '+15m ahead of schedule',

    shotsRemaining,
    shotsComplete,
    shotsPercent,
    shotsEstRemaining: 1.5e7,

    avgTakeSetup: 123e3,
    avgTakeSetupDistance: '-23s',
    avgShotSetup: 312e7,
    avgShotSetupDistance: '-33s',
    avgTakeCount: 5,
    avgTakeCountDistance: '-2'
  })
}
