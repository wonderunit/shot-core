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
      )
}
