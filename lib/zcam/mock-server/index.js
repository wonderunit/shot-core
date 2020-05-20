const express = require('express')
const http = require('http')
const path = require('path')
const RtspServer = require('rtsp-streaming-server').default
const { execSync } = require('child_process')

const mjpegStream = require('./mjpeg-stream')
const createWebSocketServer = require('./websockets')
const responses = require('./data/responses')

const app = express()

let state = {
  mode: 'rec'
}

let wssBroadcast

app.set('port', process.env.PORT || 80)

let takeMov = process.env.TAKE_MOV
  ? {
    filepath: path.resolve(process.env.TAKE_MOV),
    metadata: JSON.parse(execSync(
      `ffprobe \
        -hide_banner \
        -loglevel fatal \
        -show_format \
        -show_streams \
        -print_format json \
        ${process.env.TAKE_MOV}`
    ).toString())
  }
  : null

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
      wssBroadcast('RecStarted')
      wssBroadcast('RecordingFile', 'A001C0001')
      break
    case 'stop':
      console.log('Recording REC STOP')
      state.mode = 'rec'
      wssBroadcast('RecStoped')
      break
  }

  res.status(200).send({ code: 0, desc: '', msg: '' })
})

app.get('/ctrl/mode', (req, res) => {
  const { action } = req.query

  switch (action) {
    case 'to_standby':
      state.mode = 'standby'
      wssBroadcast('ModeChange', 4)
      break
    case 'exit_standby':
      state.mode = 'rec'
      wssBroadcast('ModeChange', 0)
      break
    case 'to_rec':
      state.mode = 'rec'
      wssBroadcast('ModeChange', 0)
      break
    case 'query':
      break
  }

  res.status(200).send({ code: 0, desc: '', msg: '' })
})

app.get('/timeout', (req, res) => {
  setTimeout(() => res.sendStatus(200), 5000)
})

// node-canvas based mjpeg stream for testing
app.get('/mjpeg_stream', mjpegStream)

app.get('/DCIM*', (req, res) => {
  let { act } = req.query

  switch (act) {
    //
    // the documentation for ?act=info is not accurate
    // https://github.com/imaginevision/Z-Camera-Doc/blob/2ea7066/E2/protocol/http.md#get-file-information
    //
    // `vcnt`: docs say "video packet count", but appears to be number of frames + 1 of stream #0:1
    //
    // `vts`: docs say "video timescale", but appears to be audio sample rate of stream #0:2
    // `dur`: docs say "video duration", but appears to be number of audio samples in stream #0:2
    //
    // `w`/`h`: values are from from stream #0:1 (proxy, hevc), not stream #0:0 (prores)
    //
    case 'info':
      console.log('Requested DCIM info', req.url)

      setTimeout(
        () => {
          console.log('... sending info')
          res.send({
            "code": 0,
            "desc": "",
            "msg": "",
            ...takeMov
              ? {
                w: parseFloat(takeMov.metadata.streams[1].width),
                h: parseFloat(takeMov.metadata.streams[1].height),

                vcnt: parseFloat(takeMov.metadata.streams[0].nb_frames) + 1,

                vts: parseFloat(takeMov.metadata.streams[2].sample_rate),
                dur: parseFloat(takeMov.metadata.streams[2].duration_ts),
                
              }
              : {
                "w": 2880,   // width
                "h": 2880,   // height
                "vts": 30000, // timescale
                "vcnt": 107,   // number of frames
                "dur": 107107 // duration
              }
          })
        },
        500
      )
      break

    case 'scr':
      console.log('Requested DCIM .jpg', req.url)
      if (takeMov) {
        res.sendFile(takeMov.filepath.replace(/mov$/i, 'jpg'))
      } else {
        setTimeout(() => res.sendStatus(200), 100)
      }
      break

    default:
      console.log('Requested DCIM .mov', req.url)
      if (takeMov) {
        res.sendFile(takeMov.filepath)
      } else {
        setTimeout(() => res.sendStatus(200), 100)
      }
      break
  }
})

const httpServer = http.createServer(app)
const wsServer = http.createServer()

const wss = createWebSocketServer(wsServer)
wssBroadcast = (what, value) => wss.broadcast({ what, value })

console.log('Starting Z Cam Mock Server')
httpServer.listen(app.get('port'), () => {
  console.log(`listen http :${app.get('port')}`)
})

wsServer.listen(parseInt(app.get('port')) + 1, () => {
  console.log(`listen ws :${parseInt(app.get('port')) + 1}`)
})

if (takeMov) {
  console.log('Using footage from', takeMov.filepath)
} else {
  console.log('TAKE_MOV not set. No example footage MOV will be served.')
}

const server = new RtspServer({
	serverPort: 5554,
	clientPort: 554,
	rtpPortStart: 10000,
	rtpPortCount: 10000
})
async function runRtspServer () {
	try {
		await server.start()
	} catch (err) {
		console.error(err)
	}
}
runRtspServer()
