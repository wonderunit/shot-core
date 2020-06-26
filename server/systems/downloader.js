const fs = require('fs-extra')
const os = require('os')
const path = require('path')
const { createMachine, interpret, assign } = require('xstate')
const got = require('got')
const { pipeline } = require('stream')
const { spawn, spawnSync } = require('child_process')

const debug = require('debug')('shotcore:downloader')

const { UPLOADS_PATH } = require('../config')
const { run, get } = require('../db')
const Take = require('../decorators/take')

const downloaderMachine = require('../machines/downloader')

const GOT_OPTIONS = {
  timeout: 3 * 1000
}

// find earliest, complete, not downloaded take
const getNextTake = projectId => {
  return get(`
    SELECT * from takes
    WHERE project_id = ?
    AND cut_at IS NOT NULL
    AND filepath IS NOT NULL
    AND downloaded = 0
    ORDER BY datetime(ready_at)
    LIMIT 1
    `,
    projectId
  )
}

const getTakeFilenames = take => {
  let { scene_number } = get(`SELECT scene_number from scenes WHERE id = ?`, take.scene_id)
  let { shot_number, impromptu } = get(`SELECT shot_number, impromptu from shots WHERE id = ?`, take.shot_id)

  let opts = {
    scene_number,
    shot_number,
    impromptu,
    take_number: take.take_number,
    id: take.id
  }

  return {
    filename: Take.filenameForFootage(opts),
    thumbnail: Take.filenameForThumbnail(opts),
    proxy: Take.filenameForProxy(opts)
  }
}

const onDownloadProgress = url => ({ percent, transferred, total }) =>
  process.stdout.write(
    `${path.basename(url)} ` +
    `${(percent * 100).toFixed().padStart(3)}% (${transferred} bytes of ${total})` + 
    '\r'
  )

const removeIfExistsSync = filepath => {
  if (fs.existsSync(filepath)) {
    debug(`deleting ${filepath}`)
    fs.removeSync(filepath)
  }
}

// preperatory callback services
const checkForTakes = (context, event) => (callback, onReceive) => {
  debug('checking for new takes …')

  let take = getNextTake(context.projectId)

  if (take) {
    debug('found take', take.id)
    callback({ type: 'NEXT', take })
  } else {
    debug('queue is empty.')
    callback('OFF')
  }
}

//
//
// steps (as callback services)
//
const prepareTakeForDownload = (context, event) => (callback, onReceive) => {
  debug('\n\n--- prepareTakeForDownload() ---\n')

  let { ZCAM_URL, take } = context

  let { filename, thumbnail, proxy } = getTakeFilenames(take)

  let uri = `${ZCAM_URL}${take.filepath}`
  let takesDir = path.join('projects', take.project_id.toString(), 'takes')

  fs.mkdirpSync(path.join(UPLOADS_PATH, takesDir))
  let tmpPath = fs.mkdtempSync(path.join(os.tmpdir(), 'shotcore-'))

  debug(`downloading take id:${take.id} …`)
  debug(`from:      ${uri}`)
  debug(`to:        ${UPLOADS_PATH}/${path.join(takesDir, filename)}`)
  debug(`thumb:     ${UPLOADS_PATH}/${path.join(takesDir, thumbnail)}`)
  debug(`proxy:     ${UPLOADS_PATH}/${path.join(takesDir, proxy)}`)
  debug(`tmpPath:    ${tmpPath}`)

  callback({
    type: 'SUCCESS',
    data: { UPLOADS_PATH, takesDir, thumbnail, filename, proxy, tmpPath }
  })
}

const getInfo = (context, event) => (callback, onReceive) => {
  debug('\n\n--- getInfo() ---\n')

  let complete = false

  let { ZCAM_URL, take } = context
  let uri = `${ZCAM_URL}${take.filepath}?act=info`

  debug(`GET ${uri}`)

  let req = got(
    uri,
    GOT_OPTIONS
  )

  req.then(res => {
    let payload = JSON.parse(res.body)

    let { vts, vcnt, dur } = payload

    debug('timescale:', vts)
    debug('number of frames:', vcnt)
    debug('duration:', dur)

    complete = true

    callback({ type: 'SUCCESS', data: { info: { vts, vcnt, dur } } })
  })
  .catch(err =>
    callback({ type: 'ERROR', error: err })
  )

  return () => {
    if (complete == false) {
      debug('getInfo was interrupted')
      req.cancel()
    }
  }
}

