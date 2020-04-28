const { actions } = require('xstate')
const { send, cancel } = actions

const timerStart = send('TIMEOUT', { id: 'timer', delay: context => context.timeout })

const timerCancel = cancel('timer')

module.exports = {
  id: 'activityMonitor',
  initial: 'off',
  strict: true,
  context: {
    timeout: 10_000
  },
  states: {
    off: {
      on: {
        ON: 'inactive'
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
