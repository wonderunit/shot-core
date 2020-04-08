/*
TODO
slate:
- generate slate PNG from real data (png generator fn as argument? png path as argument?)
- don't hardcode frameLengthInSeconds

concat:
- fix missing extended metadata
- match durations exactly
- fix timecode stream

cleanup:
- delete the tmp folder when complete
- handle interrupts, e.g.:
  process.on('SIGTERM', () => …)
  process.on('SIGINT', () => …) // if running, ffmpeg.kill()
*/
const fs = require('fs-extra')
const os = require('os')
const path = require('path')

const debug = require('debug')('shotcore:visual-slate')

const spawner = require('./spawner')

const TEMPLATE = path.join(__dirname, 'slate-template.png')

async function createSlate ({ outpath, slateData }) {
  debug('createSlate() with data:', { slateData })
  debug('copying', TEMPLATE, 'to', outpath)
  fs.copyFileSync(TEMPLATE, outpath)
}

async function extractProxy ({ inpath, outpath }) {
  await spawner('ffmpeg', 
    [
      '-loglevel', '24',
      // input
      '-i', inpath,
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
      outpath
    ]
  )
}

// TODO
const mp4 = [
  '-c:v:0', 'h264'
]

const hevc = [
  '-c:v:0', 'hevc',
  '-tag:v', 'hvc1',
  '-pix_fmt', 'yuv420p',
  '-colorspace', 'bt709',
  '-color_trc', 'bt709',
  '-color_primaries', 'bt709'
]

async function concat ({ inpath, frameLengthInSeconds, folder, slate, outpath, options }) {
  debug('cutting 1st frame')
  await spawner('ffmpeg',
    [
      '-loglevel', 24,
      '-i', inpath,
      '-t', frameLengthInSeconds,
      '-movflags', 'use_metadata_tags',
      '-map', '0',
      '-c', 'copy',
      '-n',
      path.join(folder, 'frame.mov')
    ]
  )

  debug('cutting 2nd...end frames')
  await spawner('ffmpeg',
    [
      '-loglevel', 24,
      '-ss', frameLengthInSeconds,
      '-i', inpath,
      '-movflags', 'use_metadata_tags',
      '-map', '0',
      '-c', 'copy',
      '-n',
      path.join(folder, `remain.mov`)
    ]
  )

  debug('overwriting frame with slate')
  await spawner('ffmpeg', [
    '-loglevel', 24,
    '-i', path.join(folder, 'frame.mov'),
    '-i', slate,
    '-filter_complex', `[0:v][1:v] overlay`,
    '-movflags', 'use_metadata_tags',

    '-map', '0',
    '-c', 'copy',
    ...options,
    '-n',
    path.join(folder, 'slate.mov')
  ])

  debug('writing concat.txt')
  let concat = 'ffconcat version 1.0\n\n' +
                'file slate.mov\n' +
                'file remain.mov\n'

  fs.writeFileSync(path.join(folder, 'concat.txt'), concat)

  debug('concat to', outpath)
  await spawner('ffmpeg', [
    '-loglevel', 24,
    '-f', 'concat',
    '-i', path.join(folder, 'concat.txt'),
    '-c', 'copy',
    '-n',
    outpath
  ])

  debug('written to', outpath)

  fs.unlinkSync(path.join(folder, `frame.mov`))
  fs.unlinkSync(path.join(folder, `remain.mov`))
  fs.unlinkSync(path.join(folder, 'slate.mov'))
  fs.unlinkSync(path.join(folder, 'concat.txt'))
}

function createTempFolder () {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'shotcore-'))
}

async function createStreamWithVisualSlate ({ inpath, outpath, frameLengthInSeconds, slateData }) {
  const folder = createTempFolder()

  let slate = path.join(folder, 'slate.png')
  let tmpout = path.join(folder, 'output.mp4')

  try {
    debug('using tmp folder', folder)

    debug('generating slate png')
    await createSlate({ outpath: slate, slateData })

    debug('concat to', outpath)
    await concat({
      inpath: inpath,
      frameLengthInSeconds,
      folder,
      slate,
      outpath: tmpout,

      options: mp4
    })

    // overwrite
    fs.moveSync(tmpout, outpath, { overwrite: true })

  } catch (err) {
    debug('ERROR:', err)
    console.error('ERROR:', err)
    throw err

  } finally {
    // cleanup
    debug('cleanup …')
    fs.unlinkSync(path.join(folder, 'slate.png'))
    fs.rmdir(path.join(folder))

  }
}

async function createProxyWithVisualSlate ({ inpath, outpath, frameLengthInSeconds, slateData }) {
  const folder = createTempFolder()

  let filename = path.basename(outpath)

  let tmpfilepath = path.join(folder, filename)
  let slate = path.join(folder, 'slate.png')

  try {
    debug('using tmp folder', folder)

    debug('generating slate png')
    await createSlate({ outpath: slate, slateData })

    debug('extracting proxy to', tmpfilepath)
    await extractProxy({ inpath, outpath: tmpfilepath })

    debug('concat to', outpath)
    await concat({
      inpath: tmpfilepath,
      frameLengthInSeconds,
      folder,
      slate,
      outpath,

      options: hevc
    })

  } catch (err) {
    debug('ERROR:', err)
    console.error('ERROR:', err)
    throw err

  } finally {
    debug('cleanup …')
    fs.unlinkSync(path.join(folder, filename))
    fs.unlinkSync(path.join(folder, 'slate.png'))
    fs.rmdir(path.join(folder))

  }
}

module.exports = {
  createStreamWithVisualSlate,
  createProxyWithVisualSlate
}
