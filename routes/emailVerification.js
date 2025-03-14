const express = require('express');
const User = require('../models/User');
const { sendVerificationEmail } = require('../utils/email');
const router = express.Router();

// Verify OTP
const MAX_OTP_ATTEMPTS = 3;
const OTP_COOLDOWN_PERIOD = 15 * 60 * 1000; // 15 minutes

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ message: 'No OTP found. Please request a new one' });
    }

    if (Date.now() > user.otpExpiry) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one' });
    }

    // Check OTP attempts
    if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
      const cooldownRemaining = OTP_COOLDOWN_PERIOD - (Date.now() - user.lastOtpRequest);
      if (cooldownRemaining > 0) {
        return res.status(429).json({
          message: 'Too many attempts. Please try again later',
          cooldownRemaining: Math.ceil(cooldownRemaining / 1000)
        });
      } else {
        // Reset attempts after cooldown period
        user.otpAttempts = 0;
      }
    }

    if (user.otp !== otp) {
      user.otpAttempts += 1;
      await user.save();
      return res.status(400).json({
        message: 'Invalid OTP',
        remainingAttempts: MAX_OTP_ATTEMPTS - user.otpAttempts
      });
    }

    user.emailVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Error verifying OTP' });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    // Rate limiting for OTP requests
    const lastRequest = user.lastOtpRequest ? new Date(user.lastOtpRequest) : new Date(0);
    const timeSinceLastRequest = Date.now() - lastRequest.getTime();
    
    if (timeSinceLastRequest < 60000) { // 1 minute cooldown
      return res.status(429).json({
        message: 'Please wait before requesting a new OTP',
        remainingTime: Math.ceil((60000 - timeSinceLastRequest) / 1000)
      });
    }

    // Reset attempts if cooldown period has passed
    if (timeSinceLastRequest >= OTP_COOLDOWN_PERIOD) {
      user.otpAttempts = 0;
    }

    // Generate secure OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    user.lastOtpRequest = new Date();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 3600000); // 1 hour expiry
    await user.save();

    // Send verification email
    await sendVerificationEmail(email, otp);

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error resending OTP:', error);
    res.status(500).json({ message: 'Error sending OTP' });
  }
});

module.exports = router;