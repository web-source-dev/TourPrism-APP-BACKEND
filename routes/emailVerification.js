const express = require('express');
const User = require('../models/User');
const { sendVerificationEmail } = require('../utils/email');
const router = express.Router();

// Verify OTP
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

    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
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

    // Check if previous OTP hasn't expired yet (prevent spam)
    if (user.otpExpiry && Date.now() < user.otpExpiry - 3540000) { // 59 minutes
      return res.status(400).json({ 
        message: 'Please wait before requesting a new OTP',
        remainingTime: Math.ceil((user.otpExpiry - Date.now() - 3540000) / 1000)
      });
    }

    // Generate new OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
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