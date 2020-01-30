const path = require('path')

const groupBy = (fn) => (groups, item) => {
  if (fn(item) || groups.length == 0) {
    groups.push([])
  }
  let group = groups[groups.length - 1]
  group.push(item)
  return groups
}

function sum (a, b) {
  return a + b
}

function durationOr(value, defaultValue) {
  return value == null ? defaultValue : value
}

function nameFromPath(pathToStoryboarderFile) {
  return path.basename(pathToStoryboarderFile, '.storyboarder')
}

function insertProject ({ name }) {
  return ['INSERT INTO projects (name) VALUES (?)', name]
}

function insertScene ({ scene, sceneNumber, projectId, storyboarderPath }) {
  let {
    version,
    aspectRatio,
    fps,
    defaultBoardTiming
  } = scene

  let metadataJson = JSON.stringify({
    version,
    aspectRatio,
    fps,
    defaultBoardTiming
  })

  return [
    `INSERT INTO scenes
    (project_id, scene_number, metadata_json, storyboarder_path)
    VALUES (?, ?, ?, ?)`,
    projectId, sceneNumber, metadataJson, storyboarderPath
  ]
}

function insertShot ({ shot, shotNumber, scene, projectId, sceneId }) {
  // total duration in msecs
  let duration = shot
    .map(board => durationOr(board.duration, scene.defaultBoardTiming))
    .reduce(sum)

  let boards = shot.map((board, boardIndex) => {
    // uid
    // url
    // newShot
    // lastEdited
    // layers
    // number
    // shot
    // time
    // lineMileage
    // sg
    // if (sg) {
    //   sg.version
    //   sg.data
    // }
    let {
      uid,
      duration,
      number,
      shot,
      time,
      dialogue,
      action,
      notes
    } = board

    let sg = board.sg
      ? { version: board.sg.version }
      : undefined

    return {
      uid,
      duration,
      number,
      shot,
      time,
      dialogue,
      action,
      notes,
      sg
    }
  })

  let boards_json = JSON.stringify(boards)

  let insert = {
    project_id: projectId,
    scene_id: sceneId,
    shot_number: shotNumber,
    duration,

    // TODO grab action, dialogue, and notes from first board?

    boards_json
  }

  let table = 'shots'

  let keys = Object.keys(insert).join(',')
  let values = Object.values(insert)
  let placeholders = values.map(() => '?').join(',')

  return [
    `INSERT INTO ${table} (${keys}) VALUES (${placeholders})`,
    values
  ]
}

function insertEvent({ projectId, sceneId, shotId, rank, duration, startAt }) {
  return [
    'INSERT INTO events (project_id, scene_id, shot_id, rank, duration, start_at) VALUES (?, ?, ?, ?, ?, ?)',
    projectId, sceneId, shotId, rank, duration, startAt
  ]
}

function importScript (pathToFountainFile) {
  // load script
  // import each named folder
}

async function importScene (run, { scene, pathToStoryboarderFile }) {
  let projectId = (await run(...insertProject({
    name: nameFromPath(pathToStoryboarderFile)
  }))).lastID
  let sceneId = (await run(...insertScene({
    scene,
    sceneNumber: 1,
    projectId,
    storyboarderPath: pathToStoryboarderFile
  }))).lastID
  let shots = scene.boards.reduce(groupBy(board => board.newShot), [])
  let shotIds = []
  let eventIds = []
  for (let shot of shots) {
    let shotNumber = shotIds.length + 1
    let shotId = (await run(...insertShot({ shot, shotNumber, scene, projectId, sceneId }))).lastID

    let rank = shotNumber // TODO
    let duration = durationOr(shot.duration, scene.defaultBoardTiming)
    let startAt = (new Date()).toISOString()
    let eventId = (await run(...insertEvent({ projectId, sceneId, shotId, rank, duration, startAt }))).lastID

    shotIds.push(shotId)
    eventIds.push(eventId)
  }

  return {
    projectId,
    sceneId,
    shotIds,
    eventIds
  }
}

module.exports = {
  importScene
}
