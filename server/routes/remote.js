const { get } = require('../db')

const takes = require('./takes')
const slater = require('./slater')

const getSlaterEvent = projectId => {
  let { slater_event_id } = get(`SELECT slater_event_id FROM projects WHERE id = ?`, projectId)
  return get(`SELECT * FROM events WHERE id = ?`, slater_event_id)
}

const prepare = req => {
  let { projectId } = req.params

  let { at } = req.body

  let event = getSlaterEvent(projectId)
  req.params.sceneId = event.scene_id
  req.params.shotId = event.shot_id
}

exports.status = async (req, res) => {
  await slater.show(req, res)
}

exports.ready = async (req, res) => {
  prepare(req)
  await takes.create(req, res)
}

exports.action = async (req, res) => {
  prepare(req)
  await takes.action(req, res)
}

exports.cut = async (req, res) => {
  prepare(req)
  await takes.cut(req, res)
}

exports.next = async (req, res) => {
  req.body.transition = 'next'
  await slater.update(req, res)
}

exports.previous = async (req, res) => {
  req.body.transition = 'previous'
  await slater.update(req, res)
}
