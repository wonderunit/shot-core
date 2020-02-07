const { get, all } = require('../db')
const slaterCanvas = require('../slater-canvas')

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

exports.show = async (req, res) => {
  let { projectId } = req.params

  let project = await get('SELECT * FROM projects WHERE id = ?', projectId)

  let slater
  if (project.slater_shot_id) {
    let shot = await get('SELECT * FROM shots WHERE id = ?', project.slater_shot_id)
    let scene = await get('SELECT * FROM scenes WHERE id = ?', shot.scene_id)
    let takes = await all('SELECT * FROM takes WHERE shot_id = ?', shot.id)

    let take
    if (takes.length) {
      let max = takes.reduce((acc, take) => Math.max(acc, take.take_number), -Infinity)
      take = takes.find(take => take.take_number == max)
    }

    slater = {
      scene,
      shot,
      takes,

      ...display(take)
    }
  }

  res.render('slater', { project, ...slater })
}

exports.png = async (req, res) => {
  res.setHeader('Content-Type', 'image/png')
  slaterCanvas.draw().createPNGStream().pipe(res)
}