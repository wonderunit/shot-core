const express = require('express')
const methodOverride = require('method-override')
const responseTime = require('response-time')
const http = require('http')
const EventEmitter = require('events').EventEmitter

const path = require('path')

const parse = require('date-fns/parse')
const { format } = require('date-fns-tz')

const ZcamHttpClient = require('../lib/zcam/client')
const createMjpegProxy = require('../lib/mjpeg-proxy')

const WebSocketServer = require('./websockets')
const ZcamWsRelay = require('./zcam-ws-relay')

const visualSlateRenderer = require('./systems/visual-slate/renderer')
const downloader = require('./systems/downloader')
const rtspClient = require('./systems/rtsp-client')

const home = require('./routes/home')
const projects = require('./routes/projects')
const schedules = require('./routes/schedules')
const events = require('./routes/events')
const shots = require('./routes/shots')
const scenes = require('./routes/scenes')
const takes = require('./routes/takes')
const slater = require('./routes/slater')
const monitor = require('./routes/monitor')
const remote = require('./routes/remote')

const { truncate, durationMsecsToString, friendlyDuration } = require('./helpers')

const bus = new EventEmitter()

const jsonParser = express.json()

const PORT = process.env.PORT || 4000
const ZCAM = process.env.ZCAM || '10.98.33.1'
const ZCAM_URL = process.env.ZCAM_URL || `http://${ZCAM}`
const ZCAM_WS_URL = process.env.ZCAM_WS_URL || `ws://${ZCAM}:81`
const ZCAM_RTSP_URL = process.env.ZCAM_RTSP_URL || `rtsp://${ZCAM}/live_stream`

const app = express()
app.set('port', PORT)
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, './views'))
app.set('bus', bus)
console.log('Connecting to Z Cam HTTP at', ZCAM_URL)
app.set('zcam', new ZcamHttpClient({ uri: ZCAM_URL }))
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

let livereload

if (app.get('env') == 'development') {
  livereload = require('./livereload')
  app.get('/livereload', livereload.get)
}

app.locals = {
  parse,
  format,
  truncate,
  durationMsecsToString,
  friendlyDuration
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

app.get('/projects/:projectId/scenes', scenes.index)

app.get('/projects/:projectId/scenes/:sceneId/shots/:shotId', shots.show)
app.patch('/projects/:projectId/scenes/:sceneId/shots/:shotId', jsonParser, shots.update)

app.get('/projects/:projectId/takes', takes.index)
app.get('/projects/:projectId/scenes/:sceneId/shots/:shotId/takes/:takeId', takes.show)
app.post('/projects/:projectId/scenes/:sceneId/shots/:shotId/takes.json', jsonParser, takes.create)
app.post('/projects/:projectId/scenes/:sceneId/shots/:shotId/takes/:takeId/action.json', jsonParser, takes.action)
app.post('/projects/:projectId/scenes/:sceneId/shots/:shotId/takes/:takeId/cut.json', jsonParser, takes.cut)
app.patch('/projects/:projectId/scenes/:sceneId/shots/:shotId/takes/:takeId.json', jsonParser, takes.update)

app.get('/projects/:projectId/slater', slater.show)
app.patch('/projects/:projectId/slater.json', jsonParser, slater.update)
app.get('/projects/:projectId/slater.png', slater.png)

app.get('/projects/:projectId/monitor', monitor.show)

// REMOTE
app.get('/projects/:projectId/slater.json', jsonParser, remote.status)
app.post('/projects/:projectId/slater/ready.json', jsonParser, remote.ready)
app.post('/projects/:projectId/slater/action.json', jsonParser, remote.action)
app.post('/projects/:projectId/slater/cut.json', jsonParser, remote.cut)
app.post('/projects/:projectId/slater/next.json', jsonParser, remote.next)
app.post('/projects/:projectId/slater/previous.json', jsonParser, remote.previous)
app.post('/projects/:projectId/slater/impromptu.json', jsonParser, remote.impromptu)

// TODO await
visualSlateRenderer.start()

bus
  .on('takes/create', async ({ id }) => {
    console.log('[server] RTSP client START recording stream for take', id)
    try {
      await rtspClient.startup({ uri: ZCAM_RTSP_URL, takeId: id })
    } catch (err) {
      console.error('[server] RTSP client error', err)
    }
  })
  .on('takes/cut', () => {
    console.log('[server] RTSP client STOP recording stream')
    rtspClient.shutdown()
  })

// Z Cam connections
console.log('Connecting to Z Cam WebSocket at', ZCAM_WS_URL)
const zcamWsRelay = new ZcamWsRelay(
  ZCAM_WS_URL,
  app.get('bus'),
  app.get('zcam'),
  { projectId: 1 }
)
zcamWsRelay.start()

const mjpegProxy = createMjpegProxy(ZCAM_URL + '/mjpeg_stream')
app.get('/projects/:projectId/monitor/mjpeg_stream', mjpegProxy.get)

// start the downloader
downloader.init({ ZCAM_URL, projectId: 1 })
downloader.start()
bus.on('camera/idle', () => {
  console.log('telling downloader to start')
  downloader.send('ON')
})
bus.on('camera/active', () => {
  console.log('telling downloader to stop')
  downloader.send('OFF')
})

const server = http.createServer(app)

const webSocketServer = new WebSocketServer(app, server)
webSocketServer.start()

server.listen(app.get('port'), () => {
  console.log(`Listening on :${app.get('port')}`)
  if (livereload) {
    livereload.reload()
  }
})

async function bye () {
  console.log('Shutting down ...')
  await webSocketServer.stop()
  await downloader.stop()
  await zcamWsRelay.stop()
  if (livereload) {
    livereload.stop()
  }
  bus.removeAllListeners()
  server.close()
}
 
process.once('SIGTERM', bye)
process.once('SIGINT', bye)
// https://github.com/remy/nodemon#controlling-shutdown-of-your-script
process.once('SIGUSR2', async function () {
  await bye()
  process.kill(process.pid, 'SIGUSR2')
})
