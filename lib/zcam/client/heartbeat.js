const EventEmitter = require('events').EventEmitter

class Heartbeat extends EventEmitter {
  constructor (client) {
    super()
    this.client = client
    this.msecs = 5000
    this.value = null
    this.update()
  }

  async update () {
    try {
      let { data } = await this.client.get('/info')
      this.value = data
      this.emit('connected', this.value)
    } catch (err) {
      if (err.code !== 'ECONNREFUSED') {
        console.error(err)
      }
      this.value = null
      this.emit('disconnected', this.value)
    }

    setTimeout(this.update.bind(this), this.msecs)
  }

  deref () {
    return this.value
  }
}

module.exports = Heartbeat
