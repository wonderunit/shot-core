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

For more, read DEVELOPERS.md
