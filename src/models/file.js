const mongoose = require('mongoose')

let fileSchema = new mongoose.Schema({
  file: { 
    data: Buffer, 
    contentType: String,
    name: String 
  },
  missionId: {
    type: Number,
    // required: true
  },
  studentId: {
    type: Number
  },
  lawyerId: {
    type: Number
  }
})


module.exports = mongoose.model('File', fileSchema)
