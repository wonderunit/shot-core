module.exports = {
  snippetOptions: {
    rule: {
      match: /<\/head>/gi,
      fn: function (snippet, match) {
        return snippet + match
      }
    }
  },
  files: ['public/**/*'],
  ignore: ['node_modules'],
  reloadDelay: 100,
  notify: false,
  ui: false,
  open: false,
  reloadOnRestart: true,
  online: false,
  logLevel: 'silent'
}
