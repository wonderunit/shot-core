const pad = (str, n = 3) => str.toString().padStart(n, 0)

function filenameForFootage ({ scene_number, shot_number, take_number, id, impromptu }) {
  if (impromptu == null) throw new Error('missing param: impromptu')

  return `scene_${pad(scene_number)}_shot_${impromptu ? 'i' : ''}${pad(shot_number, 4)}_take_${pad(take_number)}_id_${id}.mov`
}

function filenameForProxy ({ scene_number, shot_number, take_number, id, impromptu }) {
  if (impromptu == null) throw new Error('missing param: impromptu')

  return `scene_${pad(scene_number)}_shot_${impromptu ? 'i' : ''}${pad(shot_number, 4)}_take_${pad(take_number)}_id_${id}-PROXY.mov`
}

function filenameForStream ({ scene_number, shot_number, take_number, id, impromptu }) {
  if (impromptu == null) throw new Error('missing param: impromptu')

  return `scene_${pad(scene_number)}_shot_${impromptu ? 'i' : ''}${pad(shot_number, 4)}_take_${pad(take_number)}_id_${id}-STREAM.mp4`
}

function filenameForThumbnail ({ scene_number, shot_number, take_number, id, impromptu }) {
  if (impromptu == null) throw new Error('missing param: impromptu')

  return `scene_${pad(scene_number)}_shot_${impromptu ? 'i' : ''}${pad(shot_number, 4)}_take_${pad(take_number)}_id_${id}.jpg`
}

class Take {
  static decorateCollection (collection) {
    return collection.map(take => new Take(take))
  }

  static filenameForFootage ({ scene_number, shot_number, take_number, id, impromptu }) {
    return filenameForFootage ({ scene_number, shot_number, take_number, id, impromptu })
  }
  static filenameForProxy ({ scene_number, shot_number, take_number, id, impromptu }) {
    return filenameForProxy ({ scene_number, shot_number, take_number, id, impromptu })
  }
  static filenameForStream ({ scene_number, shot_number, take_number, id, impromptu }) {
    return filenameForStream ({ scene_number, shot_number, take_number, id, impromptu })
  }
  static filenameForThumbnail ({ scene_number, shot_number, take_number, id, impromptu }) {
    return filenameForThumbnail ({ scene_number, shot_number, take_number, id, impromptu })
  }


  filenameForFootage ({ scene_number, shot_number, impromptu }) {
    return filenameForFootage({
      scene_number, shot_number, impromptu,
      take_number: this.take_number, id: this.id
    })
  }

  filenameForProxy ({ scene_number, shot_number, impromptu }) {
    return filenameForProxy({
      scene_number, shot_number, impromptu,
      take_number: this.take_number, id: this.id
    })
  }

  filenameForStream ({ scene_number, shot_number, impromptu }) {
    return filenameForStream({
      scene_number, shot_number, impromptu,
      take_number: this.take_number, id: this.id
    })
  }

  filenameForThumbnail ({ scene_number, shot_number, impromptu }) {
    return filenameForThumbnail({
      scene_number, shot_number, impromptu,
      take_number: this.take_number, id: this.id
    })
  }

  constructor (take) {
    for (let property in take) {
      this[property] = take[property]
    }

    this.metadata = JSON.parse(this.metadata_json)
  }
}

module.exports = Take
