const express = require('express');
const User = require('../models/User');
const { sendVerificationEmail } = require('../utils/email');
const router = express.Router();

// Verify OTP
const MAX_OTP_ATTEMPTS = 3;
const COOLDOWN_PERIOD = 60 * 1000; // 1 minute in milliseconds

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

    // Check if user has exceeded maximum attempts
    if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
      const cooldownRemaining = COOLDOWN_PERIOD - (Date.now() - user.lastOtpRequest);
      if (cooldownRemaining > 0) {
        return res.status(429).json({
          message: `Too many attempts. Please try again in ${Math.ceil(cooldownRemaining / 1000)} seconds`,
          remainingAttempts: 0,
          cooldownRemaining: Math.ceil(cooldownRemaining / 1000)
        });
      }
      // Reset attempts after cooldown period
      user.otpAttempts = 0;
    }

    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({
        message: 'No OTP found. Please request a new one',
        remainingAttempts: MAX_OTP_ATTEMPTS
      });
    }

    if (Date.now() > user.otpExpiry) {
      return res.status(400).json({
        message: 'OTP has expired. Please request a new one',
        remainingAttempts: MAX_OTP_ATTEMPTS
      });
    }

    // Check cooldown period
    if (user.cooldownExpiry && Date.now() < user.cooldownExpiry.getTime()) {
      const remainingTime = user.cooldownExpiry.getTime() - Date.now();
      return res.status(429).json({
        message: 'Too many attempts. Please try again later',
        cooldownRemaining: Math.ceil(remainingTime / 1000),
        remainingAttempts: 0
      });
    }

    // Reset attempts if cooldown has expired
    if (user.cooldownExpiry && Date.now() >= user.cooldownExpiry.getTime()) {
      user.otpAttempts = 0;
      user.cooldownExpiry = null;
    }

    if (user.otp !== otp) {
      user.otpAttempts += 1;
      
      // Set cooldown if max attempts reached
      if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
        user.cooldownExpiry = new Date(Date.now() + COOLDOWN_PERIOD);
      }
      
      await user.save();
      
      return res.status(400).json({
        message: `Invalid OTP. ${MAX_OTP_ATTEMPTS - user.otpAttempts} attempts remaining`,
        remainingAttempts: MAX_OTP_ATTEMPTS - user.otpAttempts,
        cooldownRemaining: user.cooldownExpiry ? 
          Math.ceil((user.cooldownExpiry.getTime() - Date.now()) / 1000) : null
      });
    }

    // Reset attempts on successful verification
    user.emailVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.otpAttempts = 0;
    await user.save();

    res.json({ 
      message: 'OTP verified successfully',
      remainingAttempts: MAX_OTP_ATTEMPTS
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ 
      message: 'Error verifying OTP',
      remainingAttempts: MAX_OTP_ATTEMPTS
    });
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
    if (timeSinceLastRequest >= COOLDOWN_PERIOD) {
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

// Add this new route to get OTP status
router.get('/otp-status', async (req, res) => {
    try {
        const { email } = req.query;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Calculate remaining OTP validity
        const remainingValidity = user.otpExpiry 
            ? Math.max(0, Math.floor((user.otpExpiry - Date.now()) / 1000))
            : 0;

        // Calculate remaining cooldown
        const cooldownRemaining = user.cooldownExpiry 
            ? Math.max(0, Math.floor((user.cooldownExpiry - Date.now()) / 1000))
            : 0;

        res.json({
            remainingValidity,
            remainingAttempts: MAX_OTP_ATTEMPTS - (user.otpAttempts || 0),
            cooldownRemaining
        });
    } catch (error) {
        console.error('Error getting OTP status:', error);
        res.status(500).json({ message: 'Error getting OTP status' });
    }
});

module.exports = router;