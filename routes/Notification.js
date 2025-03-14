const express = require('express');
const router = express.Router();
const Notification = require('../models/Notifications');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// Get paginated notifications for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
      
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: error.message });
  }
});

// Mark notification as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
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
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
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
