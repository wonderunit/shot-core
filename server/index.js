const express = require('express')
const path = require('path')
const sqlite3 = require('sqlite3').verbose()
const SQLiteTag = require('sqlite-tag')

const format = require('date-fns/format')
const parse = require('date-fns/parse')
const { utcToZonedTime } = require('date-fns-tz')

const slaterCanvas = require('./slater-canvas')

const db = new sqlite3.Database('./dev.sqlite3')
const { all, get, query, raw } = SQLiteTag(db)

const app = express()
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, './views'))
app.use(express.static('public'))

app.locals = {
  format,
  parse,
  utcToZonedTime
}

app.get('/', async (req, res) => {
  res.render('index')
})

app.get('/projects/:projectId', async (req, res) => {
  // TODO should grab only unique days
  let events = await all`SELECT * FROM events`
  events.forEach(event => (event.date = new Date(event.date)))
  res.render('project', { days: events })
})

app.get('/projects/:projectId/schedules/:startDate', async (req, res) => {
  let { startDate } = req.params
  let events = await all`SELECT * FROM events WHERE date(date) = ${startDate}`
  events.forEach(event => (event.date = new Date(event.date)))
  res.render('schedule', { startDate: new Date(startDate), events })
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
