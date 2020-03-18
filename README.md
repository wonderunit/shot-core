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
- `PORT`: default is 3000  

If you don’t have access to a Z Cam, you can run the mock server:
```
npm start zcam-mock-server
```
Listens on `:8080`.

For more, read [DEVELOPERS.md](DEVELOPERS.md).
