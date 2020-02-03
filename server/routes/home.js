const { all } = require('../db')

exports.index = async (req, res) => {
  let projects = await all('SELECT * FROM projects')
  res.render('index', { projects })
}