const getContentLength = (context, event) => (callback, onReceive) => {
  debug('\n\n--- getContentLength() ---\n')

  let complete = false

  let { ZCAM_URL, take } = context
  let uri = `${ZCAM_URL}${take.filepath}`

  debug(`HEAD ${uri}`)

  let readable = got
    .stream(uri, {
      method: 'HEAD',
      ...GOT_OPTIONS
    })
    .on('error', err => {
      // ignore parse error
      if (err.code === 'HPE_INVALID_CONSTANT') {
        // debug('ignoring parse error', err.code)
      } else {
        callback({ type: 'ERROR', error: err })
      }
    })
    .on('response', response => {
      complete = true

      let contentLength = parseInt(response.headers['content-length'])
      debug('content-length:', contentLength)

      callback({ type: 'SUCCESS', data: { contentLength } })
    })

  return () => {
    if (complete == false) {
      debug('getContentLength was interrupted')
      readable.destroy()
    }
  }
}

const getThumbnail = (context, event) => (callback, onReceive) => {
  debug('\n\n--- getThumbnail() ---\n')

  let complete = false

  let { ZCAM_URL, take } = context
  let { tmpPath, thumbnail } = context.data

  let uri = `${ZCAM_URL}${take.filepath}?act=scr`
  let dst = `${tmpPath}/${thumbnail}`

  debug(`GET ${uri}`)
  debug(`to: ${dst}`)

  let req = got(
    uri,
    {
      responseType: 'buffer',
      ...GOT_OPTIONS
    }
  )

  req.then(res => {
    debug('thumbnail content-length', res.headers['content-length'])
    fs.writeFileSync(dst, res.body)
    complete = true
    callback({ type: 'SUCCESS', data: { thumbnail: dst } })
  })
  .catch(err =>
    callback({ type: 'ERROR', error: err })
  )

  return () => {
    if (complete == false) {
      debug('getThumbnail was interrupted')
      req.cancel()

      debug(`removing incomplete file ${dst}`)
      fs.removeSync(dst)
    }
  }
}

const getFile = (context, event) => (callback, onReceive) => {
  debug('\n\n--- getFile() ---\n')

  let complete = false

  let { ZCAM_URL, take } = context
  let { tmpPath, filename } = context.data

  let uri = `${ZCAM_URL}${take.filepath}`
  let dst = `${tmpPath}/${filename}`

  debug(`GET ${uri}`)
  debug(`to: ${dst}`)

  let readable = got
    .stream(uri)
    // TODO why does downloadProgress still run a couple times after pipeline is destroyed?
    .on('downloadProgress', onDownloadProgress(uri))
  let writable = fs.createWriteStream(dst)
  let p = pipeline(
    readable,
    writable,
    err => {
      if (err) {
        callback({ type: 'ERROR', error: err })
      } else {
        complete = true
        callback('SUCCESS')
      }
    }
  )

  return () => {
    if (complete == false) {
      debug('getFile download was interrupted')

      // stop in-progress download stream
      // HACK pause/end to avoid ERR_STREAM_PREMATURE_CLOSE throw on pipeline .destroy
      readable.pause()
      writable.end()
      p.destroy()

      debug(`removing incomplete file ${dst}`)
      fs.removeSync(dst)
    }
  }
}

const verifyFileSize = (context, event) => (callback, onReceive) => {
  debug('\n\n--- verifyFileSize() ---\n')

  let { tmpPath, filename } = context.data
  let dst = `${tmpPath}/${filename}`

  let expected = context.data.contentLength
  let { size } = fs.statSync(dst)

  if (expected !== size) {
    callback({
      type: 'ERROR',
      error: new Error(`File size mismatch for ${dst}. Expected ${expected} but got ${size}`)
    })
  }

  callback('SUCCESS')
}

