const { actions } = require('xstate')

module.exports = {
  id: 'downloader',
  initial: 'off',
  strict: true,
  context: {
    ZCAM_URL: null,
    projectId: null,

    take: null
  },
  states: {
    off: {
      on: {
        'ON': 'checking'
      }
    },
    checking: {
      invoke: {
        src: 'checkForTakes'
      },
      on: {
        'NEXT': {
          target: 'downloading',
          actions: 'setTake'
        }
      }
    },
    downloading: {
      invoke: {
        src: 'downloadAndProcessTakeFiles'
      },
      on: {
        'NEXT': 'downloadingSuccess',
        'ERROR': 'downloadingError',
      }
    },
    downloadingSuccess: {
      entry: 'clearTake',
      after: {
        3000: 'checking'
      },
    },
    downloadingError: {
      // clear the take
      entry: 'clearTake',
      after: {
        // wait 3s, then retry
        3000: 'checking'
      },
    }
  },
  on: {
    'OFF': {
      target: 'off',
      actions: 'clearTake'
    }
  }
}
