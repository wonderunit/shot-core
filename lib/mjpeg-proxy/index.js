// based on:
// https://github.com/legege/node-mjpeg-proxy
// https://github.com/nissin-dental/node-mjpeg-proxy

// TODO
// - Fix CRLF issue on iOS 6+: boundary should be preceded by CRLF.
// - Handle HEAD requests https://stackoverflow.com/questions/27025486
// - Handle disconnect during session (source server closed connection)
// - 'Expires' header?

const http = require('http')

function extractBoundary (contentType) {
  contentType = contentType.replace(/\s+/g, '')

  var startIndex = contentType.indexOf('boundary=')
  var endIndex = contentType.indexOf(';', startIndex)

  if (endIndex == -1) { // boundary is the last option
    // some servers, like mjpeg-streamer puts a '\r' character at the end of each line.
    if ((endIndex = contentType.indexOf('\r', startIndex)) == -1) {
      endIndex = contentType.length
    }
  }
  return contentType
    .substring(startIndex + 9, endIndex)
    .replace(/"/gi,'').replace(/^\-\-/gi, '')
}

function writeHeaders (res, { boundary }) {
  res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=--' + boundary)
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.setHeader('Connection', 'close')
  res.setHeader('Pragma', 'no-cache')
}

function createClient (res, { boundary }) {
  let pastBoundary = false

  writeHeaders(res, { boundary })
  res.writeHead(200)

  res.on('close', () => {
    console.log('[mjpeg-proxy] closed connection')
    clients = clients.filter(client => client.res != res)
  })

  return {
    res,

    next: function (chunk) {
      if (pastBoundary) {
        res.write(chunk)
      } else {
        let p = chunk.indexOf(boundary)
        if (p > -1) {
          pastBoundary = true
          res.write(chunk.slice(p))
        }
      }
    },
    end: function () {
      res.end()
    }
  }
}

let boundary

let clients = []

const createMjpegProxy = (url) => {
  const get = (req, res) => {
    if (boundary) {
      clients.push(createClient(res, { boundary }))
      console.log('[mjpeg-proxy] clients:', clients.length)
    } else {
      console.log('[mjpeg-proxy] starting proxy ...')
      let httpReq = http.get(url, function (source) {
        boundary = extractBoundary(source.headers['content-type'])
        console.log('[mjpeg-proxy] first client')
        clients.push(createClient(res, { boundary }))

        source.on('data', chunk => clients.forEach(client => client.next(chunk)))
        source.on('end', () => clients.forEach(client => client.end()))
        source.on('close', () => {
          console.log('[mjpeg-proxy] source server closed connection')
        })
      })
      httpReq.on('error', err => {
        if (err.code == 'ECONNREFUSED') {
          console.error(`[mjpeg-proxy] ERROR: could not connect to ${url}`)
          res.sendStatus(500)
        } else {
          console.error(err)
          res.sendStatus(500)
        }
      })
    }
  }

  return {
    get
  }
}

module.exports = createMjpegProxy
