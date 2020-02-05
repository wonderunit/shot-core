# Notes for Developers

## Quick Testing

Create a new database, run the first two tests, and seed with additional data. Then make the test database the development database so we can browse via the web server.

    rm dev.sqlite3
    rm test.sqlite3
    sqlite3 test.sqlite3 < db/schema.sql
    node test/importers.test.js
    node test/scheduler.test.js
    sqlite3 test.sqlite3 < db/seeds.sql
    cp test.sqlite3 dev.sqlite3

## Data

Database is sqlite.  
For macOS, the open-source [“DB Browser for SQLite”](https://github.com/sqlitebrowser/sqlitebrowser) can be used to inspect the database.

### Dates

sqlite does not have a date type, [it uses TEXT for dates](https://www.sqlite.org/lang_datefunc.html), and provides built-in helper functions to use them for date comparison.  
Per the sqlite docs, we store all dates in the system as TEXT in the ISO-8601 format in UTC time  
e.g.: `new Date().toISOString() = 2020-01-31T18:27:31.675Z`  
We convert to local time when displaying to the user.  
We use `date-fns` and `date-fns-tz` for simple date calculations and formatting. ([API docs](https://date-fns.org/v2.9.0/docs/Getting-Started))

Shot durations are stored in milliseconds, as they are in board data for `.storyboarder` files.

### Schedules and Events

A schedule presents a list of events to a user  
A schedule has a start date.  

An event can be for a shot or for some other task  
An event has a rank within its schedule which determines the sort order  
An event can only be on one schedule. But multiple events, each on different schedules, can be associated with the same shot.  

### Projects and Scenes

In shot list server, a script-based project is a "project", but a single scene is ALSO a "project".

single scenes:
- project does not have a `script_path`
- `select * from scenes where scene.project_id = ?` returns a single row
- assets are stored in `public/uploads/scenes`

script-based projects:
- project has a `script_path`
- `select * from scenes where scene.project_id = ?` returns one or more rows
- assets are stored in `public/uploads/projects`

### Style

Generally we’re writing SQL variables `with_underscores` and JavaScript variables `camelCase`, as that’s the common style within each languages.

## URLs

For simplicity we currently use the database id for a resource in the URL, and NOT any resource-representitive number. For example, if a URL path was `/projects/53/scenes/31/shots/5/takes/29`, it would NOT be referring to the 31st scene, 5th shot, and 29th take. Those numbers are just database ids, NOT scene number, shot number, take number.

## Security

There is none! Shot List Server is not a secure web service, and is not meant to be hosted on an internet-accessible IP. It does a bunch of stuff for simplicity-sake (e.g.: hand-rolled SQL queries) that makes it a security risk.

No real data integrity checks. We don’t protect against errant data, e.g.: in a URL with project, scene, and shot ids, we trust that the project and scene ids you provide us are connected to the shot id you provide us.
