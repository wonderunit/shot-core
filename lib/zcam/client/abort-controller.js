// via:
// https://github.com/jimmywarting/abortcontroller
// https://github.com/southpolesteve/node-abort-controller

const { EventEmitter } = require('events')

class AbortSignal extends EventEmitter {
  constructor() {
    super()
    this.aborted = false
  }

  toString() {
    return '[object AbortSignal]'
  }

  get [Symbol.toStringTag]() {
    return 'AbortSignal'
  }

  removeEventListener(name, handler) {
    this.removeListener(name, handler)
  }

  addEventListener(name, handler) {
    this.on(name, handler)
  }
}

module.exports = class AbortController {
  constructor() {
    this.signal = new AbortSignal()
  }

  abort() {
    this.signal.aborted = true
    this.signal.emit('abort')
  }

  toString() {
    return '[object AbortController]'
  }

  get [Symbol.toStringTag]() {
    return 'AbortController'
  }
}
