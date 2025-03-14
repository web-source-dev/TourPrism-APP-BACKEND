const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
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
        length: 4
    },
    otpExpiry: Date,
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);

module.exports = User;
