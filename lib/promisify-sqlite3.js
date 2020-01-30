const promisifyRun = fn => (...rest) => new Promise((resolve, reject) =>
  fn(...rest, function (err) {
    return err
      ? reject(err)
      : resolve(this)
  })
)

const promisifyGet = fn => (...rest) => new Promise((resolve, reject) =>
  fn(...rest, function (err, row) {
    return err
      ? reject(err)
      : resolve(row)
  })
)

const promisifyAll = fn => (...rest) => new Promise((resolve, reject) =>
  fn(...rest, function (err, rows) {
    return err
      ? reject(err)
      : resolve(rows)
  })
)

const promisified = db => ({
  run: promisifyRun(db.run.bind(db)),
  get: promisifyGet(db.get.bind(db)),
  all: promisifyAll(db.all.bind(db))
})

module.exports = {
  promisified
}
