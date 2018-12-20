const mongoose = require('mongoose')

let messageSchema = new mongoose.Schema({
  date: { 
    type: Number,
    required: true
  },
  missionId: {
    type: String,
    required: true
  },
  authorId: {
    type: String,
    required: true
  },
  authorName: {
    type: String,
    required: true
  },
  authorType: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true
  }
})


module.exports = mongoose.model('Message', messageSchema)
