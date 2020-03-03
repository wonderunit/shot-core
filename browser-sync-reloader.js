const browserSync = require('browser-sync')
browserSync.create().init({
  proxy: 'localhost:8000',
  port: 3000,
  files: ['public/**/*'],
  ignore: ['node_modules'],
  reloadDelay: 100,
  notify: false,
  ui: false,
  open: false,
  reloadOnRestart: true,
  online: false,
  logLevel: 'silent'
})
