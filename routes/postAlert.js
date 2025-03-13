const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const axios = require('axios');

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: function(req, file, cb) {
    cb(null, 'alert-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: function(req, file, cb) {
    checkFileType(file, cb);
  }
}).array('images', 5); // Max 5 images

// Check file type
function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Images Only!');
  }
}

// Post new alert
router.post('/', authenticateToken, async (req, res) => {
  try {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err });
      }

      const { incidentType, location, description, otherDescription, coordinates } = req.body;

      // Validate required fields
      if (!incidentType || !location || !description || !coordinates) {
        return res.status(400).json({ 
          message: 'Please fill all required fields including location coordinates' 
        });
      }

      // Parse coordinates
      let parsedCoordinates;
      try {
        parsedCoordinates = JSON.parse(coordinates);
        if (!parsedCoordinates.coordinates || 
            !Array.isArray(parsedCoordinates.coordinates) || 
            parsedCoordinates.coordinates.length !== 2) {
          throw new Error('Invalid coordinates format');
        }
      } catch (error) {
        return res.status(400).json({ 
          message: 'Invalid coordinates format',
          error: error.message 
        });
      }

      // Create new alert
      const alert = new Alert({
        userId: req.user.id,
        incidentType,
        location,
        description,
        coordinates: parsedCoordinates,
        otherDescription: incidentType === 'Other' ? otherDescription : undefined,
        images: req.files ? req.files.map(file => file.path) : []
      });

      try {
        const savedAlert = await alert.save();
        res.status(201).json({
          message: 'Alert posted successfully',
          alert: savedAlert
        });
      } catch (validationError) {
        return res.status(400).json({
          message: 'Validation error',
          error: validationError.message
        });
      }
    });
  } catch (error) {
    console.error('Error posting alert:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

// Get feed with filters
router.get('/feed', async (req, res) => {
  try {
    const { alertTypes, timeRange, distance, coordinates, sortBy } = req.query;
    
    console.log('Received query params:', { alertTypes, timeRange, distance, coordinates, sortBy });
    
    let query = { status: 'verified' };
    let sort = { createdAt: -1 }; // Default sort
    
    // Filter by alert types if provided
    if (alertTypes) {
      const types = alertTypes.split(',');
      if (types.length > 0) {
        query.incidentType = { $in: types };
      }
    }
    
    // Filter by time range
    if (timeRange) {
      const { min, max } = JSON.parse(timeRange);
      const currentTime = new Date();
      const minTime = new Date(currentTime - (max * 60 * 60 * 1000));
      query.createdAt = { 
        $gte: minTime,
        $lte: currentTime
      };
    }
    
    // Parse coordinates
    let userCoordinates;
    if (coordinates) {
      const [longitude, latitude] = JSON.parse(coordinates);
      userCoordinates = [parseFloat(longitude), parseFloat(latitude)];
    }

    // Handle different sort options and distance filtering
    if (coordinates) {
      const geoNearPipeline = {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: userCoordinates
          },
          distanceField: 'distance',
          spherical: true,
          distanceMultiplier: 0.001 // Convert meters to kilometers
        }
      };

      // Apply distance filter if provided
      if (distance) {
        const { max } = JSON.parse(distance);
        geoNearPipeline.$geoNear.maxDistance = max * 1000; // Convert km to meters
      } else if (sortBy === 'Nearby Alerts') {
        // For nearby alerts, limit to 1km
        geoNearPipeline.$geoNear.maxDistance = 1000; // 1km in meters
      }

      // Use aggregation pipeline for geo queries
      const pipeline = [
        geoNearPipeline,
        { $match: query },
      ];

      // Add sorting based on option
      switch (sortBy) {
        case 'Oldest Alerts':
          pipeline.push({ $sort: { createdAt: 1 } });
          break;
        case 'Most Reported':
          pipeline.push({ $sort: { 'flags.length': -1, createdAt: -1 } });
          break;
        case 'Most Relevant':
          pipeline.push({ $sort: { 'likes.length': -1, createdAt: -1 } });
          break;
        case 'Nearby Alerts':
          // Already sorted by distance from $geoNear
          break;
        default: // 'Newest Alerts'
          pipeline.push({ $sort: { createdAt: -1 } });
      }

      console.log('Aggregation pipeline:', JSON.stringify(pipeline, null, 2));

      const alerts = await Alert.aggregate(pipeline)
        .lookup({
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        })
        .unwind('user')
        .project({
          'user.password': 0,
          'user.email': 0
        });

      console.log(`Found ${alerts.length} alerts`);
      res.json(alerts);
    } else {
      // Fallback to regular query when no coordinates provided
      const alerts = await Alert.find(query)
        .sort(sort)
        .populate('userId', 'name')
        .lean();

      console.log(`Found ${alerts.length} alerts`);
      res.json(alerts);
    }
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
