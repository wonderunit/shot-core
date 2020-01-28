const { createCanvas } = require('canvas')

const canvas = createCanvas(800, 600)
const ctx = canvas.getContext('2d')

function draw () {
  ctx.save()
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, 800, 600)

  ctx.fillStyle = '#222'
  ctx.font = '30px Helvetica'
  ctx.rotate(0.1)
  ctx.fillText('Slater!', 50, 100)

  let text = ctx.measureText('Slater!')
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'
  ctx.beginPath()
  ctx.lineTo(50, 102)
  ctx.lineTo(50 + text.width, 102)
  ctx.stroke()

  ctx.font = '9px Verdana'
  ctx.fillText(new Date(), 50, 150)

  ctx.restore()
  return canvas
}

module.exports = {
  draw
}
