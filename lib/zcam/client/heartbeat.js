const EventEmitter = require('events').EventEmitter

class Heartbeat extends EventEmitter {
  constructor (client) {
    super()
    this.client = client
    this.msecs = 5000
    this.value = null
    this.timeoutId = null
  }

  async start () {
    this.update()
  }

  async update () {
    try {
      let { data } = await this.client.get('/info')
      this.value = data
      this.emit('connected', this.value)
    } catch (err) {
      if (err.name === 'AbortError') {
        console.error('[heartbeat] Connection timed out')
      } else if (err.code !== 'ECONNREFUSED') {
        console.error('[heartbeat]', err)
      }
      this.value = null
      this.emit('disconnected', this.value)
    }

    this.timeoutId = setTimeout(() => this.update(), this.msecs)
  }

  deref () {
    return this.value
  }

  stop () {
    clearTimeout(this.timeoutId)
  }
}

module.exports = Heartbeat
