# Z Cam Mock Server

If you don’t have access to a Z Cam, you can run the mock server:

```
DEBUG=shotcore:* \
PORT=8080 \
TAKE_MOV=./A001MOVFILE_0001.MOV \
npm run zcam-mock-server
```

Environment vars:  
- `DEBUG`: configure debug logging
- `PORT`, HTTP port, WebSocket listens on `PORT+1`. default `8080` (so, WS on `8081`)  
- `TAKE_MOV`, path to example take downloaded from Z Cam. default is null, and no video will be served.  

To connect to a mock server:
```
DEBUG=shotcore:*
ZCAM_URL=http://localhost:8080 \
ZCAM_WS_URL=http://localhost:8081 \
ZCAM_RTSP_URL=rtsp://localhost/live_stream.264 \
npm start
```

Shot Core will try to use the mock server by default, so running `npm start` is the same as running `ZCAM_URL=http://localhost:8080 npm start`

## Mock Z Cam RTSP

The mock server doesn't provide mock RTSP, but you can simulate by running an RTSP server like live555MediaServer.

Given a 30 second test file, e.g.:

```
ffmpeg \
  -f lavfi \
  -i testsrc2=size=1920x1080:rate=ntsc-film \
  -an \
  -vcodec h264 \
  -pix_fmt yuv420p \
  -f mp4 \
  -t 30 \
  live_stream.264
```

Serve it with `live555MediaServer` (you can install this via `brew install openrtsp` on macOS).

```
live555MediaServer
```

By default, `live555MediaServer` will run on `:80/:554`.


Test the RTSP server with `ncat` (press ENTER twice after typing):

```
ncat --crlf localhost 80
DESCRIBE rtsp://localhost/live_stream.264 RTSP/1.0
CSeq: 2


```

Play:

```
ffplay rtsp://localhost/live_stream.264
```

Running the server with a mock `ZCAM_RTSP_URL`:

```
ZCAM_URL=http://localhost:8080 \
ZCAM_WS_URL=http://localhost:8081 \
ZCAM_RTSP_URL=rtsp://localhost/live_stream.264 \
npm start
```

## Testing

### Testing HTTP:

```
curl http://localhost:8080/info
curl http://localhost:8080/mjpeg_stream | ffplay -
```

### Testing WebSockets:

Globally install `wscat` from npm, e.g.:

```
npm install -g wscat
```

### Logging Websocket Messages Received From The Mock Server

```
wscat -P -c ws://localhost:8081
```

### Simulating Z Cam Websocket Messages

To simulate WebSocket messages as if they were sent from a camera, run a simple server on a new port, e.g. `8082`:

    $ wscat -l 8082

This will be the mock camera.

Then, override the `ZCAM_WS_URL` of the server:

    $ ZCAM_WS_URL=http://localhost:8082 npm start

Now the server will connect to `http://localhost:8082` via ws, and you can send it commands from the `wscat` session, e.g.:

    > {"what":"RecStarted"}
    > {"what":"RecStoped"}
