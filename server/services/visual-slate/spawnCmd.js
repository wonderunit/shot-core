const { spawn } = require('child_process')

const debug = require('debug')('shotcore:ffmpeg')

function spawnCmd (args, callback) {
  const cmd = spawn(...args)

  cmd.stdout.on('data', data => {
    debug(`stdout: ${data}`)
  })
  cmd.stderr.on('data', data => {
    debug(`stderr: ${data}`)
  })
  cmd.on('close', code => {
    debug(`close: child process exited with code ${code}`)
    callback({ code })
  })
  cmd.on('error', err => {
    debug('error', err)
    console.error('error', err)
  })
  cmd.on('exit', (code, signal) => {
    debug('exit:', code, signal)
  })
}

module.exports = spawnCmd