const verifyFrameCount = (context, event) => (callback, onReceive) => {
  debug('\n\n--- verifyFrameCount() ---\n')

  let { tmpPath, filename, info } = context.data
  let dst = `${tmpPath}/${filename}`

  let { stdout, error } = spawnSync(
    'ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=nb_frames',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      dst
    ]
  )
  if (error) {
    return callback({
      type: 'ERROR',
      error
    })
  }

  let expected = info.vcnt
  let actual = parseFloat(stdout.toString())

  // accept within +/- 2 frames
  if (Math.abs(expected - actual) <= 2) {
    callback('SUCCESS')
  } else {
    callback({
      type: 'ERROR',
      error: new Error(
        `Frame count mismatch. Expected ${expected} but got ${actual}`
      )
    })
  }
}

const getMetadata = (context, event) => (callback, onReceive) => {
  debug('\n\n--- getMetadata() ---\n')

  let { tmpPath, filename } = context.data
  let dst = `${tmpPath}/${filename}`

  let { stdout, error } = spawnSync(
    'ffprobe', [
      '-hide_banner',
      '-loglevel', 'fatal',
      '-show_format',
      '-show_streams',
      '-print_format', 'json',
      dst
    ]
  )
  if (error) {
    return callback({
      type: 'ERROR',
      error
    })
  }

  let metadata = {
    info: JSON.parse(stdout.toString())
  }

  delete metadata.info.format.filename

  // debug(JSON.stringify(metadata, null, 2))

  callback({ type: 'SUCCESS', data: { metadata } })
}

const extractProxy = (context, event) => (callback, onReceive) => {
  debug('\n\n--- extractProxy() ---\n')

  let complete = false

  let { tmpPath, filename, proxy } = context.data

  let src = `${tmpPath}/${filename}`
  let dst = `${tmpPath}/${proxy}`

  debug(`extracting from ${src} to ${dst}`)

  let child = spawn(
    'ffmpeg', [
      '-loglevel', 'fatal',
      // input
      '-i', src,
      // stream copy
      '-c', 'copy',
      // proxy
      '-map', '0:1',
      // audio
      '-map', '0:2',
      // timecode
      '-map', '0:3',
      // metadata
      '-movflags', 'use_metadata_tags',
      // never overwrite
      '-n',
      // output
      dst
    ]
  )

  child.stdout.on('data', data => debug(data.toString()))

  child.stderr.on('data', data => console.error(data.toString()))

  child.on('error', (err) => {
    complete = true
    callback({ type: 'ERROR', error: err })
  })

  child.on('close', (code, signal) => {
    if (complete) return

    complete = true
    if (signal || code !== 0) {
      debug('close', { code, signal })
      if (signal) {
        callback({ type: 'ERROR', error: new Error(`exited via signal ${signal}`) })
      } else {
        callback({ type: 'ERROR', error: new Error(`exited with code ${code}`) })
      }
    } else {
      callback('SUCCESS')
    }
  })

  return () => {
    if (complete == false) {
      debug('interrupted. terminating early …')
      child.kill()
    }
  }
}

