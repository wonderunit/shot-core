const fs = require('fs')
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

function durationOr (value, defaultValue) {
  return value == null ? defaultValue : value
}

function insertProject ({ name, scriptPath }) {
  return scriptPath
    ? ['INSERT INTO projects (name, script_path) VALUES (?, ?)', name, scriptPath]
    : ['INSERT INTO projects (name) VALUES (?)', name]
}

function insertScene ({ scene, sceneNumber, projectId, storyboarderPath, scriptData = {} }) {
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

  let { slugline } = scriptData

  return sql({
    table: 'scenes',
    insert: {
      project_id: projectId,
      scene_number: sceneNumber,
      metadata_json: metadataJson,
      storyboarder_path: storyboarderPath,
      slugline
    }
  })
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

  return sql({
    table: 'shots',
    insert: {
      project_id: projectId,
      scene_id: sceneId,
      shot_number: shotNumber,
      duration,

      // TODO grab action, dialogue, and notes from first board?

      boards_json
    }
  })
}

// startAt: string in sqlite-compatible date format (e.g.: new Date().toISOString())
function insertSchedule ({ projectId, startAt }) {
  return [
    'INSERT INTO schedules (project_id, start_at) VALUES (?, ?)',
    projectId, startAt
  ]
}

function insertEventForShot ({ projectId, sceneId, scheduleId, shotId, rank, duration, startAt }) {
  return [
    'INSERT INTO events (project_id, scene_id, schedule_id, shot_id, rank, duration, start_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    projectId, sceneId, scheduleId, shotId, rank, duration, startAt
  ]
}

function sql ({ table, insert }) {
  for (let key in insert) {
    if (insert[key] === undefined) delete insert[key]
  }

  let keys = Object.keys(insert).join(',')
  let values = Object.values(insert)
  let placeholders = values.map(() => '?').join(',')

  return [
    `INSERT INTO ${table} (${keys}) VALUES (${placeholders})`,
    values
  ]
}

const fountain = require('../vendor/fountain')
const { parse } = require('../lib/fountain/fountain-data-parser')

const filenameify = string =>
  string
    .substring(0, 50)
    .replace(/\|&;\$%@"<>\(\)\+,/g, '')
    .replace(/\./g, '')
    .replace(/ - /g, ' ')
    .replace(/ /g, '-')
    .replace(/[|&;/:$%@"{}?|<>()+,]/g, '-')

const getSceneFolderName = node => {
  let desc = node.synopsis
    ? node.synopsis
    : node.slugline

  return `Scene-${node.scene_number}-${filenameify(desc)}-${node.scene_id}`
}

function getSceneListFromFountain ({ script }) {
  let { tokens } = fountain.parse(script)
  let parsed = parse(tokens)

  return Object.values(parsed)
    .filter(node => node.type === 'scene')
    .map(node => {
      let name = getSceneFolderName(node)

      return {
        name,
        storyboarderFilePath: path.join('storyboards', name, `${name}.storyboarder`),
        node
      }
    })
}

async function importScript (run, { script, scriptPath, pathToFountainFile }) {
  const sourcePath = path.dirname(scriptPath)

  let projectId = (await run(...insertProject({
    name: path.basename(scriptPath, '.fountain'),
    scriptPath
  }))).lastID

  let scenes = getSceneListFromFountain({ script }).map(folder => {
    let scene = JSON.parse(fs.readFileSync(path.join(sourcePath, folder.storyboarderFilePath)))

    return {
      folder,
      scene,
      pathToStoryboarderFile: path.join(
        path.dirname(pathToFountainFile),
        folder.storyboarderFilePath
      )
    }
  })

  let results = []
  for (let { folder, scene, pathToStoryboarderFile } of scenes) {
    let sceneNumber = folder.node.scene_number
    let slugline = folder.node.slugline

    // let id = folder.node.scene_id
    // let synopsis = folder.node.synopsis
    // let time = folder.node.time
    // let duration = folder.node.duration

    let scriptData = {
      slugline
    }
    results.push(
      await importScene(run, { scene, sceneNumber, pathToStoryboarderFile, projectId, scriptData })
    )
  }
  return results
}

async function importScene (run, {
  scene,
  pathToStoryboarderFile,
  projectId,
  sceneNumber = 1,
  scriptData = {}
}) {
  let sceneId = (await run(...insertScene({
    scene,
    sceneNumber,
    projectId,
    storyboarderPath: pathToStoryboarderFile,
    scriptData
  }))).lastID
  let shots = scene.boards.reduce(groupBy(board => board.newShot), [])
  let shotIds = []
  for (let shot of shots) {
    let shotNumber = shotIds.length + 1
    let shotId = (await run(...insertShot({ shot, shotNumber, scene, projectId, sceneId }))).lastID
    shotIds.push(shotId)
  }

  return {
    projectId,
    sceneId,
    shotIds
  }
}

module.exports = {
  insertProject,
  insertSchedule,
  insertEventForShot,

  importScript,
  importScene
}
