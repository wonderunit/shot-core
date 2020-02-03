/*

TO TEST:
rm test.sqlite3; sqlite3 test.sqlite3 < db/schema.sql
node test/importers.test.js

*/

const fs = require('fs')
const path = require('path')
const sqlite3 = require('sqlite3').verbose()
const { promisified } = require('../lib/promisify-sqlite3')

const { insertProject, importScene, importScript } = require('../server/importers')

const db = new sqlite3.Database('./test.sqlite3')
const { run } = promisified(db)

const readJson = (...rest) => JSON.parse(fs.readFileSync(...rest))

;(async () => {
  try {
    let projectId = (await run(...insertProject({
      name: 'example'
    }))).lastID
    console.log(
      await importScene(run, {
        scene: readJson('./test/fixtures/scenes/example/example.storyboarder'),
        storyboarderPath: 'uploads/scenes/example/example.storyboarder',
        projectId
      })
    )
    // let projectId = (await run(...insertProject({
    //   name: path.basename(storyboarderPath, '.storyboarder')
    // }))).lastID
    // console.log(
    //   await importScene(run, {
    //     scene: readJson('./test/fixtures/projects/multi-scene/storyboards/Scene-1-EXT-A-PLACE-DAY-1-ZX3ZM/Scene-1-EXT-A-PLACE-DAY-1-ZX3ZM.storyboarder'),
    //     storyboarderPath: 'uploads/projects/multi-scene/storyboards/Scene-1-EXT-A-PLACE-DAY-1-ZX3ZM/Scene-1-EXT-A-PLACE-DAY-1-ZX3ZM.storyboarder'
    //   })
    // )

    console.log(
      await importScript(run, {
        script: fs.readFileSync('./test/fixtures/projects/multi-scene/multi-scene.fountain', 'utf-8'),
        scriptPath: './test/fixtures/projects/multi-scene/multi-scene.fountain',
        pathToFountainFile: 'uploads/projects/multi-scene/multi-scene.fountain'
      })
    )
  } catch (err) {
    console.error(err)
  }
})()
