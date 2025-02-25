const User = require('../models/UserModel');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId, role: 'USER' }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

const userController = {
  // Create new user
  register: async (req, res) => {
    try {
      const { fullName, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      const user = await User.create({ fullName, email, password });
      const { accessToken, refreshToken } = generateTokens(user._id);

      res.status(201).json({
        accessToken,
        refreshToken
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Login user
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      if (!user || !(await user.verifyPassword(password))) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const { accessToken, refreshToken } = generateTokens(user._id);

      res.json({
        accessToken,
        refreshToken
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Google OAuth login
  googleLogin: async (req, res) => {
    try {
      const { token } = req.body;
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const { name, email } = ticket.getPayload();

      // Find or create user
      let user = await User.findOne({ email });
      if (!user) {
        user = await User.create({
          fullName: name,
          email,
          password: Math.random().toString(36).slice(-8), // Generate random password
        });
      }

      const { accessToken, refreshToken } = generateTokens(user._id);

      res.json(
        accessToken,
        refreshToken
      );
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Refresh token
  refreshToken: async (req, res) => {
    try {
      const { refreshToken } = req.body;
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);

      res.json({
        accessToken,
        refreshToken: newRefreshToken
      });
    } catch (error) {
      res.status(401).json({ message: 'Invalid refresh token' });
    }
  },

  getAllUsers: async (req, res) => {
    try {
      const users = await User.find();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Get user profile
  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Update user
  updateUser: async (req, res) => {
    try {
      const { fullName } = req.body;
      const user = await User.findByIdAndUpdate(
        req.user.userId,
        { fullName },
        { new: true }
      );
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Delete user
  deleteUser: async (req, res) => {
    try {
      await User.findByIdAndDelete(req.user.userId);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = userController;
