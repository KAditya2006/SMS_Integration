const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
});

// Update lastLogin on save
userSchema.pre('save', function(next) {
  if (this.isModified('phone')) {
    return next();
  }
  this.lastLogin = new Date();
  next();
});

module.exports = mongoose.model('User', userSchema);