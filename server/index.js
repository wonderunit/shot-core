const express = require('express')
const methodOverride = require('method-override')
const responseTime = require('response-time')
const path = require('path')

const parse = require('date-fns/parse')
const { format } = require('date-fns-tz')

const home = require('./routes/home')
const projects = require('./routes/projects')
const schedules = require('./routes/schedules')
const events = require('./routes/events')
const shots = require('./routes/shots')
const takes = require('./routes/takes')
const slater = require('./routes/slater')
const monitor = require('./routes/monitor')

const { truncate, durationMsecsToString } = require('./helpers')

const jsonParser = express.json()

const app = express()
app.set('port', process.env.PORT || 8000)
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, './views'))
app.use(express.static('public'))

app.use(express.urlencoded({ extended: false }))
app.use(methodOverride(function (req) {
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    let method = req.body._method
    delete req.body._method
    return method.toUpperCase()
  }
}))
app.use(responseTime())

app.locals = {
  parse,
  format,
  truncate,
  durationMsecsToString
}

app.get('/', home.index)

app.get('/projects/new', projects.new)
app.post('/projects', projects.create)
app.get('/projects/:projectId', projects.show)
app.delete('/projects/:projectId', projects.destroy)

app.get('/projects/:projectId/schedule', schedules.show)
app.patch('/projects/:projectId/schedule', jsonParser, schedules.update)

app.post('/projects/:projectId/events', jsonParser, events.create)
app.patch('/projects/:projectId/events/:eventId', jsonParser, events.update)
app.delete('/projects/:projectId/events/:eventId', events.destroy)

app.get('/projects/:projectId/scenes/:sceneId/shots/:shotId', shots.show)
app.patch('/projects/:projectId/scenes/:sceneId/shots/:shotId', jsonParser, shots.update)

app.get('/projects/:projectId/scenes/:sceneId/shots/:shotId/takes/:takeId', takes.show)
app.post('/projects/:projectId/scenes/:sceneId/shots/:shotId/takes.json', jsonParser, takes.create)
app.post('/projects/:projectId/scenes/:sceneId/shots/:shotId/takes/:takeId/action.json', jsonParser, takes.action)
app.post('/projects/:projectId/scenes/:sceneId/shots/:shotId/takes/:takeId/cut.json', jsonParser, takes.cut)

app.get('/projects/:projectId/slater', slater.show)
app.patch('/projects/:projectId/slater.json', jsonParser, slater.update)
app.get('/projects/:projectId/slater.png', slater.png)

app.get('/projects/:projectId/monitor', monitor.show)

app.listen(app.get('port'), () => {
  if (app.get('env') == 'development') {
    const http = require('http')
    http.get('http://localhost:3000/__browser_sync__?method=reload')
    console.log(`Listening on :3000`)
  }
})
