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
npm start zcam-mock-server
```
Listens on `:8080`.

For more, read [DEVELOPERS.md](DEVELOPERS.md).
