const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['Scam Alert', 'Event Cancellation', 'Weather Warning', 'Your Rewards', "You're Promoted"]
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isRead: {
    type: Boolean,
    default: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  alertId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Alert',
    required: false
  },
  showLess: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Notification', NotificationSchema);
