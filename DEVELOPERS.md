# Notes for Developers

## Testing

```
npm install
rm -f test.sqlite3
sqlite3 test.sqlite3 < db/schema.sql
npm t
```

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
A Project has one Schedule which has many Events.  
An Event can either belong to a Shot, or not (`shot_id` = `NULL`).  
An Event can be of type `day`, `shot`, or `note`.
When a Project is created, a Schedule is also created. All the Project’s Shots are automatically added as Events on a single day.

#### Sorting
Events are ordered by rank for their Day, and we use the ranking when displaying Events to a User.  
Users can re-arrange Events within a Day, or move an Event between Days.  

#### Adding Days
A User can insert Day "breaks". Any events further in ranking on the list than the inserted Day, up until the next Day, will be assigned to the new Day.  

#### Adding Events
Users can add Non-Shot Events to the Schedule. Currently the only Non-Shot Event type is `event_type` of `note`, which can have a `description`.

#### Scope Exclusions
No batch/group editing yet

### Projects and Scenes

In shot list server, a script-based project is a "project", but a single scene is ALSO a "project".

Script-Based Project:
- `project` has a `script_path` value
- has one or multiple `scenes` rows associated by `project_id`
- assets are stored in `public/uploads/projects`
  ```
  public/uploads/projects/1
    multi-scene.fountain
    storyboards/
      Scene-1-EXT-A-PLACE-DAY-1-ZX3ZM/
      storyboard.settings
  ```

Single Scene:
- `project` does not have a `script_path` value
- has only one `scenes` row associated by `project_id`
- assets are stored in `public/uploads/scenes`, e.g.:  
  ```
  public/uploads/scenes/1
    example.storyboarder
    images/
  ```

To clear the uploads folder(s):

    rm -rf public/uploads/projects/*
    rm -rf public/uploads/scenes/*

### Style

Generally we’re writing SQL variables `with_underscores` and JavaScript variables `camelCase`, as that’s the common style within each languages.

## URLs

For simplicity we currently use the database id for a resource in the URL, and NOT any resource-representitive number. For example, if a URL path was `/projects/53/scenes/31/shots/5/takes/29`, it would NOT be referring to the 31st scene, 5th shot, and 29th take. Those numbers are just database ids, NOT scene number, shot number, take number.

## Mock Z Cam Server

If you don’t have access to a Z Cam, you can run the mock server:

    PORT=8080 npm start zcam-mock-server

If `PORT` is not set, default HTTP port is `8080`
Default WebSocket port is `PORT+1`, so `8081`

### Simulating Z Cam WebSocket messages

To simulate WebSocket messages from the camera, globally install `wscat` from npm. Then you can run a simple server on a new port, e.g. `8082`:

    $ wscat -l 8082

... and override the `ZCAM_WS_URL` of the shot list server:

    $ ZCAM_WS_URL=http://localhost:8082 npm start

Then shot list server will connect to `http://localhost:8082` via ws, and you can send it commands from the `wscat` session, e.g.:

    > {"what":"RecStarted"}
    > {"what":"RecStoped"}

## Security

There is none! Shot List Server is not a secure web service, and is not meant to be hosted on an internet-accessible IP. It does a bunch of stuff for simplicity-sake (e.g.: hand-rolled SQL queries) that makes it a security risk.

No real data integrity checks. We don’t protect against errant data, e.g.: in a URL with project, scene, and shot ids, we trust that the project and scene ids you provide us are connected to the shot id you provide us.
