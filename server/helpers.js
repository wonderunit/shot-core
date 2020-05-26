// view helpers
const path = require('path')
const num2fraction = require('num2fraction')

module.exports = {
  truncate: (s, len = 79) =>
    s.length > len ? s.slice(0, len) + '…' : s,

  imagesPath: scene =>
    '/uploads/' + scene.storyboarder_path
      .replace(
        path.basename(scene.storyboarder_path),
        'images'
      ),

  // e.g.: 01:01:15
  durationMsecsToString: msecs => {
    let t = msecs / 1000
    let h = Math.floor(t / (60 * 60)) % 24
    let m = Math.floor(t / 60) % 60
    let s = Math.floor(t % 60)
    let parts = (h > 0) ? [h, m, s] : [m, s]
    return parts.map(v => v.toString().padStart(2, '0')).join(':')
  },

  // e.g.: 4h25m
  friendlyDuration: msecs => {
    let t = msecs / 1000
    let h = Math.floor(t / (60 * 60)) % 24
    let m = Math.floor(t / 60) % 60
    let s = Math.floor(t % 60)
    return h > 0
      ? s > 0
        ? `${h}h${m}m${s}s`
        : `${h}h${m}m`
      : m > 0
        ? `${m}m${s}s`
        : `${s}s`
  },

  plural: v => v == 1 ? '' : 's',

  humanizeAspectRatio: aspectRatio => {
    let f = num2fraction(aspectRatio)
    return f.match(/\/100$/)
      // e.g.: 2.39:1
      ? `${f.match(/(\d+)/)[1] / 100}:1`
      // e.g.: 16:9
      : f.replace('/', ':')
  }
}
