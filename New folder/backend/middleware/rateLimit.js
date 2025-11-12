const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for OTP sending (1 request per 30 seconds per phone)
 */
const otpRateLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: 1,
  message: {
    success: false,
    message: 'Too many OTP requests. Please wait 30 seconds before trying again.'
  },
  keyGenerator: (req) => req.body.phone // Limit by phone number
});

/**
 * Rate limiter for OTP verification (5 attempts per 10 minutes)
 */
const verifyRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many verification attempts. Please try again later.'
  },
  keyGenerator: (req) => req.body.phone
});

module.exports = {
  otpRateLimiter,
  verifyRateLimiter
};