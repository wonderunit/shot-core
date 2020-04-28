const { actions } = require('xstate')
const { send, cancel } = actions

const sendIdleOnTimeout = send('IDLE', { id: 'sendIdle', delay: 5_000 })

const markActive = cancel('sendIdle')

module.exports = {
  id: 'activityMonitor',
  initial: 'active',
  strict: true,
  states: {
    active: {
      entry: [
        'emitActive',
        sendIdleOnTimeout
      ],
      on: {
        'ACTIVITY': { actions: [markActive, sendIdleOnTimeout] },
        'IDLE': 'idle',
        'DISABLE': 'disabled'
      }
    },
    idle: {
      entry: 'emitIdle',
      on: {
        'ACTIVITY': 'active',
        'DISABLE': 'disabled'
      }
    },
    disabled: {
      on: { 'ENABLE': 'idle' }
    }
  },
  on: {
    'DISCONNECT': 'idle'
  }
}
