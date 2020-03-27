const { run } = require('../../db')

module.exports = function updateFilepath ({ takeId, filepath }) {
  return run(
    `UPDATE takes
     SET filepath = ?
     WHERE id = ?`,
     filepath,
     takeId
  )
}
