// NODE_ENV=test DEBUG=shotcore:* node test/rtsp-client.test.js
if (process.env.NODE_ENV !== 'test') throw new Error('Not running in test mode')

const { run, get } = require('../server/db')

run('DELETE FROM events')
run('DELETE FROM projects')
run('DELETE FROM scenes')
run('DELETE FROM settings')
run('DELETE FROM shots')
run('DELETE FROM takes')
run('DELETE FROM sqlite_sequence')

let { lastInsertRowid: sceneId } = run(`INSERT INTO scenes(project_id, scene_number) VALUES(1, 1)`)
let { lastInsertRowid: shotId } = run(`INSERT INTO shots(project_id, scene_id, shot_number, impromptu) VALUES(1, ?, 1, 0)`, sceneId)

let { lastInsertRowid } = run(`
INSERT INTO takes(
  project_id,
  scene_id,
  shot_id,
  take_number,
  downloaded,
  metadata_json
) VALUES (
  1,
  ?,
  ?,
  1,
  0,
  '{}'
)
`,
sceneId,
shotId)

let { id: takeId } = get(`SELECT id FROM takes WHERE rowid = ?`, lastInsertRowid)

const rtspClient = require('../server/systems/rtsp-client')
rtspClient.start()
rtspClient.send({ type: 'REC_START', src: 'rtsp://127.0.0.1:554/live_stream', takeId })

// 1000 ms will be too slow
//  error code = 1
//  “Could not write header for output file #0 (incorrect codec parameters ?): Immediate exit requested“
// setTimeout(() => rtspClient.send({ type: 'REC_STOP' }), 1000)

setTimeout(() => rtspClient.send({ type: 'REC_STOP' }), 3000)

//
//
// for nodemon
//
const createSignalHandler = signal => {
  return async (err) => {
    removeHandlers()
    console.log(`\nShutting down via ${signal} …`)

    rtspClient.stop()

    process.kill(process.pid, signal)
  }
}
const sigtermHandler = createSignalHandler('SIGTERM')
const sigintHandler = createSignalHandler('SIGINT')
const sigusr2Handler = createSignalHandler('SIGUSR2')
const removeHandlers = () => {
  process
    .off('SIGTERM', sigtermHandler)
    .off('SIGINT', sigintHandler)
    .off('SIGUSR2', sigusr2Handler)
}
process
  .on('SIGTERM', sigtermHandler)
  .on('SIGINT', sigintHandler)
  .on('SIGUSR2', sigusr2Handler)
