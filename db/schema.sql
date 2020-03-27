CREATE TABLE projects (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  script_path TEXT,
  slater_event_id INTEGER
);

CREATE TABLE scenes(
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  scene_number INTEGER,
  metadata_json JSON,
  storyboarder_path TEXT,
  slugline TEXT,
  description TEXT,
  synopsis TEXT
);

CREATE TABLE shots(
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  scene_id INTEGER NOT NULL,
  shot_number INTEGER,
  duration INTEGER,
  shotType TEXT,
  fStop TEXT,
  boards_json JSON
);

CREATE TABLE events(
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  scene_id INTEGER,
  shot_id INTEGER,
  rank INTEGER NOT NULL,
  start_at TEXT,
  duration INTEGER,
  event_type TEXT,
  description TEXT,
  metadata_json JSON
);

CREATE TABLE takes(
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  scene_id INTEGER NOT NULL,
  shot_id INTEGER NOT NULL,
  take_number INTEGER NOT NULL,
  ready_at TEXT,
  action_at TEXT,
  cut_at TEXT,
  filepath TEXT,
  downloaded BOOLEAN NOT NULL CHECK (downloaded IN (0,1))
);
