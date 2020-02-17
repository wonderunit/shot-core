const AdmZip = require('adm-zip')
const fs = require('fs-extra')
const os = require('os')
const path = require('path')

const { run } = require('../db')
const { insertProject, importScene, importScript } = require('../importers')

const { UPLOADS_PATH } = require('../config')

const readJson = (...rest) => JSON.parse(fs.readFileSync(...rest))

module.exports = function ({ pathToZip }) {
  let tmpPathPrefix = path.join(os.tmpdir(), 'storyboarder-')
  let folder = fs.mkdtempSync(tmpPathPrefix)

  let zip = new AdmZip(pathToZip)

  zip.extractAllTo(folder)

  let scriptFilename = fs.readdirSync(folder).find(
    filename => filename.toLowerCase().endsWith('.fountain')
  )
  if (scriptFilename) {
    let scriptPath = path.join(folder, scriptFilename)
    let name = path.basename(scriptPath, '.fountain')
    let projectId = run(...insertProject({ name })).lastInsertRowid
    let pathToFountainFile = `projects/${projectId}/${scriptFilename}`
    run(
      'UPDATE projects SET script_path = ? WHERE id = ?',
      pathToFountainFile,
      projectId
    )

    importScript(run, {
      projectId,
      script: fs.readFileSync(scriptPath, 'utf-8'),
      scriptPath,
      pathToFountainFile
    })

    let uploadsPath = path.join(UPLOADS_PATH, path.dirname(pathToFountainFile))
    fs.mkdirpSync(uploadsPath)
    fs.copySync(
      folder,
      uploadsPath,
      { preserveTimestamps: true, overwrite: false }
    )

    return {
      uri: `/projects/${projectId}`
    }
  } else {
    let storyboarderFile = fs.readdirSync(folder).find(filename => filename.toLowerCase().endsWith('.storyboarder'))

    if (storyboarderFile) {
      // let storyboarderPath = path.join(folder, storyboarderFile)
      // let projectId = run(...insertProject({ name })).lastInsertRowid
      // importScene(run, {
      //   scene: readJson(storyboarderPath),
      //   storyboarderPath: '', // e.g.: 'scenes/${sceneId}/example.storyboarder',
      //   projectId
      // })
      return new Error('Not implemented yet. Try a script-based project.')
    } else {
      return new Error('Invalid ZIP. No .fountain or .storyboarder files found.')
    }
  }
}
