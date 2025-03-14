const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE, // e.g., 'gmail'
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendResetEmail = async (to, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: 'Password Reset OTP',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 30px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #2c3e50; font-size: 24px; margin-bottom: 10px; }
          .otp-box { background-color: #f8f9fa; border-radius: 6px; padding: 20px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 4px; }
          .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #6c757d; }
          .warning { color: #dc3545; font-size: 13px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
            <p>Use the following OTP to reset your password</p>
          </div>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <p>This code will expire in 10 minutes</p>
          </div>
          <div class="footer">
            <p>If you didn't request this password reset, please ignore this email.</p>
            <p class="warning">Never share this OTP with anyone.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Error sending reset email');
  }
};

const sendVerificationEmail = async (to, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: 'Email Verification OTP',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 30px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #2c3e50; font-size: 24px; margin-bottom: 10px; }
          .otp-box { background-color: #f8f9fa; border-radius: 6px; padding: 20px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 4px; }
          .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #6c757d; }
          .welcome { color: #28a745; font-size: 18px; margin-bottom: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email</h1>
            <p class="welcome">Welcome to TourPrism!</p>
          </div>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <p>This code will expire in 1 hour</p>
          </div>
          <div class="footer">
            <p>If you didn't create an account with TourPrism, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Error sending verification email');
  }
};

module.exports = { sendResetEmail, sendVerificationEmail };
