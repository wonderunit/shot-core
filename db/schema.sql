CREATE TABLE projects (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  name TEXT
);
INSERT INTO projects (name) VALUES(
  'Example Multi-Scene Project'
);

CREATE TABLE scenes(
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  scene_number INTEGER
);
INSERT INTO scenes(project_id, scene_number) VALUES(1, 1);
INSERT INTO scenes(project_id, scene_number) VALUES(1, 2);
INSERT INTO scenes(project_id, scene_number) VALUES(1, 3);

CREATE TABLE shots(
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  scene_id INTEGER NOT NULL
);
INSERT INTO shots(project_id, scene_id) VALUES(1, 1);

CREATE TABLE events(
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  shot_id INTEGER NOT NULL,
  date TEXT
);
INSERT INTO events(project_id, shot_id, date) VALUES(
  1, 1, '2020-01-28T16:00:00.000Z'
);
INSERT INTO events(project_id, shot_id, date) VALUES(
  1, 1, '2020-01-29T16:00:00.000Z'
);
INSERT INTO events(project_id, shot_id, date) VALUES(
  1, 1, '2020-01-30T16:00:00.000Z'
);

CREATE TABLE takes(
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL
);
INSERT INTO takes(project_id) VALUES(1);
