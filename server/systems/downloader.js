// TODO if take download keeps erroring out, only retry n times, then mark unprocessable
const CAF = require('caf')
const fs = require('fs-extra')
const got = require('got')
const path = require('path')
const { pipeline } = require('stream')
const { createMachine, interpret, assign } = require('xstate')

const debug = require('debug')('shotcore:downloader')

const { UPLOADS_PATH } = require('../config')
const { run, get } = require('../db')
const { createProxyWithVisualSlate } = require('../systems/visual-slate')
const Take = require('../decorators/take')

const { spawnSync } = require('child_process')

const downloader = require('../machines/downloader')

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
    `${(percent * 100).toFixed().padStart(3)}% (${transferred} bytes)` + 
    '\r'
  )

const download = (src, dst, signal) => {
  return new Promise((resolve, reject) => {
    let readable = got
      .stream(src)
      .on('downloadProgress', onDownloadProgress(src))
    let writable = fs.createWriteStream(dst)

    signal.pr.catch(event => {
      if (readable) {
        debug('abort', src, dst)
        readable.destroy()
        writable.destroy()
        reject(event)
      }
      readable = writable = null
    })

    pipeline(
      readable,
      writable,
      err => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
        readable = writeable = null
      }
    )
  })
}

const clean = filepath => () => {
  try {
    if (fs.existsSync(filepath)) {
      debug('unlinking', filepath)
      fs.unlinkSync(filepath)
    }
  } catch (err) {
    console.error('clean() failed with error')
    console.error(err)
  }
}

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

const downloadAndProcessTakeFiles = (context, event) => (callback, onReceive) => {
  debug('downloadAndProcessTakeFiles()')

  let { ZCAM_URL, take, projectId } = context
  let cleanup = {}
  let success = false

  let uri = `${ZCAM_URL}${take.filepath}`
  let takesDir = path.join('projects', projectId.toString(), 'takes')

  let { filename, thumbnail, proxy } = getTakeFilenames(take)

  debug(`downloading take id:${take.id} …`)
  debug(`from:   ${uri}`)
  debug(`to:     public/uploads/${path.join(takesDir, filename)}`)
  debug(`thumb:  public/uploads/${path.join(takesDir, thumbnail)}`)
  debug(`proxy:  public/uploads/${path.join(takesDir, proxy)}`)

  fs.mkdirpSync(path.join(UPLOADS_PATH, takesDir))

  let token = new CAF.cancelToken()

  let steps = CAF(function * (signal) {
    // Get number of frames, duration
    debug(`\nGET ${uri}?act=info`)
    const infoRequest = got(`${uri}?act=info`)
    cleanup.info = () => infoRequest.cancel()
    let infoResponse = yield infoRequest
    let movInfo = JSON.parse(infoResponse.body)
    debug('timescale:', movInfo.vts)
    debug('number of frames:', movInfo.vcnt)
    debug('duration:', movInfo.dur)

    // Get file size in bytes
    debug(`\nHEAD ${uri}`)
    const headRequest = got.head(uri)
    cleanup.head = () => headRequest.cancel()
    let headResponse = yield headRequest
    debug('file size in bytes:', headResponse.headers['content-length'])

    // STEP 1
    debug('\ndownload thumbnail')
    yield download(
      `${uri}?act=scr`,
      path.join(UPLOADS_PATH, takesDir, thumbnail),
      signal
    )
    cleanup.thumbnail = clean(path.join(UPLOADS_PATH, takesDir, thumbnail))

    // STEP 2
    debug('\ndownload mov')
    yield download(
      uri,
      path.join(UPLOADS_PATH, takesDir, filename),
      signal
    )
    cleanup.mov = clean(path.join(UPLOADS_PATH, takesDir, filename))

    // STEP 3
    debug('\ninsert slate')
    // TODO handle cancel via signal
    yield createProxyWithVisualSlate({
      inpath: path.join(UPLOADS_PATH, takesDir, filename),
      outpath: path.join(UPLOADS_PATH, takesDir, proxy),

      // TODO don't hardcode codec_time_base
      //
      // to get codec_time_base:
      // $ ffprobe -v error \
      //   -select_streams v:0 \
      //   -show_entries stream=codec_time_base \
      //   -of default=noprint_wrappers=1:nokey=1 \
      //   $MOVFILE
      //
      frameLengthInSeconds: 1001/24000,

      slateData: {
        width: 1280,
        height: 720
      }
    })
    // TODO also cleanup tmp folder on abort
    cleanup.proxy = clean(path.join(UPLOADS_PATH, takesDir, proxy))

    // verify file size
    let fileSizeExpected = parseInt(headResponse.headers['content-length'])
    let { size: fileSizeActual } = fs.statSync(path.join(UPLOADS_PATH, takesDir, filename))
    if (fileSizeExpected !== fileSizeActual) {
      throw new Error(`File size mismatch. Expected ${fileSizeExpected} but got ${fileSizeActual}`)
    }

    // verify frame count via container
    // (faster than checking the stream)
    // via https://stackoverflow.com/questions/2017843/fetch-frame-count-with-ffmpeg
    let { stdout, error } = spawnSync(
      'ffprobe', [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=nb_frames',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        path.join(UPLOADS_PATH, takesDir, filename)
      ]
    )
    if (error) throw error
    let framesExpected = movInfo.vcnt - 1
    let framesActual = parseFloat(stdout.toString())
    if (framesExpected !== framesActual) {
      throw new Error(
        `Frame count mismatch. Expected ${framesExpected} but got ${framesActual}`
      )
    }

    // STEP 4
    debug('marking take download complete in database')
    run(
      `UPDATE takes
      SET downloaded = 1
      WHERE id = ?`,
      take.id
    )
  })

  steps( token.signal )
    .then(
      function () {
        debug('take processing complete!')
        success = true
        callback('NEXT')
      },
      function (event) {
        console.error('take processing failed')
        console.error('  ...code', event.code)
        console.error('  ...message', event.message)

        // useful for reporting internal errors
        // ERR_STREAM_PREMATURE_CLOSE
        // ERR_STREAM_DESTROYED
        callback({ type: 'ERROR', data: event })
      }
    )

  return () => {
    debug('take processing cleanup')

    if (success == false) {
      debug('take processing terminated early by state machine')
      token.abort(new Error('Early termination'))

      debug('unlinking files …')
      cleanup.info && cleanup.info()
      cleanup.head && cleanup.head()
      cleanup.thumbnail && cleanup.thumbnail()
      cleanup.mov && cleanup.mov()
      cleanup.proxy && cleanup.proxy()
    }
  }
}

let downloaderService

function init ({ ZCAM_URL, projectId }) {
  downloaderService = interpret(
    createMachine(
      downloader,
      {
        services: {
          checkForTakes,
          downloadAndProcessTakeFiles
        },
        actions: {
          setTake: assign({ take: (context, event) => event.take }),
          clearTake: assign({ take: (context, event) => null })
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
