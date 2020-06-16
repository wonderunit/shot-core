const path = require('path')

const UPLOADS_PATH = process.env.UPLOADS_PATH == null
  ? path.join(__dirname, '../public/uploads')
  : path.resolve(process.env.UPLOADS_PATH)
const PORT = process.env.PORT || 4000
const ZCAM = process.env.ZCAM || '10.98.33.1'
const ZCAM_URL = process.env.ZCAM_URL || `http://${ZCAM}`
const ZCAM_WS_URL = process.env.ZCAM_WS_URL || `ws://${ZCAM}:81`
const ZCAM_RTSP_URL = process.env.ZCAM_RTSP_URL || `rtsp://${ZCAM}/live_stream`

module.exports = {
  UPLOADS_PATH,
  PORT,
  ZCAM,
  ZCAM_URL,
  ZCAM_WS_URL,
  ZCAM_RTSP_URL
}
