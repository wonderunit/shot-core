const { run } = require('../../db')

module.exports = function cut ({ takeId, at }) {
  run(
    `UPDATE takes
     SET cut_at = ?
     WHERE id = ?`,
    at,
    takeId
  )
}
