const mongoose = require('mongoose')

let avocatSchema = new mongoose.Schema({
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
  cabinet: {
    type: String
  },
  phone: {
    type: Number,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  zipCode: {
    type: Number,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  toque: {
    type: String
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
  }
})

module.exports = mongoose.model('Avocat', avocatSchema)
