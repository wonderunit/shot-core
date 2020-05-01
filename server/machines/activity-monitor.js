const { actions } = require('xstate')
const { send, cancel } = actions

const timerStart = send('TIMEOUT', { id: 'timer', delay: context => context.timeout })

const timerCancel = cancel('timer')

module.exports = {
  id: 'activityMonitor',
  initial: 'off',
  strict: true,
  context: {
    // how long to wait after camera stops recording before downloader can start
    timeout: 30_000
  },
  states: {
    off: {
      entry: timerCancel,
      on: {
        CONNECTED: 'active'
      }
    },
    inactive: {
      entry: 'emitIdle',
      on: {
        ACTIVITY: 'active',
        OFF: 'off'
      }
    },
    active: {
      entry: ['emitActive', timerStart],
      on: {
        ACTIVITY: {
          target: 'active', actions: timerCancel
        },
        TIMEOUT: 'inactive',
        OFF: 'off'
      }
    }
  }
}
