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
