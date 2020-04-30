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

    this.boards = this.boards_json
      ? JSON.parse(this.boards_json).map(board => new Board(board))
      : []
  }

  get firstBoardWithDialogue () {
    return this.boards.find(board => board.dialogue != null)
  }

  get firstBoardWithSg () {
    return this.boards.find(board => board.sg)
  }

  get thumbnail () {
    let board = this.firstBoardWithDialogue || this.boards[0]
    return board
      ? board.thumbnail
      : null
  }

  get posterframe () {
    let board = this.firstBoardWithDialogue || this.boards[0]
    return board
      ? board.posterframe
      : null
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

  toJSON () {
    return {
      ...this,
      boards_json: undefined,
      thumbnail: this.thumbnail,
      posterframe: this.posterframe,
      cameraPlot: this.cameraPlot
    }
  }
}

module.exports = Shot
