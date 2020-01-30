const fs = require('fs')
const sqlite3 = require('sqlite3').verbose()
const { promisified } = require('../lib/promisify-sqlite3')

const { importScene } = require('../server/importers')

const db = new sqlite3.Database('./test.sqlite3')
const { run } = promisified(db)

const readJson = (...rest) => JSON.parse(fs.readFileSync(...rest))

;(async () => {
  try {
    console.log(
      await importScene(run, {
        scene: readJson('./test/fixtures/scenes/example/example.storyboarder'),
        pathToStoryboarderFile: 'uploads/scenes/example/example.storyboarder'
      })
    )
    console.log(
      await importScene(run, {
        scene: readJson('./test/fixtures/projects/multi-scene/storyboards/Scene-1-EXT-A-PLACE-DAY-1-ZX3ZM/Scene-1-EXT-A-PLACE-DAY-1-ZX3ZM.storyboarder'),
        pathToStoryboarderFile: 'uploads/projects/multi-scene/storyboards/Scene-1-EXT-A-PLACE-DAY-1-ZX3ZM/Scene-1-EXT-A-PLACE-DAY-1-ZX3ZM.storyboarder'
      })
    )

    // importScript(run, './test/fixtures/projects/multi-scene/multi-scene.fountain')
  } catch (err) {
    console.error(err)
  }
})()
