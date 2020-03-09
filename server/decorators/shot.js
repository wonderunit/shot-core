const getFocalLength = require('../../lib/getFocalLength')

const Board = require('./Board')

class Shot {
  static decorateCollection (collection) {
    return collection.map(shot => new Shot(shot))
  }

  constructor (shot) {
    for (let property in shot) {
      this[property] = shot[property]
    }

    this.boards = JSON.parse(this.boards_json).map(board => new Board(board))
  }

  get firstBoardWithDialogue () {
    return this.boards.find(board => board.dialogue != null)
  }

  get firstBoardWithSg () {
    return this.boards.find(board => board.sg)
  }

  get thumbnail () {
    let board = this.firstBoardWithDialogue || this.boards[0]
    return board.thumbnail
  }

  getCameraFocalLength (aspectRatio) {
    if (this.firstBoardWithSg) {
      Math.floor(
        getFocalLength(
          this.firstBoardWithSg.cameraFov,
          aspectRatio
        )
      ) + 'mm'
    }
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

module.exports = Shot
