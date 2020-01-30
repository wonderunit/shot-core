function uidGen (chars) {
  return (
    "00000" +
      (Math.random() * Math.pow(36, chars) << 0)
        .toString(36)
    )
    .slice(-chars)
    .toUpperCase()
}
