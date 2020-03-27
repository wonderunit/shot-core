const { get } = require('../db')

const create = require('../services/takes/create')
const action = require('../services/takes/action')
const cut = require('../services/takes/cut')
const updateFilepath = require('../services/takes/update-filepath')

exports.create = async (req, res) => {
  let { projectId, sceneId, shotId } = req.params
  let { at } = req.body

  let bus = req.app.get('bus')
  let zcam = req.app.get('zcam')

  try {
    bus.emit('camera-listener/disable')
    await zcam.get('/ctrl/rec?action=start')
    let takeId = create({ projectId, sceneId, shotId, at })
    bus.emit('takes/create', { id: takeId })

    let filepath = (await zcam.get('/ctrl/get?k=last_file_name')).data.value
    updateFilepath({ takeId, filepath })

    res.status(201).send({ id: takeId })
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
}

exports.action = async (req, res) => {
  let { takeId } = req.params
  let { at } = req.body

  action({ takeId, at })
  req.app.get('bus').emit('takes/action')

  res.sendStatus(200)
}

exports.cut = async (req, res) => {
  let { takeId } = req.params
  let { at } = req.body

  try {
    await req.app.get('zcam').get('/ctrl/rec?action=stop')
    cut({ takeId, at })
    req.app.get('bus').emit('takes/cut')
    req.app.get('bus').emit('camera-listener/enable')

    res.sendStatus(200)
  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
}

exports.show = (req, res) => {
  let { projectId, sceneId, shotId, takeId } = req.params

  let project = get(`SELECT id, name FROM projects where id = ?`, projectId)
  let scene = get(`SELECT id, scene_number FROM scenes where id = ?`, sceneId)
  let shot = get(`SELECT id, shot_number FROM shots where id = ?`, shotId)

  let take = get(`SELECT * FROM takes WHERE id = ?`, takeId)

  take.ready_at = new Date(take.ready_at)
  take.action_at = new Date(take.action_at)
  take.cut_at = new Date(take.cut_at)

  res.render('take', { project, scene, shot, take })
}
