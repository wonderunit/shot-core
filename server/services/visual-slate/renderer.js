const { loadImage, createCanvas } = require('canvas')
const path = require('path')

const debug = require('debug')('shotcore:visual-slate-render')

const TEMPLATE_FILE = path.join(__dirname, 'slate-template.png')

let templateImage
async function start () {
  try {
    templateImage = await loadImage(TEMPLATE_FILE)
    debug(`loaded ${path.basename(TEMPLATE_FILE)}`)
  } catch (err) {
    console.error(`Could not load ${path.basename(TEMPLATE_FILE)}`, err)
  }
}

function draw (ctx) {
  if (!templateImage) throw new Error(`Could not read ${path.basename(TEMPLATE_FILE)}`)

  let { width, height } = ctx.canvas

  debug('draw', { width, height })

  // ctx.fillStyle = '#111111'
  // ctx.fillRect(0, 0, width, height)

  ctx.drawImage(templateImage, 0, 0, width, height)

  let text = new Date().toISOString()

  ctx.fillStyle = '#333333'
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
}

function render ({ slateData }) {
  let { width, height } = slateData
  let canvas = createCanvas(width, height)
  let ctx = canvas.getContext('2d')
  draw(ctx)
  return ctx.canvas.toBuffer('image/png')
}

module.exports = {
  start,
  render
}
