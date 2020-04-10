const { Converter } = require('ffmpeg-stream')
const fs = require('fs-extra')
const path = require('path')

const { UPLOADS_PATH } = require('../config')
const { get } = require('../db')

const Take = require('../decorators/take')

// const { createStreamWithVisualSlate } = require('../services/visual-slate')

let converter
let running = false

async function startup ({ uri, takeId }) {
  if (running) {
    console.warn('[rtsp-client] startup() called but it is already in progress')
    return
  }

  console.log('[rtsp-client] startup()')
  running = true

  let take = get('SELECT * FROM takes WHERE id = ?', takeId)
  let { scene_number } = get(`SELECT scene_number from scenes WHERE id = ?`, take.scene_id)
  let { shot_number } = get(`SELECT shot_number from shots WHERE id = ?`, take.shot_id)

  let dirname = path.join('projects', take.project_id.toString(), 'takes')

  let filename = Take.filenameForStream({
    scene_number,
    shot_number,
    take_number: take.take_number,
    id: take.id
  })
  let filepath = path.join(dirname, filename)

  fs.mkdirpSync(path.join(UPLOADS_PATH, dirname))

  converter = new Converter()

  console.log(`[rtsp-client] - from: ${uri}`)
  converter
    .createInputFromFile(uri, { rtsp_transport: 'tcp' })

  console.log(`[rtsp-client] - to:   public/uploads/${filepath}`)

  converter
    .createOutputToFile(path.join(UPLOADS_PATH, dirname, filename), { codec: 'copy' })

  await converter.run()

  // await createStreamWithVisualSlate({
  //    inpath: path.join(UPLOADS_PATH, dirname, filename),
  //   outpath: path.join(UPLOADS_PATH, dirname, filename),
  //   // TODO don't hardcode
  //   frameLengthInSeconds: 1001/24000,
  //   slateData: {
  //     width: 1920,
  //     height: 1080
  //   }
  // })
}

async function shutdown () {
  console.log('[rtsp-client] shutdown()')
  try {
    console.log('[rtsp-client] killing current process …')
    converter.kill()
  } catch (err) {
    // .kill() throws Error of { code: 1 }
    // console.error('[rtsp-client] ERROR', err)
  }
  running = false
}

module.exports = {
  startup,
  shutdown
}
