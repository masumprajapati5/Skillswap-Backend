const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

// Helper to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '90d',
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please add all fields' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      passwordHash: hashedPassword,
      credits: 25
    });

    if (user) {

      const accessToken = generateToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        credits: user.credits,
        avatar: user.avatar,
        rating: user.rating,
        accessToken,
        refreshToken
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate a user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Hardcoded static admin check
    if (email === 'admin@skillswap.com' && password === 'admin@123') {
      let admin = await User.findOne({ email: 'admin@skillswap.com' });
      
      if (!admin) {
        // Create admin if not exists (failsafe)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin@123', salt);
        admin = await User.create({
          name: 'Admin',
          email: 'admin@skillswap.com',
          passwordHash: hashedPassword,
          role: 'admin',
          credits: 9999,
          isVerified: true
        });
      }

      const accessToken = generateToken(admin._id);
      const refreshToken = generateRefreshToken(admin._id);

      return res.json({
        _id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        credits: admin.credits,
        avatar: admin.avatar,
        rating: admin.rating,
        accessToken,
        refreshToken
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'This email is not registered with us.' });
    }

    if (await bcrypt.compare(password, user.passwordHash)) {
      const accessToken = generateToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        credits: user.credits,
        avatar: user.avatar,
        rating: user.rating,
        accessToken,
        refreshToken
      });
    } else {
      res.status(401).json({ message: 'Incorrect password.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token provided' });
    }

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid refresh token' });
      }
      
      const newAccessToken = generateToken(decoded.id);
      res.json({ accessToken: newAccessToken });
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/forget-password
// @desc    Request password reset token
// @access  Public
router.post('/forget-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (email === 'admin@skillswap.com') {
      return res.status(403).json({ message: 'Admin account password cannot be reset via email because the admin is static.' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'This email is not registered with us.' });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 mins

    await user.save();

    // Reset URL
    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${token}`;
    
    // Email Template from Snippet
    const html = `
      <div style="font-family: 'Outfit', sans-serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #000; background-color: #fff;">
        <h1 style="text-align: center; color: #000; font-size: 28px; margin-bottom: 20px;">SkillSwap</h1>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">Hello,</p>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">You requested to reset your password. Click the button below to set a new one. This link expires in 15 minutes.</p>
        <div style="text-align: center; margin: 40px 0;">
          <a href="${resetLink}" style="background-color: #000; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Reset Password</a>
        </div>
        <p style="font-size: 14px; color: #999; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">&copy; 2026 SkillSwap. All rights reserved.</p>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Reset Your Password',
        message: `Reset Link: ${resetLink}`,
        html
      });

      res.status(200).json({ message: 'Reset link sent to your email' });
    } catch (err) {
      user.resetToken = undefined;
      user.resetTokenExpiry = undefined;
      await user.save();
      
      console.error('[FORGET PASSWORD] Email send error:', err);
      return res.status(500).json({ message: 'Email could not be sent' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password using token
// @access  Public
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findOne({
      resetToken: req.params.token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Link Expire, Send New Request' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(password, salt);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    res.json({ message: 'Password Reset Successfully !' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
