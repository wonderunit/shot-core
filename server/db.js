const path = require('path')
const Database = require('better-sqlite3')

const debug = require('debug')('shotcore:db')

let filepath = process.env.NODE_ENV == 'test'
  ? path.join(__dirname, '../test.sqlite3')
  : path.join(__dirname, '../dev.sqlite3')

const db = new Database(filepath/*, { verbose: debug }*/)

function run (string, ...bindParameters) {
  return db.prepare(string).run(...bindParameters)
}

function get (string, ...bindParameters) {
  return db.prepare(string).get(...bindParameters)
}

function all (string, ...bindParameters) {
  return db.prepare(string).all(...bindParameters)
}

module.exports = {
  run,
  get,
  all
}
