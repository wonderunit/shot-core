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

  get posterframe () {
    let board = this.firstBoardWithDialogue || this.boards[0]
    return board.posterframe
  }

  get cameraPlot () {
    return this.firstBoardWithSg ? this.firstBoardWithSg.cameraPlot : null
  }

  getCameraFocalLength (aspectRatio) {
    if (this.firstBoardWithSg) {
      return Math.floor(
        getFocalLength(
          this.firstBoardWithSg.cameraFov,
          aspectRatio
        )
      ) + 'mm'
    }
  }
}

module.exports = Shot
