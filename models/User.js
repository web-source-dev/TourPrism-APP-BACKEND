const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: [true, 'Email is required'],
        unique: true,
           },
    password: { 
        type: String, 
        required: [true, 'Password is required'],
       },
    name: { 
        type: String 
    },
    provider: { 
        type: String, 
        enum: ['local', 'google', 'microsoft'],
        default: 'local'
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    otp: {
        type: String,
        length: 6
    },
    otpAttempts: {
        type: Number,
        default: 0,
        max: 3
    },
    lastOtpRequest: {
        type: Date
    },
    cooldownExpiry: {
        type: Date
    },
    otpExpiry: Date,
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);

module.exports = User;
