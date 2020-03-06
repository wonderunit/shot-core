// via THREE

const filmGauge = 35

const DEG2RAD = Math.PI / 180

const getFilmHeight = aspect =>
  filmGauge / Math.max( aspect, 1 )

const getFocalLength = (fov, aspect) =>
  0.5 * getFilmHeight(aspect) / Math.tan( DEG2RAD * 0.5 * fov )

module.exports = getFocalLength
