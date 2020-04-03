const browserSync = require('browser-sync')
browserSync.create().init({
  proxy: {
    target: 'localhost:8000',
    ws: true
  },
  snippetOptions: {
    rule: {
      match: /<\/head>/gi,
      fn: function (snippet, match) {
        return snippet + match
      }
    }
  },
  port: 3000,
  files: ['public/**/*'],
  ignore: ['node_modules'],
  reloadDelay: 100,
  notify: false,
  ui: false,
  open: false,
  reloadOnRestart: true,
  online: false,
  logLevel: 'silent',
  socket: {
    port: 3001
  }
})
