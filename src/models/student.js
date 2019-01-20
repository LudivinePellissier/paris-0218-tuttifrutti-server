const mongoose = require('mongoose')

let studentSchema = new mongoose.Schema({

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  phone: {
    type: Number,
    required: true
  },
  levelStudy: {
    type: String,
    required: true
  },
  field: {
    type: String,
    required: true
  },
  activated: {
    type: Boolean,
    required: true
  },
  approved: {
    type: Boolean,
    required: true
  },
  missions: {
    type: Array
  }
})

module.exports = mongoose.model('Student', studentSchema)
