const getFocalLength = require('../../lib/getFocalLength')

class Board {
  static decorateCollection (collection) {
    return collection.map(board => new Board(board))
  }

  constructor (board) {
    for (let property in board) {
      this[property] = board[property]
    }
  }

  get thumbnail () {
    return `${this.url.replace(/.png$/, '-thumbnail.png')}`
  }

  get cameraFov () {
    let { sg } = this
    if (sg) {
      let camera = sg.data.sceneObjects[sg.data.activeCamera]
      return camera.fov
    }
  }

  getCameraFocalLength (aspectRatio) {
    return this.cameraFov == null
      ? undefined
      : Math.floor(getFocalLength(this.cameraFov, aspectRatio)) + 'mm'
  }

  get combinedDialogue () {
    this.boards
      .map(board => board.dialogue)
      .filter(Boolean)
      .join(' ')
  }

  get combinedAction () {
    this.boards
      .map(board => board.action)
      .filter(Boolean)
      .join(' ')
  }
}

module.exports = Board
