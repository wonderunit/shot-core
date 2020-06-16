const { run, get, all } = require('../db')

const { ZCAM_URL } = require('../config')
const Take = require('../decorators/take')

exports.index = (req, res) => {
  let takes = all(`SELECT * from takes ORDER BY project_id, downloaded`)
  res.render('status', {
    takes: Take.decorateCollection(takes),
    ZCAM_URL
  })
}