// copyFilesAndMarkComplete
// NOTE: “When a copy operation is in progress, there is no way to cleanly cancel it.”
// via https://github.com/jprichardson/node-fs-extra/issues/773#issuecomment-602592251
const copyFilesAndMarkComplete = (context, event) => (callback, onReceive) => {
  debug('\n\n--- copyFilesAndMarkComplete() ---\n')

  let complete = false

  let { take } = context
  let { UPLOADS_PATH, takesDir, filename, thumbnail, proxy, tmpPath, metadata } = context.data

  let files = {
    filename: {
      src: `${tmpPath}/${filename}`,
      dst: path.join(UPLOADS_PATH, takesDir, filename)
    },
    thumbnail: {
      src: `${tmpPath}/${thumbnail}`,
      dst: path.join(UPLOADS_PATH, takesDir, thumbnail)
    },
    proxy: {
      src: `${tmpPath}/${proxy}`,
      dst: path.join(UPLOADS_PATH, takesDir, proxy)
    }
  }

  // copy individual files from tmp to UPLOADS_PATH
  let opt = {
    overwrite: false,
    errorOnExist: true,
    preserveTimestamps: true
  }
  debug(`copying ${files.filename.src} to ${files.filename.dst}`)
  fs.copySync(files.filename.src, files.filename.dst, opt)

  debug(`copying ${files.thumbnail.src} to ${files.thumbnail.dst}`)
  fs.copySync(files.thumbnail.src, files.thumbnail.dst, opt)

  debug(`copying ${files.proxy.src} to ${files.proxy.dst}`)
  fs.copySync(files.proxy.src, files.proxy.dst, opt)

  // mark take complete in database
  debug('marking take downloaded in database')
  run(
    `UPDATE takes
    SET
      downloaded = 1,
      metadata_json = ?
    WHERE id = ?`,
    JSON.stringify(metadata),
    take.id
  )

  complete = true
  callback('SUCCESS')

  return () => {
    if (complete == false) {
      debug('copyFilesAndMarkComplete was interrupted')

      destroyTakeFiles()
    }
  }
}

const destroyTakeFiles = (context, event) => (callback, onReceive) => {
  debug('\n\n--- destroyTakeFiles() ---\n')

  let { UPLOADS_PATH, takesDir, filename, thumbnail, proxy } = context.data

  removeIfExistsSync(path.join(UPLOADS_PATH, takesDir, filename))
  removeIfExistsSync(path.join(UPLOADS_PATH, takesDir, thumbnail))
  removeIfExistsSync(path.join(UPLOADS_PATH, takesDir, proxy))

  callback('SUCCESS')
}

const destroyTempDirectory = (context, event) => (callback, onReceive) => {
  debug('\n\n--- destroyTempDirectory() ---\n')

  let complete = false

  let { tmpPath } = context.data
  removeIfExistsSync(tmpPath)

  complete = true
  callback('SUCCESS')

  return () => {
    if (complete == false) {
      debug('destroyTempDirectory was interrupted')
    }
  }
}



let downloaderService

function init ({ ZCAM_URL, projectId }) {
  downloaderService = interpret(
    createMachine(
      downloaderMachine,
      {
        context: {
          take: null,
          data: {}
        },
        services: {
          checkForTakes,

          prepareTakeForDownload,
          getInfo,
          getContentLength,
          getThumbnail,
          getFile,
          verifyFileSize,
          verifyFrameCount,
          getMetadata,
          extractProxy,
          // createSlate,
          // createSlatedProxy,
          copyFilesAndMarkComplete,

          destroyTakeFiles,
          destroyTempDirectory
        },
        actions: {
          setTake: assign({ take: (context, event) => event.take }),
          clearTake: assign({ take: (context, event) => null }),

          setData: assign({
            data: (context, event) => {
              return {
                ...context.data,
                ...event.data
              }
            }
          }),
          clearData: assign({ data: {} }),

          markStepsInProgress: assign({
            stepsInProgress: (context, event) => true
          }),
          markStepsComplete: assign({
            stepsInProgress: (context, event) => false
          })
        },
        guards: {
          stepsInProgress: (context, event, { cond }) => {
            return context.stepsInProgress
          }
        }
      }
    )
    .withContext({
      ZCAM_URL,
      projectId
    })
  )
  .onTransition(event => debug(
    '->', event.value,
    event.context.take ? `take:${event.context.take.id}` : ''
  ))
}

async function start () {
  downloaderService.start()
  return true
}

async function stop () {
  // switch off, to run cleanup services (if necessary)
  downloaderService.send('OFF')
  // stop the service
  downloaderService.stop()
  return true
}

function send (event) {
  downloaderService.send(event)
}

module.exports = {
  init,
  start,
  stop,
  send
}
