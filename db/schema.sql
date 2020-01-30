CREATE TABLE projects (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  script_path TEXT
);

CREATE TABLE scenes(
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  scene_number INTEGER,
  metadata_json JSON,
  storyboarder_path TEXT,
  slugline TEXT
);

CREATE TABLE shots(
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  scene_id INTEGER NOT NULL,
  shot_number INTEGER,
  duration INTEGER,
  boards_json JSON
);

CREATE TABLE events(
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  scene_id INTEGER NOT NULL,
  shot_id INTEGER,
  rank INTEGER NOT NULL,
  duration INTEGER,
  start_at TEXT NOT NULL
);

CREATE TABLE takes(
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  scene_id INTEGER NOT NULL,
  shot_id INTEGER NOT NULL
);
