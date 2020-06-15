// via https://github.com/lukejacksonn/servor/blob/05f1f97/servor.js

const chokidar = require('chokidar')

const files = [
  'public/css/*.css',
  'public/js/*.js',
  'server/views/*.ejs',
  'server/views/**/*.ejs'
]

let clients = []

const sendMessage = (res, channel, data) => {
  res.write(`event: ${channel}\nid: 0\ndata: ${data}\n`)
  res.write('\n\n')
}

const get = (req, res, next) => {
  res.writeHead(200, {
    'Connection': 'keep-alive',
    'Content-Type': 'text/event-stream;',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
  })
  sendMessage(res, 'connected', 'ready')
  let interval = setInterval(sendMessage, 60_000, res, 'ping', 'waiting')
  req.on('close', () => clearInterval(interval))
  clients.push(res)
}

const reload = () => {
  while (clients.length > 0) {
    sendMessage(clients.pop(), 'message', 'reload')
  }
}

const stop = () => {
  while (clients.length > 0) {
    clients.pop().end()
  }
}

chokidar
  .watch(files)
  .on('all', (event, path) =>
    reload())

module.exports = {
  get,
  reload,
  stop
}
