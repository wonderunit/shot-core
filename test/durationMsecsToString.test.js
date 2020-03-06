const t = require('tap')

const { durationMsecsToString } = require('../server/helpers')

t.test('durationMsecsToString', t => {
  t.equal('00:00', durationMsecsToString(0))
  t.equal('32:15', durationMsecsToString(1935000))
  t.equal('59:15', durationMsecsToString(3555000))
  t.equal('01:00:00', durationMsecsToString(3600000))
  t.equal('01:00:45', durationMsecsToString(3645000))
  t.end()
})
