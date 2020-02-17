const fs = require('fs-extra')

const { UPLOADS_PATH } = require('../config')
const { run, get, all } = require('../db')

module.exports = function projectDestroyer ({ projectId }) {
  let project = get('SELECT * FROM projects WHERE id = ?', projectId)

  let scenes = all('SELECT * from scenes WHERE project_id = ?', projectId)
  let shots = all('SELECT * from shots WHERE project_id = ?', projectId)
  let schedules = all('SELECT * from schedules WHERE project_id = ?', projectId)
  let events = all('SELECT * from events WHERE project_id = ?', projectId)
  let takes = all('SELECT * from takes WHERE project_id = ?', projectId)

  let tables = {
    scenes, shots, schedules, events, takes
  }

  for (let [table, rows] of Object.entries(tables)) {
    for (let row of rows) {
      run(`DELETE FROM ${table} WHERE id = ?`, row.id)
    }
  }

  console.log('[projectDestroyer]: deleting project id:%s from database', projectId)
  run('DELETE FROM projects WHERE id = ?', projectId)

  if (project.script_path) {
    let filesPath = `${UPLOADS_PATH}/projects/${project.id}`
    console.log('[projectDestroyer]: rm -rf', filesPath)
    fs.removeSync(filesPath)
  }
}
