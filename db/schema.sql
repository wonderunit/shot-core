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
  id CHAR(7) PRIMARY KEY,
  project_id INTEGER NOT NULL,
  scene_id INTEGER NOT NULL,
  shot_id INTEGER NOT NULL,
  take_number INTEGER NOT NULL,
  ready_at TEXT,
  action_at TEXT,
  cut_at TEXT,
  filepath TEXT,
  downloaded BOOLEAN NOT NULL CHECK (downloaded IN (0,1)),
  rating INTEGER CHECK (rating BETWEEN 0 AND 5)
);

CREATE TRIGGER AutoGenerateUid
AFTER INSERT ON takes
FOR EACH ROW
WHEN (NEW.id IS NULL)
BEGIN
  UPDATE takes
  SET id = substr(lower(hex(randomblob(4))), 1, 7)
  WHERE rowid = NEW.rowid;
END;
