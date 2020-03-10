const t = require('tap')
const path = require('path')
const mock = require('mock-fs')
const fs = require('fs-extra')

const projectDestroyer = require('../server/services/project-destroyer')
const importer = require('../server/services/importer')

const { UPLOADS_PATH } = require('../server/config')
const FIXTURES_PATH = path.join(__dirname, 'fixtures')

mock({
  [UPLOADS_PATH]: {
    'projects': {}
  },
  [FIXTURES_PATH]: {
    'zip': {
      'multi-scene.zip': fs.readFileSync(path.join(__dirname, '../tmp/multi-scene.zip'))
    }
  }
})
let { uri: redirectUri } = importer({
  pathToZip: path.resolve(path.join(FIXTURES_PATH, 'zip/multi-scene.zip'))
})
let projectId = Number(redirectUri.match(/\d+$/)[0])

t.test('can destroy a script-based project', t => {
  // source exists
  t.equal(true, fs.existsSync(path.join(UPLOADS_PATH, redirectUri)))
  t.equal(2, fs.readdirSync(path.join(UPLOADS_PATH, redirectUri)).length)

  // run the destroyer
  projectDestroyer({ projectId })

  // source does not exist
  t.equal(false, fs.existsSync(path.join(UPLOADS_PATH, redirectUri)))

  t.end()
})

t.teardown(() => {
  mock.restore()
})
