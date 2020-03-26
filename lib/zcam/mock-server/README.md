# Z Cam Mock Server

No Z Cam? Run this mock server to do basic testing locally.

`npm run zcam-mock-server`

By default, listens to :8080 for HTTP and :8081 for WebSockets. Can configure with `PORT` env var.

Testing HTTP:

```
curl http://localhost:8080/info
curl http://localhost:8080/mjpeg_stream | ffplay -
```

Testing WebSockets:

```
npm install -g wscat
wscat -P -c ws://localhost:8081
```

Shot Core will try to use the mock server by default, which is the same behavior as setting the `ZCAM_URL` to `http://localhost:8080`, e.g.:

`ZCAM_URL=http://localhost:8080 npm start`
