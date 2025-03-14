const mongoose = require('mongoose');

const validatePassword = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
};

const validateEmail = (email) => {
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return regex.test(email);
};

const userSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: [true, 'Email is required'],
        unique: true,
        validate: [validateEmail, 'Please enter a valid email']
    },
    password: { 
        type: String, 
        required: [true, 'Password is required'],
        validate: [validatePassword, 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number and one special character']
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
