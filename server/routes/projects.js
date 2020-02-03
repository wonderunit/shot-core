const { get, all } = require('../db')

exports.view = async (req, res) => {
  let { projectId } = req.params

  let project = await get('SELECT * FROM projects WHERE id = ?', projectId)

  let scenes = await all('SELECT * FROM scenes WHERE project_id = ?', projectId)

  let shots = await all('SELECT * FROM shots WHERE project_id = ?', projectId)
  shots.forEach(shot => (shot.boards_json = JSON.parse(shot.boards_json)))

  let events = (await all(`select start_at, date(start_at, 'localtime') as day from events group by day`))
  events.forEach(event => (event.start_at = new Date(event.start_at)))

  res.render('project', { project, scenes, shots, events })
}
