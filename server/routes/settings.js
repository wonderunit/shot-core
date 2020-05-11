const { get } = require('../db')

const select = () => get(
  `SELECT
    zcam_wired_ip,
    zcam_wireless_ip,
    uploads_path,
    active_project_id
  FROM settings
  LIMIT 1`)

const insert = select

exports.index = (req, res) => {
  const settings = select()

  res.render('settings', {
    ...settings,
    default_uploads_path: require('../config').UPLOADS_PATH
  })
}

exports.update = (req, res) => {
  const settings = insert()

  res.render('settings', {
    flash: 'Saved.',
    ...settings,
    default_uploads_path: require('../config').UPLOADS_PATH
  })
}
