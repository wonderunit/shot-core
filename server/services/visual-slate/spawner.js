const spawnCmd = require('./spawnCmd')

const spawner = (filename, args) => new Promise(
  (resolve, reject) => spawnCmd([filename, args], ({ code }) => {
    if (code === 0) {
      resolve({ code })
    } else {
      reject({ code })
    }
  })
)

module.exports = spawner
