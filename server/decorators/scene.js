const { imagesPath } = require('../helpers')

class Scene {
  static decorateCollection (collection) {
    return collection.map(scene => new Scene(scene))
  }

  constructor (scene) {
    for (let property in scene) {
      this[property] = scene[property]
    }

    this.metadata_json = JSON.parse(this.metadata_json)
  }

  get imagesPath () {
    return imagesPath(this)
  }
}

module.exports = Scene
