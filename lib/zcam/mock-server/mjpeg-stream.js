const { EventEmitter } = require('events')
const { createCanvas } = require('canvas')

const boundary = 'oscliveview'

const canvas = createCanvas(1280, 720)
const ctx = canvas.getContext('2d')

function draw (ctx) {
  let { width, height } = ctx.canvas

  ctx.save()
  ctx.fillStyle = '#111111'
  ctx.fillRect(0, 0, width, height)

  let text = new Date().toISOString()

  ctx.fillStyle = '#fefefe'
  ctx.font = '64px Helvetica'
  let tm = ctx.measureText(text)
  let offset = {
    x: 0 - tm.actualBoundingBoxLeft,
    y: Math.ceil(tm.actualBoundingBoxAscent)
  }
  ctx.fillText(
    text,
    64 + offset.x,
    64 + offset.y
  )

  ctx.restore()
}

const emitter = new EventEmitter()

setInterval(
  () => {
    draw(ctx)
    let buffer = ctx.canvas.toBuffer('image/jpeg', { quality: 0.8 })
	  emitter.emit('frame', buffer)
  }, 1000 / 24
)

function writeJpeg (res, buffer) {
  res.write(`--${boundary}\nContent-Type: image/jpg\nContent-length: ${buffer.length}\n\n`)
  res.write(buffer)
}

function mjpegStream (req, res) {
  res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=--' + boundary)
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'close')
  res.setHeader('Pragma', 'no-cache')

  res.writeHead(200)

  const onFrame = buffer => writeJpeg(res, buffer)
  const onError = err => { console.error(err) }

  console.log('[mjpeg-stream] new stream')
  emitter.on('frame', onFrame)
  emitter.on('error', onError)
  res.on('close', () => {
    console.log('[mjpeg-stream] stream closed')
    emitter.removeListener('frame', onFrame)
    emitter.removeListener('error', onError)
    res.end()
  })
}

module.exports = mjpegStream
