const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { authenticateToken } = require('../middleware/auth');

// Like an alert
router.post('/alerts/:id/like', authenticateToken, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    const userIndex = alert.likes.indexOf(req.user.id);
    if (userIndex > -1) {
      // User already liked - remove like
      alert.likes.splice(userIndex, 1);
    } else {
      // Add new like
      alert.likes.push(req.user.id);
    }

    await alert.save();
    res.json({ 
      message: userIndex > -1 ? 'Like removed' : 'Alert liked',
      likesCount: alert.likes.length
    });
  } catch (error) {
    console.error('Error handling like:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Flag an alert
router.post('/alerts/:id/flag', authenticateToken, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    if (!alert.flags.includes(req.user.id)) {
      alert.flags.push(req.user.id);
      
      // If flags reach a threshold, change status to pending for review
      if (alert.flags.length >= 5) {
        alert.status = 'pending';
      }
      
      await alert.save();
    }

    res.json({ 
      message: 'Alert flagged',
      flagsCount: alert.flags.length
    });
  } catch (error) {
    console.error('Error flagging alert:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 