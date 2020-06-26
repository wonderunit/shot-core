# Z Cam Mock Server

If you don’t have access to a Z Cam, you can run the mock server:

```
DEBUG=shotcore:*,rtsp-streaming-server:* \
TAKE_MOV=./tmp/take.mov \
npm run zcam-mock-server
```

Environment vars:  
- `TAKE_MOV`, path to example take MOV downloaded from Z Cam. default is null, and no video will be served. If a JPG of the same basename exists, it will be served for thumbnail requests.   
- `DEBUG`: configure debug logging
- `PORT`, HTTP port, default :80

When the mock server is running, pass `ZCAM=127.0.0.1` to shot core server:
```
DEBUG=shotcore:* ZCAM=127.0.0.1 node ./server
```

## Mock Z Cam RTSP

The mock server runs an RTSP server for clients on :554.

Given a 5 second test file, e.g.:

```
ffmpeg \
  -f lavfi \
  -i testsrc2=size=1920x1080:rate=ntsc-film \
  -an \
  -vcodec h264 \
  -pix_fmt yuv420p \
  -f mp4 \
  -t 5 \
  stream.mp4
```

Can stream to the mock server, e.g.:
```
ffmpeg \
  -re \
  -stream_loop -1 \
  -i tmp/stream.mp4 \
  -c:v copy \
  -f rtsp \
  rtsp://127.0.0.1:5554/live_stream
```

Test the RTSP server with `ncat` (press ENTER twice after typing):

```
ncat --crlf 127.0.0.1 554
DESCRIBE rtsp://127.0.0.1/live_stream RTSP/1.0
CSeq: 2


```

Play:

```
ffplay rtsp://127.0.0.1/live_stream
```

## Testing

### Testing HTTP:

Testing the client against the mock z cam server:

```
node test/zcam-http-client.test.js
```

Can check HTTP with curl and streams with ffplay, e.g.:
```
curl http://127.0.0.1/info
ffplay http://127.0.0.1/mjpeg_stream -f mjpeg
ffplay rtsp://127.0.0.1/live_stream
```

### Testing WebSockets:

Globally install `wscat` from npm, e.g.:

```
npm install -g wscat
```

### Logging Websocket Messages Received From The Mock Server

```
wscat -P -c ws://127.0.0.1:81
```
