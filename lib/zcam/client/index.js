const fetch = require('cross-fetch')
const debug = require('debug')('shotcore:zcam-client')

if (!global.AbortController) {
  global.AbortController = require('./abort-controller')
}

async function handler (response) {
  if (response.ok) {
    try {
      let data = await response.json()
      return { response, data }
    } catch (err) {
      if (err.name === 'AbortError') {
        throw err
      } else {
        return { response }
      }
    }
  } else {
    console.error('[zcam-client] ERROR Could not fetch url:', response.url)
    throw new Error(response.statusText)
  }
}

class ZcamClient {
  constructor ({ uri, timeout = 5000 }) {
    this.uri = uri
    this.timeout = timeout
  }

  async fetch (pathname) {
    let controller = new AbortController()
    let signal = controller.signal

    let timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      debug('GET', this.uri + pathname)
      let { response, data } = await handler(
        await fetch(this.uri + pathname, { signal })
      )
      clearTimeout(timeoutId)
      return { response, data }
    } catch (err) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        console.error(`[zcam-client] ERROR request timed out (${this.uri + pathname})`)
        throw err
      } else if (err.code === 'ECONNREFUSED') {
        console.error(`[zcam-client]`, err.message)
        throw err
      } else {
        console.error(`[zcam-client]`, err)
        throw err
      }
    }
  }

  async get (pathname) {
    return this.fetch(pathname)
  }
}

module.exports = ZcamClient
