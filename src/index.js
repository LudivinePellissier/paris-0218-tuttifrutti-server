const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const routes = require('./routes/routes.js')
require('./database.js')

const port = process.env.PORT || 5000

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', '*')
  next()
})

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`)
  next()
})

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))

// ROUTES

app.get('/', (req, res) => {
  res.json('Welcome on LITTA !')
})

app.use('/', routes)

app.listen(port, () => console.log(`Server is listening on port: ${port}`))
