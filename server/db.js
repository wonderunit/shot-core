const sqlite3 = require('sqlite3').verbose()
const { promisified } = require('../lib/promisify-sqlite3')

const db = new sqlite3.Database('./dev.sqlite3')
const { get, all } = promisified(db)

module.exports = {
  get,
  all
}
