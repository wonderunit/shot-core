const { all } = require('../db')

exports.index = (req, res) => {
  let projects = all('SELECT * FROM projects')
  res.render('index', { projects })
}
