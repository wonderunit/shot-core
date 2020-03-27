// pbpaste | node scripts/parse-ngrok.js
(async function () {
  const url = require('url')
  const bold = str => `\x1b[1m${str}\x1b[22m`
  try {
    process.stdin.setEncoding('utf8')
    for await (const input of process.stdin) {
      let urlHttp = url.parse(input.match(/Forwarding\s+(.+) -> http:.+:80/)[1])
      let urlWs = url.parse(input.match(/Forwarding\s+(.+) -> http:.+:81/)[1])

      let httpUri = urlHttp.href.slice(0, -1)
      let wsUri = urlWs.href.slice(0, -1)

      console.log(bold('Z Cam ngrok tunnels:'))
      console.log('http   ', httpUri)
      console.log('ws     ', wsUri)
      console.log('')

      console.log(bold('As env vars:'))
      console.log(`ZCAM_URL=${httpUri}`)
      console.log(`ZCAM_WS_URL=${wsUri}`)
      console.log('')

      console.log(bold('Test HTTP via curl:'))
      console.log(`curl $ZCAM_URL/ctrl/get?k=last_file_name`)
      console.log('')

      console.log(bold('Test WebSocket via wscat:'))
      console.log('wscat -c $ZCAM_WS_URL')
      console.log('')

      console.log(bold('Run Shot Core server:'))
      console.log(`ZCAM_URL=${urlHttp.href.slice(0, -1)} ZCAM_WS_URL=${urlWs.href.slice(0, -1)} npm start`)
      console.log('')

      console.log(bold('Forward to localhost :80/:81:'))
      console.log(`ncat --sh-exec "ncat ${urlHttp.hostname} 80" -l localhost 80 --keep-open`)
      console.log(`ncat --sh-exec "ncat ${urlWs.hostname} 80" -l localhost 81 --keep-open`)
    }
  } catch (err) {
    console.error('Could not parse STDIN')
    console.error(err)
  }
})()
