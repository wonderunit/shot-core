/*
TODO
slate:
- generate slate PNG from real data (png generator fn as argument? png path as argument?)

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

async function createProxyWithVisualSlate ({ inpath, outpath, frameLengthInSeconds }) {
  let template = path.join(__dirname, 'slate-template.png')

  let tmpPathPrefix = path.join(os.tmpdir(), 'shotcore-')
  let folder = fs.mkdtempSync(tmpPathPrefix)
  let filename = path.basename(outpath)

  let slate = path.join(folder, 'slate.png')

  try {
    debug('using tmp folder', folder)

    debug('generating slate png at 1280×720')
    debug('copying', template, 'to', slate)
    fs.copyFileSync(template, slate)

    debug('extracting proxy to', path.join(folder, filename))
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
        path.join(folder, filename)
      ]
    )

    debug('cutting 1st frame')
    await spawner('ffmpeg',
      [
        '-loglevel', 24,
        '-i', path.join(folder, filename),
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
        '-i', path.join(folder, filename),
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
      '-c:v:0', 'hevc',
      '-tag:v', 'hvc1',
      '-pix_fmt', 'yuv420p',
      '-colorspace', 'bt709',
      '-color_trc', 'bt709',
      '-color_primaries', 'bt709',
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
  } catch (err) {
    debug('ERROR:', err)
    throw err
  }
}

module.exports = createProxyWithVisualSlate
