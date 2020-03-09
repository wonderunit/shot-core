const asDateOrNull = dateISOString => 
  dateISOString
    ? new Date(dateISOString)
    : null

module.exports = asDateOrNull
