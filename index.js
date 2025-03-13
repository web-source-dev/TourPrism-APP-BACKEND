const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./db'); // Import the DB connection
const authRoutes = require('./routes/auth'); // Import the auth routes
const alertRoutes = require('./routes/postAlert'); // Import the alert routes
const alertActionsRoutes = require('./routes/alertActions'); // Import the alert actions routes
const notificationRoutes = require('./routes/Notification'); // Import the notification routes
const app = express();
dotenv.config();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
connectDB()


app.get('/', (req, res) => {
  res.send('Hello World');
});

// Use the auth routes
app.use('/api', authRoutes);
app.use('/api/alerts', alertRoutes); // Alerts route
app.use('/api/alertActions', alertActionsRoutes); // Alert actions route
app.use('/api/notifications', notificationRoutes); // Notifications route

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

