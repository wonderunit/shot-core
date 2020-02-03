const slaterCanvas = require('../slater-canvas')

exports.index = async (req, res) => {
  res.render('slater')
}

exports.png = async (req, res) => {
  res.setHeader('Content-Type', 'image/png')
  slaterCanvas.draw().createPNGStream().pipe(res)
}
