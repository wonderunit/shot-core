// view helpers
const path = require('path')

module.exports = {
  truncate: (s, len = 79) =>
    s.length > len ? s.slice(0, len) + '…' : s,

  imagesPath: scene =>
    '/uploads/' + scene.storyboarder_path
      .replace(
        path.basename(scene.storyboarder_path),
        'images'
      ),

  durationMsecsToString: msecs => {
    let t = msecs / 1000
    let h = Math.floor(t / (60 * 60)) % 24
    let m = Math.floor(t / 60) % 60
    let s = Math.floor(t % 60)
    let parts = (h > 0) ? [h, m, s] : [m, s]
    return parts.map(v => v.toString().padStart(2, '0')).join(':')
  }
}
