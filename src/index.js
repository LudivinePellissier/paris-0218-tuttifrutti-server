const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const routes = require('./routes/routes.js')
require('./database.js')

const port = process.env.PORT || 5000

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE')
  res.header('Access-Control-Allow-Headers', '*')
  next()
})

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`, {
    cookie: req.headers.cookie,
    token: req.headers.authorization
  })
  next()
})

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))

// ROUTES

app.get('/', (req, res) => {
  res.json('A SUCCESFUL FETCH on /')
})

app.use('/', routes)

app.listen(port, () => console.log(`server listening on port: ${port}`))
