// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Email setup - Use Resend for production, Nodemailer for development
let sendOTPEmail;

if (process.env.RESEND_API_KEY) {
  // Production: Use Resend
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  sendOTPEmail = async (email, otp) => {
    try {
      await resend.emails.send({
        from: 'samarthhegde93@notezy.online', // Use your verified domain in production
        to: email,
        subject: 'Email Verification - Job Portal',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Email Verification</h2>
            <p>Your OTP for email verification is:</p>
            <h1 style="background: #f4f4f4; padding: 20px; text-align: center; letter-spacing: 5px;">${otp}</h1>
            <p style="color: #666;">This OTP will expire in 10 minutes.Lawde bega otp enter mado</p>
          </div>
        `
      });
      console.log(`✅ OTP sent to ${email} via Resend`);
    } catch (error) {
      console.error('❌ Resend email failed:', error);
      console.log(`⚠️ OTP for ${email}: ${otp} (Use this for testing)`);
    }
  };
} else {
  // Development: Use Nodemailer
  const nodemailer = require('nodemailer');
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  sendOTPEmail = async (email, otp) => {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Email Verification - Job Portal',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Email Verification</h2>
            <p>Your OTP for email verification is:</p>
            <h1 style="background: #f4f4f4; padding: 20px; text-align: center; letter-spacing: 5px;">${otp}</h1>
            <p style="color: #666;">This OTP will expire in 10 minutes.</p>
          </div>
        `
      });
      console.log(`✅ OTP sent to ${email} via Gmail`);
    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
      console.log(`⚠️ OTP for ${email}: ${otp} (Email failed, use this OTP)`);
    }
  };
}

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user
    user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      otp,
      otpExpiry
    });

    await user.save();

    // Send OTP asynchronously (don't wait for it)
    sendOTPEmail(email, otp).catch(err => {
      console.error('Error sending OTP email:', err);
    });

    // Respond immediately
    res.json({ 
      message: 'Registration successful. Please verify your email with OTP.',
      userId: user._id 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'User already verified' });
    }

    // Check OTP and expiry
    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    // Verify user
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Email verified successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'User already verified' });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP asynchronously
    sendOTPEmail(user.email, otp).catch(err => {
      console.error('Error sending OTP email:', err);
    });

    res.json({ message: 'OTP resent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(400).json({ 
        message: 'Please verify your email first',
        userId: user._id
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -otp -otpExpiry');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, profile } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (profile) user.profile = { ...user.profile, ...profile };

    await user.save();

    const updatedUser = await User.findById(req.user.userId).select('-password -otp -otpExpiry');
    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;