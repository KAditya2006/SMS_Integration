const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const otpSessionSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    index: true
  },
  otpHash: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: '3m' } // Auto delete after 3 minutes
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 5
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash OTP before saving
otpSessionSchema.pre('save', async function(next) {
  if (!this.isModified('otpHash')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.otpHash = await bcrypt.hash(this.otpHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to verify OTP
otpSessionSchema.methods.verifyOtp = async function(otp) {
  return await bcrypt.compare(otp, this.otpHash);
};

module.exports = mongoose.model('OtpSession', otpSessionSchema);