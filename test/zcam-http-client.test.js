const t = require('tap')

const ZcamHTTPClient = require('../lib/zcam/client')

const client = new ZcamHTTPClient({
  uri: 'http://localhost:8080',
  timeout: 500
})

const disconnectedClient = new ZcamHTTPClient({
  uri: 'http://localhost:666'
})

t.test('handles timeouts', async t => {
  try {
    await client.get('/timeout')
  } catch (err) {
    t.equals(err.name, 'AbortError')
    t.end()
  }
})

t.test('reports if camera was disconnected/unreachable', async t => {
  try {
    await disconnectedClient.get('/info')
  } catch (err) {
    t.equal(err.code, 'ECONNREFUSED')
    t.end()
  }
})

t.test('GET /info', async t => {
  let { data } = await client.get('/info')
  t.end()
})
