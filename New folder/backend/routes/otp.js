const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const twilioService = require('../utils/twilioService');
const auth = require('../middleware/auth');
const { otpRateLimiter, verifyRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

/**
 * Send OTP to phone number
 */
router.post('/send-otp', otpRateLimiter, async (req, res) => {
  try {
    const { phone } = req.body;

    // Validate phone number
    if (!phone || !/^\+?[1-9]\d{1,14}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Valid phone number required (E.164 format: +1234567890)'
      });
    }

    // Send OTP via Twilio
    const result = await twilioService.sendOtp(phone);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to send OTP. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully'
    });

  } catch (error) {
    console.error('❌ Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Verify OTP and login/register user
 */
router.post('/verify-otp', verifyRateLimiter, async (req, res) => {
  try {
    const { phone, code } = req.body;

    // Validate input
    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        message: 'Phone and OTP code are required'
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: 'OTP must be 6 digits'
      });
    }

    // Verify OTP with Twilio
    const verification = await twilioService.verifyOtp(phone, code);
    
    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.error || 'Invalid OTP'
      });
    }

    // Find or create user
    let user = await User.findOne({ phone });
    
    if (!user) {
      user = new User({ phone });
      await user.save();
      console.log(`✅ New user created: ${phone}`);
    } else {
      user.lastLogin = new Date();
      await user.save();
      console.log(`✅ User logged in: ${phone}`);
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        phone: user.phone 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        phone: user.phone,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Get current user info (protected route)
 */
router.get('/user', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        phone: req.user.phone,
        lastLogin: req.user.lastLogin,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;