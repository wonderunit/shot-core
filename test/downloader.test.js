// NODE_ENV=test DEBUG=shotcore:* nodemon test/downloader.test.js

const { run, get } = require('../server/db')

const downloader = require('../server/systems/downloader')
const visualSlateRenderer = require('../server/systems/visual-slate/renderer')

const importer = require('../server/services/importer')
const createTake = require('../server/services/takes/create')
const actionTake = require('../server/services/takes/action')
const cutTake = require('../server/services/takes/cut')
const updateFilepath = require('../server/services/takes/update-filepath')

if (process.env.NODE_ENV !== 'test') throw new Error('Not running in test mode')

run('DELETE FROM events')
run('DELETE FROM projects')
run('DELETE FROM scenes')
run('DELETE FROM settings')
run('DELETE FROM shots')
run('DELETE FROM takes')
run('DELETE FROM sqlite_sequence')

importer({ pathToZip: `${__dirname}/../tmp/multi-scene.zip` })

// TODO state machine for the take
let takeId = createTake({
  projectId: 1,
  sceneId: 1,
  shotId: 1,
  at: new Date().toISOString()
})
actionTake({
  takeId,
  at: new Date().toISOString()
})
cutTake({
  takeId,
  at: new Date().toISOString()
})
updateFilepath({
  takeId,
  filepath: '/DCIM/110ZCAME/ZCAM0099_0000_201811121522.MOV'
})

visualSlateRenderer.start()

downloader.init({
  ZCAM_URL: 'http://localhost',
  projectId: 1
})
downloader.start()
downloader.send('ON')

// wait for a bit, then cancel (during info download) for testing
// setTimeout(() => {
//   downloader.send('OFF')
// }, 500)
