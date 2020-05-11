const { get, run } = require('../db')

let ALLOWED = [
  'zcam_wired_ip',
  'zcam_wireless_ip',
  'uploads_path',
  'active_project_id'
]

const select = () => get(
  `SELECT ${ALLOWED.join(',')}
  FROM settings
  LIMIT 1`)

exports.index = (req, res) => {
  const settings = select()

  res.render('settings', {
    ...settings,
    default_uploads_path: require('../config').UPLOADS_PATH
  })
}

exports.update = (req, res) => {
  const before = select()

  let changed = {}
  for (let key of ALLOWED) {
    if (req.body[key] != null) {
      let value = req.body[key] == '' ? null : req.body[key]
      if (value != before[key]) {
        changed[key] = [value, before[key]]
      }
    }
  }

  for (let [key, [value, prev]] of Object.entries(changed)) {
    run(`UPDATE settings SET ${key} = ?`, value)
  }

  let changelog = Object.entries(changed).map(([key, [value, prev]]) => `${key} changed from ${prev} to ${value}`)
  changelog = changelog.join('<br />\n')

  const after = select()

  res.render('settings', {
    flash: `Saved.<br /><small>` + changelog + '</small>',
    ...after,
    default_uploads_path: require('../config').UPLOADS_PATH
  })
}
