const { run } = require('../../db')

module.exports = function updateFilepath ({ takeId, filepath }) {
  console.log(`updating take id:${takeId} filepath = ${filepath}`)
  return run(
    `UPDATE takes
     SET filepath = ?
     WHERE id = ?`,
     filepath,
     takeId
  )
}
