# Shot Core

## Getting Started

### System Requirements

- node
- ffmpeg

### Setup

```
npm install
sqlite3 dev.sqlite3 < db/schema.sql
npm start
```

Starts the web UI listening at [http://localhost:4000](http://localhost:4000). Attempts to connect to the default Z Cam address (`10.98.33.1`).

On macOS, you can then seed a test project on the server by running (in another terminal):

`scripts/seed`

Environment vars:  
- `ZCAM`: address of Z Cam, default `10.98.33.1`  
- `PORT`: Shot Core server port, default `8000` (proxied through browser-sync to `4000`)  
- `DEBUG`: configure `debug` library logging. `DEBUG=shotcore:*` to view Shot Core specific logs.  

If you don’t have access to a Z Cam, you can run the [Z Cam Mock Server](./lib/zcam/mock-server/README.md), which will listen locally, and start the Shot Core server with:

```
DEBUG=shotcore:* ZCAM=127.0.0.1 npm start
```

For more, read [DEVELOPERS.md](DEVELOPERS.md).
