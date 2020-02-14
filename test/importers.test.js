/*

TO TEST:
rm test.sqlite3; sqlite3 test.sqlite3 < db/schema.sql
node test/importers.test.js

*/

process.env.NODE_ENV = 'test'

const fs = require('fs')

const { run } = require('../server/db')
const { insertProject, importScene, importScript } = require('../server/importers')

const readJson = (...rest) => JSON.parse(fs.readFileSync(...rest))

try {
  let projectId = run(...insertProject({
    name: 'example'
  })).lastInsertRowid
  console.log(
    importScene(run, {
      scene: readJson('./test/fixtures/scenes/example/example.storyboarder'),
      storyboarderPath: 'uploads/scenes/example/example.storyboarder',
      projectId
    })
  )
  // let projectId = run(...insertProject({
  //   name: path.basename(storyboarderPath, '.storyboarder')
  // })).lastInsertRowid
  // console.log(
  //   importScene(run, {
  //     scene: readJson('./test/fixtures/projects/multi-scene/storyboards/Scene-1-EXT-A-PLACE-DAY-1-ZX3ZM/Scene-1-EXT-A-PLACE-DAY-1-ZX3ZM.storyboarder'),
  //     storyboarderPath: 'uploads/projects/multi-scene/storyboards/Scene-1-EXT-A-PLACE-DAY-1-ZX3ZM/Scene-1-EXT-A-PLACE-DAY-1-ZX3ZM.storyboarder'
  //   })
  // )

  console.log(
    importScript(run, {
      script: fs.readFileSync('./test/fixtures/projects/multi-scene/multi-scene.fountain', 'utf-8'),
      scriptPath: './test/fixtures/projects/multi-scene/multi-scene.fountain',
      pathToFountainFile: 'uploads/projects/multi-scene/multi-scene.fountain'
    })
  )
} catch (err) {
  console.error(err)
}
