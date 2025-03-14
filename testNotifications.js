const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Notification = require('./models/Notifications');
const User = require('./models/User');

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB connected');
})
.catch(err => {
  console.error('MongoDB connection error:', err);
});

// Function to create multiple test notifications per user
const createTestNotifications = async () => {
  try {
    const users = await User.find(); // Fetch all users

    if (users.length === 0) {
      console.log('No users found. Exiting...');
      return;
    }

    const notificationTypes = [
      { type: 'Scam', title: 'Fraud Alert!', message: 'Beware of phishing attempts.' },
      { type: 'Event Cancellation', title: 'Event Update', message: 'Your event has been canceled.' },
      { type: 'Weather Warning', title: 'Storm Incoming!', message: 'Severe weather conditions expected.' },
      { type: 'Your Rewards', title: 'Reward Alert', message: 'You have received a reward.' },
      { type: "You're Promoted", title: 'Promotion Alert', message: 'You have been promoted.' },
      { type: 'Alert', title: 'General Alert', message: 'Important information for you.' },
    ];

    const notifications = [];

    for (const user of users) {
      for (const notif of notificationTypes) {
        notifications.push({
          ...notif,
          userId: user._id,
        });
      }
    }

    await Notification.insertMany(notifications);
    console.log('Test notifications created successfully.');
  } catch (error) {
    console.error('Error creating notifications:', error);
  } finally {
    mongoose.connection.close(); // Close the connection
  }
};

// Run the function
createTestNotifications();
