// pbpaste | node scripts/parse-ngrok.js
(async function () {
  const url = require('url')
  try {
    process.stdin.setEncoding('utf8')
    for await (const input of process.stdin) {
      let urlHttp = url.parse(input.match(/Forwarding\s+(.+) -> http:.+:80/)[1])
      let urlWs = url.parse(input.match(/Forwarding\s+(.+) -> http:.+:81/)[1])

      console.log('Z Cam ngrok tunnels:')
      console.log('http   ', urlHttp.href.slice(0, -1))
      console.log('ws     ', urlWs.href.slice(0, -1))
      console.log('')

      console.log('Forward to localhost :80/:81 with:')
      console.log(`ncat --sh-exec "ncat ${urlHttp.hostname} 80" -l localhost 80 --keep-open`)
      console.log(`ncat --sh-exec "ncat ${urlWs.hostname} 80" -l localhost 81 --keep-open`)
    }
  } catch (err) {
    console.error('Could not parse STDIN')
    console.error(err)
  }
})()
