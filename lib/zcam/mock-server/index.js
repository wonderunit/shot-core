// $ npm run zcam-mock-server
// $ node test/zcam-client.test.js
const express = require('express')
const http = require('http')
const path = require('path')

const mjpegStream = require('./mjpeg-stream')
const createWebSocketServer = require('./websockets')
const responses = require('./data/responses')

const app = express()

let state = {
  mode: 'rec'
}

app.set('port', process.env.PORT || 8080)
if (process.env.TAKE_MOV) {
  app.set('takeMov', path.resolve(process.env.TAKE_MOV))
}

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
      state.mode = 'rec_ing'
      break
    case 'stop':
      console.log('Recording REC STOP')
      state.mode = 'rec'
      break
  }

  res.status(200).send({ code: 0, desc: '', msg: '' })
})

app.get('/ctrl/mode', (req, res) => {
  const { action } = req.query

  res.status(200).send({ code: 0, desc: '', msg: state.mode })
})

app.get('/timeout', (req, res) => {
  setTimeout(() => res.sendStatus(200), 5000)
})

// node-canvas based mjpeg stream for testing
app.get('/mjpeg_stream', mjpegStream)

app.get('/DCIM*?act=src', (req, res) => {
  console.log('Requested DCIM', req.url)
  if (app.get('takeMov')) {
    res.sendFile(app.get('takeMov'))
  } else {
    setTimeout(() => res.sendStatus(200), 100)
  }
})

app.get('/DCIM*', (req, res) => {
  let { act } = req.query

  console.log('Requested DCIM', req.url)
  if (act === 'scr') {
    if (app.get('takeMov')) {
      res.sendFile(app.get('takeMov').replace(/mov$/i, 'jpg'))
    } else {
      setTimeout(() => res.sendStatus(200), 100)
    }
  } else {
    if (app.get('takeMov')) {
      res.sendFile(app.get('takeMov'))
    } else {
      setTimeout(() => res.sendStatus(200), 100)
    }
  }
})

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

if (app.get('takeMov')) {
  console.log('Using footage from', process.env.TAKE_MOV)
} else {
  console.log('TAKE_MOV not set. No example footage MOV will be served.')
}
