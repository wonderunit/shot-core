const { run, get, all } = require('../db')
const slaterCanvas = require('../slater-canvas')

const Scene = require('../decorators/scene')
const Shot = require('../decorators/shot')

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
      return res.sendStatus(204)
    case 'previous':
      run(
        `UPDATE projects SET slater_event_id = ? WHERE id = ?`,
        prev.id, projectId)
      req.app.get('bus').emit('slater/updated')
      return res.sendStatus(204)
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

    scene = new Scene(scene)
    shot = new Shot(shot)

    slater = {
      scene,
      shot,
      takes,

      ...display(take)
    }
  }

  res.render('slater', { project, ...slater })
}

exports.png = (req, res) => {
  res.setHeader('Content-Type', 'image/png')
  slaterCanvas.draw().createPNGStream().pipe(res)
}
