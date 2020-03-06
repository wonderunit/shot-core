const t = require('tap')
const fs = require('fs')

const getScenesFromFilesystem = require('../lib/getScenesFromFilesystem')

const scriptPath = `${__dirname}/fixtures/multi-scene/multi-scene.fountain`
const script = fs.readFileSync(scriptPath, 'utf-8')

t.test('can get scenes from the filesystem of a multi-scene project', t => {
  let scenes = getScenesFromFilesystem({ script, scriptPath })
  t.equal(
    scenes[0].storyboarderPath,
    'storyboards/Scene-1-EXT-A-PLACE-DAY-1-ZX3ZM/Scene-1-EXT-A-PLACE-DAY-1-ZX3ZM.storyboarder',
  )
  t.equal(
    scenes[0].scriptData.description,
    'Outside Place'
  )
  t.end()
})
