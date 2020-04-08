# Shot Core

## Running in development environment

Given a Z Cam listening on `http://192.168.0.100`:

```
npm install
sqlite3 dev.sqlite3 < db/schema.sql
DEBUG=shotcore:* ZCAM_URL=http://192.168.0.100 npm start
```

Starts a web UI listening at [http://localhost:3000](http://localhost:3000)

Environment vars:  
- `ZCAM_URL`: full url to Z Cam, default is `http://localhost:8080`  
- `ZCAM_WS_URL`: override Z Cam WebSockets URL (default is based on `ZCAM_URL`, port + 1)  
- `ZCAM_RTSP_URL`: override Z Cam RTSP URL, default is based on `ZCAM_URL` hostname, port 80  
- `PORT`: web UI server port, default is 3000  
- `DEBUG`: configure debug logging

If you don’t have access to a Z Cam, you can run the mock server:
```
DEBUG=shotcore TAKE_MOV=./A001MOVFILE_0001.MOV npm start zcam-mock-server
```
Listens for HTTP on `:8080` and WS on `:8081`.  
`TAKE_MOV` is a path to an example take downloaded from the Z Cam to use as a placeholder video.  

For simulating an RTSP server, can run `live555MediaServer` or similar on port `:80/:554`.

To connect to a mock server:
```
DEBUG=shotcore:*
ZCAM_URL=http://localhost:8080 \
ZCAM_WS_URL=http://localhost:8081 \
ZCAM_RTSP_URL=rtsp://localhost/live_stream.264 \
npm start
```

For more, read [DEVELOPERS.md](DEVELOPERS.md).
