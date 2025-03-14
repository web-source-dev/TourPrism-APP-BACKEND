const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Assuming you will create a User model file
const { sendResetEmail } = require('../utils/email');

const router = express.Router();

// Sign Up
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_COOLDOWN_PERIOD = 30 * 60 * 1000; // 30 minutes

router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate email and password
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    const user = new User({
      email,
      password: hashedPassword,
      otp,
      otpExpiry,
      emailVerified: false
    });
    await user.save();

    // Send verification email
    await sendResetEmail(email, otp);

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lastLoginAttempt = undefined;
    await user.save();

    // Generate JWT with additional security claims
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        version: user.passwordVersion || 1 // For password change invalidation
      }, 
      process.env.JWT_SECRET,
      { 
        expiresIn: '24h',
        algorithm: 'HS256'
      }
    );
    res.status(201).json({ token, userId: user._id, requireVerification: true });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    // Validate request body
    if (!req.body.email || !req.body.password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      // Implement login attempt tracking
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      user.lastLoginAttempt = new Date();
      
      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        await user.save();
        return res.status(429).json({
          message: 'Account locked due to too many failed attempts. Please try again later',
          cooldownRemaining: Math.ceil((LOGIN_COOLDOWN_PERIOD - (Date.now() - user.lastLoginAttempt)) / 1000)
        });
      }
      
      await user.save();
      return res.status(401).json({
        message: 'Invalid email or password',
        remainingAttempts: MAX_LOGIN_ATTEMPTS - user.loginAttempts
      });
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lastLoginAttempt = undefined;
    await user.save();

    // Generate JWT with additional security claims
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        version: user.passwordVersion || 1 // For password change invalidation
      }, 
      process.env.JWT_SECRET,
      { 
        expiresIn: '24h',
        algorithm: 'HS256'
      }
    );
    res.json({ token, userId: user._id ,emailVerified: user.emailVerified });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Request OTP for password reset
router.post('/request-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a random OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    user.otp = otp;
    user.otpExpiry = Date.now() + 600000; // OTP valid for 10 minutes
    await user.save();

    // Send OTP email
    await sendResetEmail(email, otp);

    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({ message: 'Error requesting OTP' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ 
      email,
      otp,
      otpExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Error verifying OTP' });
  }
});

// Reset Password with verified OTP
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ 
      email,
      otp,
      otpExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error updating password' });
  }
});

module.exports = router;