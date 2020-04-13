# Shot Core

## Getting Started

System Requirements:
- node
- ffmpeg

```
npm install
sqlite3 dev.sqlite3 < db/schema.sql
```

Given a Z Cam with IP `192.168.0.100`:

```
DEBUG=shotcore:* ZCAM=192.168.0.100 npm start
```

Starts a web UI listening at [http://localhost:4000](http://localhost:4000)

On macOS you can then seed the first project on the server by running (in another terminal):

`scripts/seed`

Environment vars:  
- `ZCAM`: address of Z Cam, default `10.98.33.1`  
- `PORT`: shot core server port, default 8000, proxied through browser-sync to 4000  
- `DEBUG`: configure `debug` library logging  

If you don’t have access to a Z Cam, you can run the [Z Cam Mock Server](./lib/zcam/mock-server/README.md) and start the server with:

```
DEBUG=shotcore:* ZCAM=127.0.0.1 npm start
```

For more, read [DEVELOPERS.md](DEVELOPERS.md).
