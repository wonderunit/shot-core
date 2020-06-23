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
        ON: 'checking'
      }
    },
    checking: {
      invoke: {
        src: 'checkForTakes'
      },
      on: {
        NEXT: {
          target: 'prepareTakeForDownload',
          actions: ['setTake', 'markStepsInProgress']
        }
      }
    },

    // STEPS
    //
    prepareTakeForDownload: {
      invoke: {
        src: 'prepareTakeForDownload',
        onError: 'handleUnexpectedError'
      },
      on: {
        SUCCESS: 'getInfo',
        ERROR: 'stepFailure'
      },
      exit: 'setData'
    },
    getInfo: {
      invoke: {
        src: 'getInfo',
        onError: 'handleUnexpectedError'
      },
      on: {
        SUCCESS: 'getContentLength',
        ERROR: 'stepFailure'
      },
      exit: 'setData'
    },
    getContentLength: {
      invoke: {
        src: 'getContentLength',
        onError: 'handleUnexpectedError'
      },
      on: {
        SUCCESS: 'getThumbnail',
        ERROR: 'stepFailure'
      },
      exit: 'setData'
    },
    getThumbnail: {
      invoke: {
        src: 'getThumbnail',
        onError: 'handleUnexpectedError'
      },
      on: {
        SUCCESS: 'getFile',
        ERROR: 'stepFailure'
      }
    },
    getFile: {
      invoke: {
        src: 'getFile',
        onError: 'handleUnexpectedError'
      },
      on: {
        SUCCESS: 'verifyFileSize',
        ERROR: 'stepFailure'
      }
    },
    verifyFileSize: {
      invoke: {
        src: 'verifyFileSize',
        onError: 'handleUnexpectedError'
      },
      on: {
        SUCCESS: 'verifyFrameCount',
        ERROR: 'stepFailure'
      }
    },
    verifyFrameCount: {
      invoke: {
        src: 'verifyFrameCount',
        onError: 'handleUnexpectedError'
      },
      on: {
        SUCCESS: 'getMetadata',
        ERROR: 'stepFailure'
      }
    },
    getMetadata: {
      invoke: {
        src: 'getMetadata',
        onError: 'handleUnexpectedError'
      },
      on: {
        SUCCESS: 'extractProxy',
        ERROR: 'stepFailure'
      },
      exit: 'setData'
    },
    extractProxy: {
      invoke: {
        src: 'extractProxy',
        onError: 'handleUnexpectedError'
      },
      on: {
        // SUCCESS: 'createSlate',
        SUCCESS: 'copyFilesAndMarkComplete',

        ERROR: 'stepFailure'
      },
      exit: 'setData'
    },



    // TODO visual slate:
    //
    // createSlate: {
    //   invoke: {
    //     src: 'createSlate',
    //     onError: 'handleUnexpectedError'
    //   },
    //   on: {
    //     SUCCESS: 'createSlatedProxy',
    //     ERROR: 'stepFailure'
    //   }
    // },
    // createSlatedProxy: {
    //   invoke: {
    //     src: 'createSlatedProxy',
    //     onError: 'handleUnexpectedError'
    //   },
    //   on: {
    //     SUCCESS: 'copyFilesAndMarkComplete',
    //     ERROR: 'stepFailure'
    //   }
    // },



    copyFilesAndMarkComplete: {
      invoke: {
        src: 'copyFilesAndMarkComplete',
        onError: 'handleUnexpectedError'
      },
      on: {
        SUCCESS: 'stepsSuccess',
        ERROR: 'stepFailure'
      }
    },


    // step-related handlers
    //
    handleUnexpectedError: {
      entry: [
        (context, event) => {
          // state machine error (type: error.platform.*, data: Error)
          console.error('handleUnexpectedError: one of the steps threw an unexpected error')
          console.error(event)
          console.error('*** The above error prevented the cleanup function from running ***')
        },
      ],
      invoke: {
        src: 'destroyTakeFiles'
      },
      on: {
        SUCCESS: 'stepsFinallyCleanup'
      }
    },
    stepFailure: {
      entry: [
        (context, event) => {
          console.error('stepFailure: one of the steps failed')
          console.error(event.error)
        },
      ],
      invoke: {
        src: 'destroyTakeFiles'
      },
      on: {
        SUCCESS: 'stepsFinallyCleanup'
      }
    },
    stepsSuccess: {
      entry: [
        () => console.log('stepsSuccess: all steps succeeded')
      ],
      on: {
        '': 'stepsFinallyCleanup'
      }
    },

    // final cleanup and reset
    //
    stepsFinallyCleanup: {
      invoke: {
        src: 'destroyTempDirectory'
      },
      on: {
        SUCCESS: 'stepsFinallyResetContext'
      }
    },
    stepsFinallyResetContext: {
      entry: [
        'clearTake',
        'clearData',
        'markStepsComplete'
      ],
      after: {
        // wait 3s, then retry
        3000: {
          target: 'checking'
        }
      }
    },


    beforeOff: {
      on: { '': 'beforeOffDestroyTakeFiles' }
    },
    beforeOffDestroyTakeFiles: {
      invoke: { src: 'destroyTakeFiles' },
      on: { SUCCESS: 'beforeOffDestroyTempDirectory' }
    },
    beforeOffDestroyTempDirectory: {
      invoke: { src: 'destroyTempDirectory' },
      on: { SUCCESS: 'beforeOffResetContext' }
    },
    beforeOffResetContext: {
      entry: [
        'clearTake',
        'clearData',
        'markStepsComplete'
      ],
      on: { '': 'off' }
    }
  },

  on: {
    OFF: [
      {
        // if steps are in-progress ...
        cond: 'stepsInProgress',
        // ... run cleanup functions first
        target: 'beforeOff'
      },
      {
        target: 'off'
      }
    ]
  }
}
