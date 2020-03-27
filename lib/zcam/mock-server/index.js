// $ npm run zcam-mock-server
// $ node test/zcam-client.test.js
const express = require('express')
const http = require('http')

const mjpegStream = require('./mjpeg-stream')
const createWebSocketServer = require('./websockets')
const responses = require('./data/responses')

const app = express()

app.set('port', process.env.PORT || 8080)

app.use((req, res, next) => {
  res.json = body => {
    res.set('Content-Type', 'application/json')
    res.send(JSON.stringify(body, null, 2))
  }
  next()
})

app.get('/info', (req, res) => res.send(responses.info))

app.get('/ctrl/get', (req, res) => {
  const { k } = req.query
  res.send(responses[`ctrl_get_${k}`])
})

app.get('/ctrl/card', (req, res) => {
  const { action } = req.query
  res.send(responses[`ctrl_card_${action}`])
})

app.get('/ctrl/rec', (req, res) => {
  const { action } = req.query

  switch (action) {
    case 'start':
      console.log('Requesting REC START')
      break
    case 'stop':
      console.log('Recording REC STOP')
      break
  }

  res.status(200).send({ code: 0, desc: '', msg: '' })
})

app.get('/timeout', (req, res) => {
  setTimeout(() => res.sendStatus(200), 5000)
})

// node-canvas based mjpeg stream for testing
app.get('/mjpeg_stream', mjpegStream)

// ffmpeg->VLC simulated stream
//
// can run with:
// $ ./scripts/mjpeg_stream
//
// then uncomment the following:
//
// const { MjpegProxy } = require('../../mjpeg-proxy')
// app.get('/mjpeg_stream', new MjpegProxy('http://localhost:18223').proxyRequest)

const httpServer = http.createServer(app)
const wsServer = http.createServer()

createWebSocketServer(wsServer)

console.log('Starting Z Cam Mock Server')
httpServer.listen(app.get('port'), () => {
  console.log(`listen http :${app.get('port')}`)
})

wsServer.listen(parseInt(app.get('port')) + 1, () => {
  console.log(`listen ws :${parseInt(app.get('port')) + 1}`)
})
