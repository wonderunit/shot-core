function filenameForFootage ({ scene_number, shot_number, take_number, id }) {
  return `scene_${scene_number}_shot_${shot_number}_take_${take_number}_id_${id}.mov`
}

function filenameForProxy ({ scene_number, shot_number, take_number, id }) {
  return `scene_${scene_number}_shot_${shot_number}_take_${take_number}_id_${id}-PROXY.mov`
}

function filenameForStream ({ scene_number, shot_number, take_number, id }) {
  return `scene_${scene_number}_shot_${shot_number}_take_${take_number}_id_${id}-STREAM.mp4`
}

function filenameForThumbnail ({ scene_number, shot_number, take_number, id }) {
  return `scene_${scene_number}_shot_${shot_number}_take_${take_number}_id_${id}.jpg`
}

class Take {
  static decorateCollection (collection) {
    return collection.map(take => new Take(take))
  }

  static filenameForFootage ({ scene_number, shot_number, take_number, id }) {
    return filenameForFootage ({ scene_number, shot_number, take_number, id })
  }
  static filenameForProxy ({ scene_number, shot_number, take_number, id }) {
    return filenameForProxy ({ scene_number, shot_number, take_number, id })
  }
  static filenameForStream ({ scene_number, shot_number, take_number, id }) {
    return filenameForStream ({ scene_number, shot_number, take_number, id })
  }
  static filenameForThumbnail ({ scene_number, shot_number, take_number, id }) {
    return filenameForThumbnail ({ scene_number, shot_number, take_number, id })
  }


  filenameForFootage ({ scene_number, shot_number }) {
    return filenameForFootage({
      scene_number, shot_number,
      take_number: this.take_number, id: this.id
    })
  }

  filenameForProxy ({ scene_number, shot_number }) {
    return filenameForProxy({
      scene_number, shot_number,
      take_number: this.take_number, id: this.id
    })
  }

  filenameForStream ({ scene_number, shot_number }) {
    return filenameForStream({
      scene_number, shot_number,
      take_number: this.take_number, id: this.id
    })
  }

  filenameForThumbnail ({ scene_number, shot_number }) {
    return filenameForThumbnail({
      scene_number, shot_number,
      take_number: this.take_number, id: this.id
    })
  }

  constructor (take) {
    for (let property in take) {
      this[property] = take[property]
    }
  }
}

module.exports = Take
