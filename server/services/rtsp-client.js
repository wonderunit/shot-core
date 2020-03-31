const { Converter } = require('ffmpeg-stream')
const fs = require('fs-extra')
const path = require('path')

const { UPLOADS_PATH } = require('../config')
const { get } = require('../db')

let converter
let running = false

async function startup ({ ZCAM_RTSP_URL, takeId }) {
  if (running) {
    console.warn('[rtsp-client] startup() called but it is already in progress')
    return
  }

  console.log('[rtsp-client] startup()')
  running = true

  let uri = `${ZCAM_RTSP_URL}/live_stream`

  let take = get('SELECT * FROM takes WHERE id = ?', takeId)
  let { scene_number } = get(`SELECT scene_number from scenes WHERE id = ?`, take.scene_id)
  let { shot_number } = get(`SELECT shot_number from shots WHERE id = ?`, take.shot_id)

  let dirname = path.join('projects', take.project_id.toString(), 'takes')
  let filename = `scene_${scene_number}_shot_${shot_number}_take_${take.take_number}_id_${take.id}-STREAM.mp4`
  let filepath = path.join(dirname, filename)

  fs.mkdirpSync(path.join(UPLOADS_PATH, dirname))

  converter = new Converter()

  console.log('[rtsp-client] - from: ', uri)
  converter
    .createInputFromFile(uri, { rtsp_transport: 'tcp' })

  console.log('[rtsp-client] - to:   ', filepath)
  converter
    .createOutputToFile(path.join(UPLOADS_PATH, dirname, filename), { codec: 'copy' })

  try {
    await converter.run()
  } catch (err) {
    console.error('[rtsp-client]', err)
  }
}

async function shutdown () {
  console.log('[rtsp-client] shutdown()')
  converter.kill()
  running = false
}

module.exports = {
  startup,
  shutdown
}
