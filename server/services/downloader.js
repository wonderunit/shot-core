const fs = require('fs-extra')
const got = require('got')
const path = require('path')
const { pipeline } = require('stream')
const { createMachine, interpret, assign } = require('xstate')

const debug = require('debug')('shotcore:downloader')

const { UPLOADS_PATH } = require('../config')
const { run, get } = require('../db')
const { createProxyWithVisualSlate } = require('../services/visual-slate')
const Take = require('../decorators/take')

// find earliest, complete, not downloaded take
const getNextTake = projectId => {
  return get(`
    SELECT * from takes
    WHERE project_id = ?
    AND cut_at IS NOT NULL
    AND filepath IS NOT NULL
    AND downloaded = 0
    ORDER BY date(ready_at)
    LIMIT 1
    `,
    projectId
  )
}

const getTakeFilenames = take => {
  let { scene_number } = get(`SELECT scene_number from scenes WHERE id = ?`, take.scene_id)
  let { shot_number } = get(`SELECT shot_number from shots WHERE id = ?`, take.shot_id)

  let opts = {
    scene_number,
    shot_number,
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

function download (src, dst, callback) {
  let readable = got
    .stream(src)
    .on('downloadProgress', onDownloadProgress(src))
  let writable = fs.createWriteStream(dst)
  return pipeline(readable, writable, callback)
}

const downloadFiles = (context, event) => (callback, onReceive) => {
  let { ZCAM_URL, take, projectId } = context
  let tasks = {}
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

  Promise.resolve()
    .then(() => new Promise((resolve, reject) => {
      debug('\nthumbnail')
      let src = `${uri}?act=scr`
      let dst = path.join(UPLOADS_PATH, takesDir, thumbnail)
      tasks.thumbnail = {
        src,
        dst,
        stream: download(src, dst, err => err ? reject(err) : resolve())
      }
    }))
    .then(() => new Promise((resolve, reject) => {
      debug('\nmov')
      let src = uri
      let dst = path.join(UPLOADS_PATH, takesDir, filename)
      tasks.mov = {
        src,
        dst,
        stream: download(src, dst, err => err ? reject(err) : resolve())
      }
    }))
    .then(() => {
      debug('\nslate')

      let src = path.join(UPLOADS_PATH, takesDir, filename)
      let dst = path.join(UPLOADS_PATH, takesDir, proxy)

      tasks.proxy = {
        src,
        dst
      }

      return createProxyWithVisualSlate({
        inpath: src,
        outpath: dst,

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
    })
    .then(() => {
      debug('marking take complete in database …')
      run(
        `UPDATE takes
        SET downloaded = 1
        WHERE id = ?`,
        take.id
      )
    })
    .then(() => {
      debug('success')

      success = true

      callback('NEXT')
    })
    .catch(err => {
      debug('error')

      // ERR_STREAM_PREMATURE_CLOSE
      // ERR_STREAM_DESTROYED
      if (err.code == 'ERR_STREAM_PREMATURE_CLOSE') {
        console.error(err.code)
        console.error('shot core aborted the download')
      } else {
        console.error(err)
      }

      callback({ type: 'ERROR', data: err })
    })

  return () => {
    // cleanup
    debug('cleanup')
    if (success == false) {
      tasks.thumbnail && fs.unlink(tasks.thumbnail.dst)
      tasks.mov && fs.unlink(tasks.mov.dst)
      if (tasks.proxy) {
        if (fs.existsSync(tasks.proxy.dst)) {
          fs.unlink(tasks.proxy.dst)
        }
      }

      tasks.thumbnail && tasks.thumbnail.stream.destroy()
      tasks.mov && tasks.mov.stream.destroy()
    }
  }
}

const downloaderMachine = createMachine({
  id: 'downloader',
  initial: 'idle',
  strict: true,
  context: {
    projectId: 1,
    take: null
  },
  states: {
    idle: {
      on: {
        'CAMERA_IDLE': 'checking'
      }
    },
    checking: {
      invoke: {
        id: 'checking',
        src: (context, event) => (callback, onReceive) => {
          debug('checking for new takes …')

          let take = getNextTake(context.projectId)

          if (take) {
            debug('found take', take.id)
            callback({ type: 'NEXT', take })
          } else {
            debug('queue is empty.')
            callback('EMPTY')
          }
        }
      },
      on: {
        'EMPTY': {
          target: 'idle',
          actions: 'clearTake'
        },
        'NEXT': {
          target: 'downloading',
          actions: 'setTake'
        },
        'CAMERA_ACTIVE': 'abort'
      }
    },
    downloading: {
      invoke: {
        id: 'downloadFiles',
        src: downloadFiles
      },
      on: {
        'NEXT': 'success',
        'ERROR': 'abort',
        'CAMERA_ACTIVE': 'abort'
      }
    },
    success: {
      entry: () => debug('success'),
      after: {
        3000: {
          target: 'checking',
          actions: 'clearTake'
        }
      },
      on: {
        'CAMERA_ACTIVE': 'abort'
      }
    },
    abort: {
      entry: () => debug('abort'),
      after: {
        3000: {
          target: 'checking',
          actions: 'clearTake'
        }
      },
      on: {
        'CAMERA_ACTIVE': 'abort'
      }
    }
  }
}, {
  actions: {
    setTake: assign({ take: (context, event) => event.take }),
    clearTake: assign({ take: (context, event) => null })
  }
})

let downloaderService

function init ({ ZCAM_URL, projectId }) {
  downloaderService = interpret(
    downloaderMachine
      .withContext({
        ZCAM_URL,
        projectId
      })
  )
  .onTransition(event => debug('->', event.value))
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
