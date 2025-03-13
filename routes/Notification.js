const express = require('express');
const router = express.Router();
const Notification = require('../models/Notifications');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// Get all notifications for a user
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ timestamp: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark notification as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create notification for all users
router.post('/broadcast', authenticateToken, async (req, res) => {
  try {
    const { type, title, message, alertId } = req.body;
    const users = await User.find();
    
    const notifications = await Promise.all(
      users.map(user => 
        Notification.create({
          type,
          title,
          message,
          userId: user._id,
          alertId
        })
      )
    );
    
    res.status(201).json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Show less like this
router.post('/show-less', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.body;
    await Notification.findByIdAndUpdate(notificationId, { showLess: true });
    res.status(200).json({ message: 'Notification preference updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
