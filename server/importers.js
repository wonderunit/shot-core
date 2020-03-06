const fs = require('fs-extra')
const path = require('path')

const getScenesFromFilesystem = require('../lib/getScenesFromFilesystem')

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

function transformSg (sg) {
  return {
    // include the sg version
    version: sg.version,
    data: {
      // include the active camera (we need it for FOV)
      activeCamera: sg.data.activeCamera,
      sceneObjects: {
        [sg.data.activeCamera]: sg.data.sceneObjects[sg.data.activeCamera]
      }
    }
  }
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

  let { slugline, description, synopsis } = scriptData

  return sql({
    table: 'scenes',
    insert: {
      project_id: projectId,
      scene_number: sceneNumber,
      metadata_json: metadataJson,
      storyboarder_path: storyboarderPath,
      slugline,
      description,
      synopsis
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
      url,
      duration,
      number,
      shot,
      time,
      dialogue,
      action,
      notes
    } = board

    let sg = board.sg
      ? transformSg(board.sg)
      : undefined

    return {
      uid,
      url,
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

function importScript (run, { projectId, script, scriptPath, pathToFountainFile }) {
  let scenes = getScenesFromFilesystem({ script, scriptPath })

  let results = []
  for (let { scene, sceneNumber, storyboarderPath, scriptData } of scenes) {
    results.push(
      importScene(run, {
        scene,
        sceneNumber,
        storyboarderPath: path.join(
          path.dirname(pathToFountainFile),
          storyboarderPath
        ),
        scriptData,
        
        projectId
      })
    )
  }
  return results
}

function importScene (run, {
  scene,
  storyboarderPath,
  projectId,
  sceneNumber = 1,
  scriptData = {}
}) {
  let sceneId = run(...insertScene({
    scene,
    sceneNumber,
    projectId,
    storyboarderPath,
    scriptData
  })).lastInsertRowid
  let shots = scene.boards.reduce(groupBy(board => board.newShot), [])
  let shotIds = []
  for (let shot of shots) {
    let shotNumber = shotIds.length + 1
    let shotId = run(...insertShot({
      shot,
      shotNumber,
      scene,
      projectId,
      sceneId
    })).lastInsertRowid
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

  importScript,
  importScene
}
