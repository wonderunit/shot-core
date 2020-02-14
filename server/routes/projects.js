const path = require('path')
const os = require('os')
const fs = require('fs-extra')
const AdmZip = require('adm-zip')
const multiparty = require('multiparty')

const { run, get, all } = require('../db')
const { insertProject, importScene, importScript } = require('../importers')

const UPLOADS_PATH = path.join(__dirname, '../../public/uploads')

const readJson = (...rest) => JSON.parse(fs.readFileSync(...rest))

exports.new = (req, res) => {
  res.render('project/new')
}

exports.create = (req, res, next) => {
  let form = new multiparty.Form()
  form.parse(req, function (err, fields, files) {
    if (err) {
      next(err)
      return
    }

    let [name] = fields.name // project name
    let [file] = files.file // first attached file

    if (!name) {
      next(new Error('Missing name'))
      return
    }

    if (!file || file.size == 0) {
      next(new Error('Missing or invalid ZIP file'))
      return
    }

    try {
      let zip = new AdmZip(file.path)

      let tmpPathPrefix = path.join(os.tmpdir(), 'storyboarder-')

      let folder = fs.mkdtempSync(tmpPathPrefix)

      zip.extractAllTo(folder)

      let scriptFilename = fs.readdirSync(folder).find(
        filename => filename.toLowerCase().endsWith('.fountain')
      )
      if (scriptFilename) {
        let scriptPath = path.join(folder, scriptFilename)
        let name = path.basename(scriptPath, '.fountain')
        let projectId = run(...insertProject({ name, scriptPath })).lastInsertRowid
        let pathToFountainFile = `projects/${projectId}/${scriptFilename}`

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

        res.redirect(`/projects/${projectId}`)
        return
      } else {
        let storyboarderFile = fs.readdirSync(folder).find(filename => filename.toLowerCase().endsWith('.storyboarder'))

        if (storyboarderFile) {
          next(new Error('Not implemented yet. Try a script-based project.'))
          return
        } else {
          next(new Error('Invalid ZIP. No .fountain or .storyboarder files found.'))
          return
        }
      }
    } catch (err) {
      next(err)
      return
    }
  })
  return
}

exports.show = (req, res) => {
  let { projectId } = req.params

  let project = get('SELECT * FROM projects WHERE id = ?', projectId)

  let scenes = all('SELECT * FROM scenes WHERE project_id = ?', projectId)

  let shots = all('SELECT * FROM shots WHERE project_id = ?', projectId)
  shots.forEach(shot => (shot.boards_json = JSON.parse(shot.boards_json)))

  let events = all(`select start_at, date(start_at, 'localtime') as day from events group by day`)
  events.forEach(event => (event.start_at = new Date(event.start_at)))

  res.render('project', { project, scenes, shots, events })
}
