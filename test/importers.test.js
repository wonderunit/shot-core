/*

TO TEST:
rm test.sqlite3; sqlite3 test.sqlite3 < db/schema.sql
node test/importers.test.js

*/

process.env.NODE_ENV = 'test'

const fs = require('fs-extra')
const path = require('path')

const { run } = require('../server/db')
const { insertProject, importScene, importScript } = require('../server/importers')

const readJson = (...rest) => JSON.parse(fs.readFileSync(...rest))

try {
  let sceneProjectId = run(...insertProject({ name: 'example' })).lastInsertRowid
  console.log(
    importScene(run, {
      scene: readJson('./test/fixtures/scenes/example/example.storyboarder'),
      storyboarderPath: 'uploads/scenes/example/example.storyboarder',
      projectId: sceneProjectId
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

  let scriptPath = './test/fixtures/projects/multi-scene/multi-scene.fountain'
  let name = path.basename(scriptPath, '.fountain')
  let scriptProjectId = run(...insertProject({ name, scriptPath })).lastInsertRowid
  console.log(
    importScript(run, {
      projectId: scriptProjectId,
      script: fs.readFileSync(scriptPath, 'utf-8'),
      scriptPath: scriptPath,
      pathToFountainFile: 'uploads/projects/multi-scene/multi-scene.fountain'
    })
  )
} catch (err) {
  console.error(err)
}
