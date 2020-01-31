const express = require('express')
const path = require('path')
const sqlite3 = require('sqlite3').verbose()

const parse = require('date-fns/parse')
const { format } = require('date-fns-tz')

const { promisified } = require('../lib/promisify-sqlite3')
const slaterCanvas = require('./slater-canvas')

const app = express()
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, './views'))
app.use(express.static('public'))

app.locals = {
  parse,
  format
}

const db = new sqlite3.Database('./dev.sqlite3')
const { get, all } = promisified(db)

app.get('/', async (req, res) => {
  let projects = await all('SELECT * FROM projects')
  res.render('index', { projects })
})

app.get('/projects/:projectId', async (req, res) => {
  let { projectId } = req.params

  let project = await get('SELECT * FROM projects WHERE id = ?', projectId)

  let scenes = await all('SELECT * FROM scenes WHERE project_id = ?', projectId)

  let shots = await all('SELECT * FROM shots WHERE project_id = ?', projectId)
  shots.forEach(shot => (shot.boards_json = JSON.parse(shot.boards_json)))

  let events = (await all(`select start_at, date(start_at, 'localtime') as day from events group by day`))
  events.forEach(event => (event.start_at = new Date(event.start_at)))

  res.render('project', { project, scenes, shots, events })
})

app.get('/projects/:projectId/schedules/:startDate', async (req, res) => {
  let { projectId, startDate } = req.params
  let project = await get('SELECT * FROM projects WHERE id = ?', projectId)
  let events = await all(`SELECT * FROM events WHERE date(start_at, 'localtime') = ?`, startDate)
  events.forEach(event => (event.start_at = new Date(event.start_at)))
  res.render('schedule', { project, startDate: parse(startDate, 'yyyy-MM-dd', new Date()), events })
})

app.get('/projects/:projectId/scenes/:sceneId/shots/:shotId', async (req, res) => {
  let { projectId, sceneId, shotId } = req.params
  let project = await get('SELECT id, name FROM projects WHERE id = ?', projectId)
  let scene = await get('SELECT id, scene_number, storyboarder_path FROM scenes WHERE id = ?', sceneId)
  let shot = await get('SELECT * FROM shots WHERE id = ?', shotId)
  shot.boards_json = JSON.parse(shot.boards_json)
  let takes = await all('SELECT * FROM takes WHERE shot_id = ?', shotId)

  let imagesPath = '/' +
    scene.storyboarder_path
      .replace(
        path.basename(scene.storyboarder_path),
        'images'
      )

  res.render('shot', { project, scene, shot, takes, imagesPath })
})

app.get('/projects/:projectId/scenes/:sceneId/shots/:shotId/takes/:takeId', async (req, res) => {
  res.render('take')
})

app.get('/slater', async (req, res) => {
  res.render('slater')
})

app.get('/slater.png', async (req, res) => {
  res.setHeader('Content-Type', 'image/png');
  slaterCanvas.draw().createPNGStream().pipe(res)
})

app.get('/monitor', async (req, res) => {
  res.render('monitor')
})

const port = 3000
app.listen(port, () => {
  console.log(`Listening on :${port}`)

  if (process.send) {
    process.send('online')
  }
})
