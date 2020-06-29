// NODE_ENV=test DEBUG=shotcore:* node test/downloader.test.js

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
//   downloader.stop()
// }, 500)

// via:
//   https://github.com/jtlapp/node-cleanup/blob/d278360/node-cleanup.js
//   https://stackoverflow.com/a/60273973
//   https://blog.heroku.com/best-practices-nodejs-errors
//   https://help.heroku.com/D5GK0FHU/how-can-my-node-app-gracefully-shutdown-when-receiving-sigterm
const createSignalHandler = signal => {
  return async (err) => {
    removeHandlers()
    console.log('\n')
    console.log(`Shutting down via ${signal} …`)

    downloader.stop()

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
  // via https://github.com/remy/nodemon#controlling-shutdown-of-your-script
  .on('SIGUSR2', sigusr2Handler)
