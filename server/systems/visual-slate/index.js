/*

  TODO

  slate:
  - don't hardcode frameLengthInSeconds

  concat:
  - fix warnings when copying metadata
      "Could not find codec parameters for stream 2"
      "You requested a copy of the original timecode track so timecode metadata are now ignored"
      try e.g.: -tag:2 tmcd or -copy_unknown?
  - fix timecode stream (handler_name, reel_name)
    - try mpeg ts?
    - try mp4 instead of mov for temporary files?
  - fix RTSP stream? match durations/framerates exactly

  cleanup:
  - handle cancel signal
  - on cancel, cleanup tmp files
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
const { render } = require('./renderer')

async function renderSlateImageFile ({ outpath, slateData }) {
  debug('renderSlateImageFile() with data:', { slateData })
  fs.writeFileSync(outpath, render({ slateData }))
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
// const mp4 = [
//   '-c:v:0', 'h264'
// ]

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

  // concat, with metadata
  // see https://superuser.com/a/996278
  debug('concat to', outpath, '(with metadata)')
  await spawner('ffmpeg', [
    '-loglevel', 24,
    '-f', 'concat',
    '-i', path.join(folder, 'concat.txt'),
    '-i', inpath,

    // video from concat
    '-map', '0:0',

    // audio from concat
    '-map', '0:1',

    // timecode from *original* file
    '-map', '1:2',

    '-c', 'copy',

    // metadata from original
    '-movflags', 'use_metadata_tags',
    '-map_metadata', '1',

    '-n',
    outpath
  ])

  debug('')
  debug('open', folder)
  debug('')

  debug('written to', outpath)

  fs.unlinkSync(path.join(folder, `frame.mov`))
  fs.unlinkSync(path.join(folder, `remain.mov`))
  fs.unlinkSync(path.join(folder, 'slate.mov'))
  fs.unlinkSync(path.join(folder, 'concat.txt'))
}

function createTempFolder () {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'shotcore-'))
}

// async function createStreamWithVisualSlate ({ inpath, outpath, frameLengthInSeconds, slateData }) {
//   debug('createStreamWithVisualSlate()')
//   debug({ inpath, outpath, frameLengthInSeconds, slateData })

//   const folder = createTempFolder()

//   let slate = path.join(folder, 'slate.png')
//   let tmpout = path.join(folder, 'output.mp4')

//   try {
//     debug('using tmp folder', folder)

//     debug('generating slate png')
//     await renderSlateImageFile({ outpath: slate, slateData })

//     debug('concat() to', tmpout)
//     await concat({
//       inpath: inpath,
//       frameLengthInSeconds,
//       folder,
//       slate,
//       outpath: tmpout,

//       options: mp4
//     })

//     // overwrite
//     debug('moving from', tmpout, 'to', outpath)
//     fs.moveSync(tmpout, outpath, { overwrite: true })

//   } catch (err) {
//     debug('ERROR:', err)
//     console.error('ERROR:', err)
//     throw err

//   } finally {
//     // cleanup
//     debug('cleanup …')
//     fs.unlinkSync(path.join(folder, 'slate.png'))
//     fs.rmdirSync(path.join(folder))

//   }
// }

async function createProxyWithVisualSlate ({ inpath, outpath, frameLengthInSeconds, slateData }) {
  debug('createProxyWithVisualSlate()')
  debug({ inpath, outpath, frameLengthInSeconds, slateData })

  const folder = createTempFolder()

  let filename = path.basename(outpath)

  let tmpfilepath = path.join(folder, filename)
  let slate = path.join(folder, 'slate.png')

  try {
    debug('using tmp folder', folder)

    debug('generating slate png')
    await renderSlateImageFile({ outpath: slate, slateData })

    // to extract a new proxy from take:
    debug('extracting proxy to', tmpfilepath)
    await extractProxy({ inpath, outpath: tmpfilepath })
    // FOR TESTING
    // to copy and continue with an existing proxy file:
    // debug('copying', inpath, 'to', tmpfilepath)
    // fs.copyFileSync(inpath, tmpfilepath)

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
    console.error('createProxyWithVisualSlate() caught error')
    console.error(err)
    throw err

  } finally {
    debug('cleanup …')

    try {
      for (let f of [
        'concat.txt', 'frame.mov', 'remain.mov', 'slate.mov',
        filename, 'slate.png'
      ]) {
        let filepath = path.join(folder, f)
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(path.join(folder, f))
        }
      }

      fs.rmdirSync(path.join(folder))
    } catch (err) {
      console.error('createProxyWithVisualSlate() failed with error')
      console.error(err)
    }
  }
}

module.exports = {
  // createStreamWithVisualSlate,
  createProxyWithVisualSlate,
  extractProxy
}
