const { run, get, all } = require('../db')
const slaterCanvas = require('../slater-canvas')

const Scene = require('../decorators/scene')
const Shot = require('../decorators/shot')

const createEvent = require('../services/create-event')

const takeState = take => {
  if (take == null) return 'init'

  if (take.cut_at) {
    return 'done'
  } else if (take.action_at) {
    return 'active'
  } else if (take.ready_at) {
    return 'ready'
  }
}

const buttonState = status => {
  return {
    'init': 'ready',
    'ready': 'action',
    'active': 'cut',
    'done': 'ready'
  }[status]
}

const display = take => {
  let status = takeState(take)
  let button = buttonState(status)
  return {
    take,
    number: take
      ? status == 'done'
        ? take.take_number + 1
        : take.take_number
      : 1,
    label: status == 'init'
      ? 'new'
      : status == 'done'
        ? 'new'
        : status,
    button,
    status
  }
}

exports.update = (req, res) => {
  let { projectId } = req.params
  let { transition } = req.body

  let { slater_event_id } = get(
    `SELECT slater_event_id FROM projects WHERE id = ?`,
    projectId)

  let events = all(`
  SELECT
    id, rank
  FROM
    events
  WHERE project_id = ?
  AND shot_id IS NOT NULL
  AND event_type = 'shot'
  ORDER BY rank
  `, projectId)

  let curr = events.find(e => e.id == slater_event_id)

  let next = events.find(e => e.rank > curr.rank ) || events[events.length - 1]
  let prev = [...events].reverse().find(e => e.rank < curr.rank ) || events[0]

  switch (transition) {
    case 'next':
      run(
        `UPDATE projects SET slater_event_id = ? WHERE id = ?`,
        next.id, projectId)
      req.app.get('bus').emit('slater/updated')
      return res.status(200).send({ id: next.id })
    case 'previous':
      run(
        `UPDATE projects SET slater_event_id = ? WHERE id = ?`,
        prev.id, projectId)
      req.app.get('bus').emit('slater/updated')
      return res.status(200).send({ id: prev.id })
    default:
      return res.status(422).send()
  }
}

exports.show = (req, res) => {
  let { projectId } = req.params

  let project = get('SELECT * FROM projects WHERE id = ?', projectId)

  let slater
  if (project.slater_event_id) {
    let event = get('SELECT * FROM events WHERE id = ?', project.slater_event_id)
    let shot = get('SELECT * FROM shots WHERE id = ?', event.shot_id)
    let scene = get('SELECT * FROM scenes WHERE id = ?', shot.scene_id)
    let takes = all('SELECT * FROM takes WHERE shot_id = ?', shot.id)

    // for this shot, find the take with highest take number
    let take = get(
      `
      SELECT * FROM takes
      WHERE shot_id = ?
      ORDER BY take_number DESC
      LIMIT 1
      `,
      shot.id
    )

    // most recently cut take, used for rating
    let prev = get(
      `
      SELECT * FROM takes
      WHERE project_id = ?
      AND cut_at IS NOT NULL
      ORDER BY take_number DESC
      LIMIT 1
      `,
      project.id
    )

    scene = new Scene(scene)
    shot = new Shot(shot)

    slater = {
      scene,
      shot,
      takes,

      ...display(take),

      prev
    }
  }

  res.format({
    html: () => res.render('slater', { project, ...slater }),
    json: () => res.send({ project, ...slater })
  })
}

exports.png = (req, res) => {
  res.setHeader('Content-Type', 'image/png')
  slaterCanvas.draw().createPNGStream().pipe(res)
}

// create a new impromptu shot
exports.impromptu = (req, res, next) => {
  // what is the current shot?
  let { projectId } = req.params
  let project = get('SELECT * FROM projects WHERE id = ?', projectId)

  if (project.slater_event_id == null) {
    return next(new Error('Missing Slater'))
  }

  let prevEvent = get('SELECT * FROM events WHERE id = ?', project.slater_event_id)
  let prevShot = get('SELECT * FROM shots WHERE id = ?', prevEvent.shot_id)

  // how many impromptu shots do we have in this scene already?
  let count = get(
    `SELECT COUNT(id)
     FROM shots
     WHERE project_id = ?
     AND scene_id = ?
     AND impromptu = 1`,
    project.id,
    prevShot.scene_id,
  )['COUNT(id)']

  // prepare a new impromptu shot
  let values = {
    project_id: project.id,
    scene_id: prevShot.scene_id,
    shot_number: count + 1,
    impromptu: 1
  }

  // insert the shot
  let { lastInsertRowid } = run(
    `INSERT INTO shots
     (project_id, scene_id, shot_number, impromptu)
     VALUES (?, ?, ?, ?)`,
    values.project_id,
    values.scene_id,
    values.shot_number,
    values.impromptu
  )

  // add it to the schedule
  let id = createEvent({
    projectId: project.id,
    insertAfter: prevEvent.id,
    eventType: 'shot',
    description: 'New Impromptu Shot'
  })

  // update (remaining values that createEvent doesn’t set)
  run(
    `UPDATE events
     SET
       scene_id = ?,
       shot_id = ?
     WHERE
       id = ?`,
    prevShot.scene_id,
    lastInsertRowid,
    id
  )

  // advance slater to the event
  run(`UPDATE projects SET slater_event_id = ? WHERE id = ?`, id, project.id)

  return res.status(201).send()
}
