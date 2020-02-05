# Shot List Server

## Dev

```
npm install
sqlite3 dev.sqlite3 < db/schema.sql
npm start
```

Listens on [http://localhost:3000](http://localhost:3000)

## Test

```
rm test.sqlite3; sqlite3 test.sqlite3 < db/schema.sql
node test/importers.test.js
```

### Security

There is none! Shot List Server is not a secure web service, and is not meant to be hosted on an internet-accessible IP. It does a bunch of stuff for simplicity-sake (e.g.: hand-rolled SQL queries) that makes it a security risk.

No real data integrity checks. We don’t protect against errant data, e.g.: in a URL with project, scene, and shot ids, we trust that the project and scene ids you provide us are connected to the shot id you provide us.
