const t = require('tap')
const { createMachine, interpret } = require('xstate')

const activityMonitorMachine = require('../server/machines/activity-monitor')

let activityMonitor = interpret(
  createMachine(
    activityMonitorMachine,
    {
      actions: {
        emitIdle: () => console.log('camera/idle'),
        emitActive: () => console.log('camera/active')
      }
    }
  ).withContext({
    timeout: 500
  })
)
.onTransition(event => console.log('->', event.value))
.start()

const delay = msecs => new Promise(resolve => setTimeout(resolve, msecs))

t.test('can monitor camera activity', async t => {
  activityMonitor.send('CONNECTED')
  t.equal('active', activityMonitor.state.value)

  activityMonitor.send('ACTIVITY')
  t.equal('active', activityMonitor.state.value)

  await delay(501)
  t.equal('inactive', activityMonitor.state.value)

  activityMonitor.send('ACTIVITY')
  await delay(250)
  activityMonitor.send('ACTIVITY')
  await delay(250)
  activityMonitor.send('ACTIVITY')
  await delay(250)
  t.equal('active', activityMonitor.state.value)

  await delay(255)
  t.equal('inactive', activityMonitor.state.value)

  t.end()
})
