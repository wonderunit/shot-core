const express = require('express')
const path = require('path')

const app = express()
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, './views'))
app.use(express.static('public'))

app.get('/', async (req, res) => {
  res.render('index')
})

app.get('/projects/:projectId', async (req, res) => {
  res.render('project')
})

app.get('/projects/:projectId/schedules/:startDate', async (req, res) => {
  // fake db lookup
  let { startDate } = req.params
  let days = {
    '20200128': { title: 'Tuesday, 28 Jan' },
    '20200129': { title: 'Wednesday, 29 Jan' },
    '20200130': { title: 'Thursday, 30 Jan' }
  }
  let day = days[startDate]
  res.render('schedule', { day })
})

app.get('/projects/:projectId/scenes/:sceneId/shots/:shotId/takes/:takeId', async (req, res) => {
  res.render('take')
})


const port = 3000
app.listen(port, () => {
  console.log(`Listening on :${port}`)

  if (process.send) {
    process.send('online')
  }
})
