const { get, all } = require('../db')

exports.new = (req, res) => {
  res.render('project/new')
}

exports.create = (req, res) => {
  res.send({
    ok: true,
    name: req.body.name,
    file: req.body.file
  })
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
