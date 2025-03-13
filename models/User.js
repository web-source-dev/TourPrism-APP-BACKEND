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
    otp: String,
    otpExpiry: Date,
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);

module.exports = User;
