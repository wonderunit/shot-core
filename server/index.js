const express = require('express')
const path = require('path')

const parse = require('date-fns/parse')
const { format } = require('date-fns-tz')

const home = require('./routes/home')
const projects = require('./routes/projects')
const schedules = require('./routes/schedules')
const shots = require('./routes/shots')
const takes = require('./routes/takes')
const slater = require('./routes/slater')
const monitor = require('./routes/monitor')

const jsonParser = express.json()
const urlencodedParser = express.urlencoded()

const app = express()
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, './views'))
app.use(express.static('public'))

app.locals = {
  parse,
  format
}

app.get('/', home.index)

app.get('/projects/new', projects.new)
app.post('/projects', urlencodedParser, projects.create)
app.get('/projects/:projectId', projects.show)

app.get('/projects/:projectId/schedules/:startDate', schedules.show)

app.get('/projects/:projectId/scenes/:sceneId/shots/:shotId', shots.show)

app.get('/projects/:projectId/scenes/:sceneId/shots/:shotId/takes/:takeId', takes.show)
app.post('/projects/:projectId/scenes/:sceneId/shots/:shotId/takes.json', jsonParser, takes.create)
app.post('/projects/:projectId/scenes/:sceneId/shots/:shotId/takes/:takeId/action.json', jsonParser, takes.action)
app.post('/projects/:projectId/scenes/:sceneId/shots/:shotId/takes/:takeId/cut.json', jsonParser, takes.cut)

app.get('/projects/:projectId/slater', slater.show)
app.get('/projects/:projectId/slater.png', slater.png)

app.get('/projects/:projectId/monitor', monitor.show)

const port = 3000
app.listen(port, () => {
  console.log(`Listening on :${port}`)

  // browser-refresh
  if (process.send) {
    process.send('online')
  }
})
