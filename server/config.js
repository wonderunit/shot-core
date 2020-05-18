const path = require('path')

module.exports = {
  UPLOADS_PATH: process.env.UPLOADS_PATH == null
    ? path.join(__dirname, '../public/uploads')
    : path.resolve(process.env.UPLOADS_PATH)
}
