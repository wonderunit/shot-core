const fs = require('fs-extra')
const path = require('path')
const { createMachine, interpret, assign, forwardTo } = require('xstate')
const { spawn, spawnSync } = require('child_process')

const debug = require('debug')('shotcore:rtsp-client')

const { UPLOADS_PATH } = require('../config')
const { run, get } = require('../db')

const Take = require('../decorators/take')

const machine = {
  id: 'rtsp-client',
  initial: 'idle',
  strict: true,
  context: {},
  states: {
    idle: {
      on: {
        REC_START: 'recording'
      }
    },
    recording: {
      entry: ['setContextFromTakeById'],
      invoke: {
        id: 'recorder',
        src: 'recordingService'
      },
      on: {
        REC_STOP: { actions: forwardTo('recorder') },
        ERROR: 'failure',
        SUCCESS: 'processing'
      }
    },
    processing: {
      invoke: {
        id: 'processor',
        src: 'processingService'
      },
      on: {
        SET_DURATION: {
          actions: ['setDuration']
        },
        SUCCESS: 'idle'
      },
      exit: ['updateTake', 'clearContext']
    },
    failure: {
      entry: (context, event) => console.error(context, event)
    },
    off: {
      entry: ['clearContext'],
      final: true
    }
  },
  on: {
    OFF: 'off'
  }
}

const getDataByTakeId = id => {
  let take = get('SELECT * FROM takes WHERE id = ?', id)
  take = new Take(take)
  let { scene_number } = get(`SELECT scene_number from scenes WHERE id = ?`, take.scene_id)
  let { shot_number, impromptu } = get(`SELECT shot_number, impromptu from shots WHERE id = ?`, take.shot_id)

  let filename = take.filenameForStream({
    scene_number,
    shot_number, impromptu
  })

  let dirname = path.join(UPLOADS_PATH, 'projects', take.project_id.toString(), 'takes')
  let dst = path.join(dirname, filename)

  return {
    take: new Take(take),
    scene_number,
    shot_number,
    impromptu,

    dst
  }
}

const getFileDuration = src => {
  let { stdout, stderr } = spawnSync(
    'ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      src
    ]
  )
  stdout = stdout.toString().trim()
  stderr = stderr.toString().trim()
  if (stderr) {
    console.error(stderr)
    throw new Error(`Error getting duration of file ${src}\n` + stderr)
  }
  return parseFloat(stdout)
}

const recordingService = (context, event) => (callback, onReceive) => {
  debug('recordingService')
  debug({ context, event})

  let complete = false
  let closing = false

  let { src, dst } = context

  // TODO record to tmp folder and copy afterward

  debug('preparing to record')
  debug('src:', src)
  debug('dst:', dst)

  // TODO better error handling
  if (fs.existsSync(dst)) {
    throw new Error('File already exists!')
  }

  fs.mkdirpSync(path.dirname(dst))

  let child = spawn(
    'ffmpeg', [
      '-loglevel', 'error',
      // input
      '-i', src,
      // transport
      '-rtsp_transport', 'udp+tcp',

      // force start time to 0
      // NOTE: this may only be required for the zcam-mock-server RTSP server
      //       real Z Cam RTSP server might not need it?
      '-vf', 'setpts=PTS-STARTPTS',

      // never overwrite
      '-n',
      // output
      dst
    ]
  )

  child.stdout.on('data', data => debug(data.toString()))

  child.stderr.on('data', data => console.error(data.toString()))

  child.on('error', err => {
    callback({ type: 'ERROR', error: err })
  })

  child.on('close', (code, signal) => {
    if (complete) {
      console.warn('unexpected multiple close events from ffmpeg process')
      return
    }

    complete = true
    if (signal || code !== 0) {
      debug('close', { code, signal })

      if (closing && code === 255) {
        return callback('SUCCESS')
      }

      if (signal) {
        callback({ type: 'ERROR', error: new Error(`exited via signal ${signal}`) })
      } else {
        callback({ type: 'ERROR', error: new Error(`exited with code ${code}`) })
      }
    }
  })

  onReceive(event => {
    if (event.type === 'REC_STOP') {
      debug('done! closing …')
      closing = true
      child.kill()
    }
  })

  return () => {
    if (complete == false) {
      debug('recording interrupted. terminating early …')
      child.kill()
    }
  }
}

const processingService = (context, event) => (callback, onReceive) => {
  debug('calculating duration')
 
  let duration = getFileDuration(context.dst)
  callback({ type: 'SET_DURATION', duration })

  // TODO visual slate?
  //
  // await createStreamWithVisualSlate({
  //   inpath: path.join(UPLOADS_PATH, dirname, filename),
  //   outpath: path.join(UPLOADS_PATH, dirname, filename),
  //   // TODO don't hardcode
  //   frameLengthInSeconds: 1001/24000,
  //   slateData: {
  //     width: 1920,
  //     height: 1080
  //   }
  // })

  callback('SUCCESS')
}

const updateTake = (context, event) => {
  let { id } = context.take
  let { duration } = context
  let { dst } = context

  let { changes, lastInsertRowid } = run(`
  UPDATE takes
  SET metadata_json = json_patch(metadata_json, ?)
  WHERE id = ?
  `,
  JSON.stringify(
    {
      preview: {
        filename: path.basename(dst),
        duration
      }
    }
  ),
  id)
}

const service = interpret(
  createMachine(
    machine,
    {
      services: {
        recordingService,
        processingService
      },
      actions: {
        updateTake,
        setContextFromTakeById: assign((context, event) => {
          let { src } = event
          return {
            src,
            ...getDataByTakeId(event.takeId)
          }
        }),
        setDuration: assign({ duration: (context, event) => event.duration }),
        clearContext: assign({})
      },
      guards: {
        //
      }
    }
  )
)
.onTransition(event => debug(
  '->', event.value,
  event.context.take ? `take:${event.context.take.id}` : '',
  event.context.duration ? `take:${event.context.duration}` : ''
))

async function start () {
  service.start()
  return true
}

async function stop () {
  if (service.initialized) {
    service.send('OFF')
    service.stop()
  }
  return true
}

function send (event) {
  service.send(event)
}

module.exports = {
  start,
  stop,
  send
}
