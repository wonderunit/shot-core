// $ npm run zcam-mock-server
// $ node test/zcam-client.test.js
const express = require('express')

const responses = require('./data/responses')

const app = express()

app.set('port', process.env.PORT || 8080)

app.use((req, res, next) => {
  res.json = body => {
    res.set('Content-Type', 'application/json')
    res.send(JSON.stringify(body, null, 2))
  }
  next()
})

app.get('/info', (req, res) => res.send(responses.info))

app.get('/ctrl/get', (req, res) => {
  const { k } = req.query
  res.send(responses[`ctrl_get_${k}`])
})

app.get('/ctrl/card', (req, res) => {
  const { action } = req.query
  res.send(responses[`ctrl_card_${action}`])
})

app.get('/timeout', (req, res) => {
  setTimeout(() => res.sendStatus(200), 5000)
})

app.listen(app.get('port'), () => {
  console.log(`Z Cam mock server listening on :${app.get('port')}`)
})
