const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  incidentType: {
    type: String,
    enum: ['Scam', 'Theft', 'Crime', 'Weather', 'PublicDisorder', 'Other'],
    required: true
  },
  otherDescription: {
    type: String,
    required: function() {
      return this.incidentType === 'Other';
    },
    validate: {
      validator: function(v) {
        if (this.incidentType === 'Other') {
          return v && v.length > 0;
        }
        return true;
      },
      message: 'Other description is required when incident type is Other'
    }
  },
  location: {
    type: String,
    required: true
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(v) {
          return Array.isArray(v) && v.length === 2 &&
            v[0] >= -180 && v[0] <= 180 && // longitude
            v[1] >= -90 && v[1] <= 90;     // latitude
        },
        message: 'Invalid coordinates'
      }
    }
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: [10, 'Description must be at least 10 characters long']
  },
  images: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'verified'
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  flags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  shares: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes
alertSchema.index({ coordinates: '2dsphere' });
alertSchema.index({ createdAt: -1 });
alertSchema.index({ incidentType: 1 });

// Debug middleware
alertSchema.pre('save', function(next) {
  console.log('Saving alert:', this);
  if (this.coordinates && !this.coordinates.type) {
    this.coordinates = {
      type: 'Point',
      coordinates: this.coordinates.coordinates
    };
  }
  next();
});

module.exports = mongoose.model('Alert', alertSchema); 