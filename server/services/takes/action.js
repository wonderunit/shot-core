const { run } = require('../../db')

module.exports = function action ({ takeId, at }) {
  run(
    `UPDATE takes
     SET action_at = ?
     WHERE id = ?`,
     at,
     takeId
  )
}
