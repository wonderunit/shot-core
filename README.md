# Shot Core

## Running in development environment

```
npm install
sqlite3 dev.sqlite3 < db/schema.sql
npm start
```

Listens on [http://localhost:3000](http://localhost:3000)

Environment vars:  
- `ZCAM_URL`: full url to Z Cam, default is `http://localhost:8080`  
- `ZCAM_WS_URL`: force Z Cam WebSockets URL (if blank, will guess from `ZCAM_URL` w/ port + 1)
- `PORT`: default is 3000  
- `ZCAM_RTSP_URL`: override Z Cam RTSP URL, default is based on `ZCAM_URL` hostname, port 80  

If you don’t have access to a Z Cam, you can run the mock server:
```
DEBUG=shotcore TAKE_MOV=./A001MOVFILE_0001.MOV npm start zcam-mock-server
```
Listens for HTTP on `:8080` and WS on `:8081`.  
`TAKE_MOV` is a path to an example take downloaded from the Z Cam to use as a placeholder video.  

```

For more, read [DEVELOPERS.md](DEVELOPERS.md).
