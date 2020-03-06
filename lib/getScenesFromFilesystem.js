const fs = require('fs')
const path = require('path')

const fountain = require('../vendor/fountain')
const { parse } = require('./fountain/fountain-data-parser')

const filenameify = string =>
  string
    .substring(0, 50)
    .replace(/\|&;\$%@"<>\(\)\+,/g, '')
    .replace(/\./g, '')
    .replace(/ - /g, ' ')
    .replace(/ /g, '-')
    .replace(/[|&;/:$%@"{}?|<>()+,]/g, '-')

const getSceneFolderName = (node, desc) =>
  `Scene-${node.scene_number}-${filenameify(desc)}-${node.scene_id}`

function getSceneNodesFromFountain (script) {
  let { tokens } = fountain.parse(script)
  let parsed = parse(tokens)
  return Object.values(parsed).filter(node => node.type === 'scene')
}

function getScenesFromFilesystem ({ script, scriptPath }) {
  let sourcePath = path.dirname(scriptPath)

  return getSceneNodesFromFountain(script)
    .reduce((results, node) => {
      // try finding the folder by synopsis first, then slugline
      //
      // if you start with only slugline
      //  and then add synopsis later
      //   the created folder name will still use the slugline
      let storyboarderPath = [node.synopsis, node.slugline]
        .filter(Boolean)
        .map(desc => getSceneFolderName(node, desc))
        .map(name => path.join('storyboards', name, `${name}.storyboarder`))
        .find(storyboarderPath => fs.existsSync(path.join(sourcePath, storyboarderPath)))

      if (storyboarderPath) {
        let scene = JSON.parse(fs.readFileSync(path.join(sourcePath, storyboarderPath)))

        // let id = node.scene_id
        // let synopsis = node.synopsis
        // let time = node.time
        // let duration = node.duration

        let section = node.script.find(node => node.type == 'section')
        let description = section ? section.text : null

        results.push({
          scene,
          sceneNumber: node.scene_number,
          storyboarderPath,
          scriptData: {
            slugline: node.slugline,
            description,
            synopsis: node.synopsis
          }
        })
      }

      return results
    },
    [])
}

module.exports = getScenesFromFilesystem