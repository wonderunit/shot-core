// pbpaste | node scripts/parse-ngrok.js
(async function () {
  const url = require('url')
  const bold = str => `\x1b[1m${str}\x1b[22m`
  try {
    process.stdin.setEncoding('utf8')
    for await (const input of process.stdin) {
      let urlHttp = url.parse(input.match(/Forwarding\s+(.+) -> http:.+:80/)[1])
      let urlWs = url.parse(input.match(/Forwarding\s+(.+) -> http:.+:81/)[1])
      let urlRtsp = url.parse(input.match(/Forwarding\s+(.+) -> .+:554/)[1])

      let httpUri = urlHttp.href.replace(/\/$/, '')
      let wsUri = urlWs.href.replace(/\/$/, '').replace('http', 'ws')
      let rtspUri = `rtsp://${urlRtsp.hostname}:${urlRtsp.port}`

      console.log(bold('Z Cam ngrok tunnels:'))
      console.log('http   ', httpUri)
      console.log('ws     ', wsUri)
      console.log('rtsp   ', rtspUri)
      console.log('')

      console.log(bold('As env vars:'))
      console.log(`ZCAM_URL=${httpUri}`)
      console.log(`ZCAM_WS_URL=${wsUri}`)
      console.log(`ZCAM_RTSP_URL=${rtspUri}/live_stream`)
      console.log('')

      console.log(bold('Test HTTP via curl:'))
      console.log(`curl $ZCAM_URL/ctrl/get?k=last_file_name`)
      console.log('')

      console.log(bold('Test WebSocket via wscat:'))
      console.log('wscat -c $ZCAM_WS_URL')
      console.log('')

      console.log(bold('Test RTSP via curl:'))
      console.log('curl -v $ZCAM_RTSP_URL')
      console.log('')

      console.log(bold('Play RTSP stream:'))
      console.log('vlc $ZCAM_RTSP_URL/live_stream')
      console.log('')

      console.log(bold('Run Shot Core server:'))
      console.log(`
ZCAM_URL=${httpUri} \\
ZCAM_WS_URL=${wsUri} \\
ZCAM_RTSP_URL=${rtspUri} \\
npm start
      `.trim())
      console.log('')

      console.log(bold('Forward to localhost :80/:81:'))
      console.log(`ncat --sh-exec "ncat ${urlHttp.hostname} 80" -l localhost 80 --keep-open`)
      console.log(`ncat --sh-exec "ncat ${urlWs.hostname} 80" -l localhost 81 --keep-open`)
      console.log(`ncat --sh-exec "ncat ${urlRtsp.hostname} ${urlRtsp.port}" -l localhost 554 --keep-open`)
    }
  } catch (err) {
    console.error('Could not parse STDIN')
    console.error(err)
  }
})()
