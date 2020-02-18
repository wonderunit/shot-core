const express = require('express')
const methodOverride = require('method-override')
const responseTime = require('response-time')
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
    return method
  }
}))
app.use(responseTime())

app.locals = {
  parse,
  format
}

app.get('/', home.index)

app.get('/projects/new', projects.new)
app.post('/projects', projects.create)
app.get('/projects/:projectId', projects.show)
app.delete('/projects/:projectId', projects.destroy)

app.get('/projects/:projectId/schedule', schedules.show)

app.get('/projects/:projectId/scenes/:sceneId/shots/:shotId', shots.show)

app.get('/projects/:projectId/scenes/:sceneId/shots/:shotId/takes/:takeId', takes.show)
app.post('/projects/:projectId/scenes/:sceneId/shots/:shotId/takes.json', jsonParser, takes.create)
app.post('/projects/:projectId/scenes/:sceneId/shots/:shotId/takes/:takeId/action.json', jsonParser, takes.action)
app.post('/projects/:projectId/scenes/:sceneId/shots/:shotId/takes/:takeId/cut.json', jsonParser, takes.cut)

app.get('/projects/:projectId/slater', slater.show)
app.get('/projects/:projectId/slater.png', slater.png)

app.get('/projects/:projectId/monitor', monitor.show)

app.listen(app.get('port'), () => {
  if (app.get('env') == 'development') {
    const browserSync = require('browser-sync')
    browserSync.create().init({
      proxy: 'localhost:8000',
      port: 3000,
      files: ['server/**/*', 'public/**/*', 'lib/*'],
      ignore: ['node_modules'],
      reloadDelay: 10,
      notify: false,
      ui: false,
      open: false,
      reloadOnRestart: true,
      logLevel: 'silent'
    })
  }
  console.log(`Listening on :3000`)
})
