const User = require('../models/UserModel');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const sendEmail = require('../utils/sendEmail');
// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId, role: 'USER' }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// Generate password reset token
const generateResetToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_RESET_SECRET, { expiresIn: '1h' });
};

const userController = {
  // Create new user
  register: async (req, res) => {
    try {
      const { fullName, email, phone, password } = req.body;

      // Check if at least email or phone is provided
      if (!email && !phone) {
        return res.status(400).json({ message: 'Either email or phone must be provided' });
      }

      // Build query conditions to check only provided fields
      const orConditions = [];
      if (email) orConditions.push({ email });
      if (phone) orConditions.push({ phone });

      // Check if user already exists with provided email or phone
      const existingUser = await User.findOne({
        $or: orConditions
      });

      if (existingUser) {
        return res.status(400).json({
          message: existingUser.email === email ? 'Email already registered' : 'Phone number already registered'
        });
      }

      const user = await User.create({ fullName, email, phone, password });
      const { accessToken, refreshToken } = generateTokens(user._id);

      // Send welcome email if email is provided
      if (email) {
        try {
          await sendEmail({
            to: email,
            subject: 'Welcome to Our Platform',
            template: 'emails/welcome.html',
            variables: {
              fullName: fullName || 'Valued Customer',
              email: email,
              loginUrl: `${process.env.FRONTEND_URL}/login`
            }
          });
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
          // Continue with registration even if email fails
        }
      }

      res.status(201).json({
        accessToken,
        refreshToken,
        username: user.username // Return username for reference
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Login user
  login: async (req, res) => {
    try {
      const { username, password } = req.body;

      // Find user by username (which could be either phone or email)
      const user = await User.findOne({ username });

      if (!user || !(await user.verifyPassword(password))) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const { accessToken, refreshToken } = generateTokens(user._id);

      res.json({
        accessToken,
        refreshToken,
        username: user.username
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

      const accessToken = generateTokens(user._id).accessToken;
      const refreshToken = generateTokens(user._id).refreshToken;
      console.log("user", user);

      // Return a proper JSON response with both tokens
      res.json({
        accessToken,
        refreshToken
      });
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
      const { fullName, email, phone, status } = req.body;

      // If updating email or phone, check for uniqueness
      if (email || phone) {
        const existingUser = await User.findOne({
          _id: { $ne: req.user.userId },
          $or: [
            { email: email || null },
            { phone: phone || null }
          ]
        });

        if (existingUser) {
          return res.status(400).json({
            message: existingUser.email === email ? 'Email already in use' : 'Phone number already in use'
          });
        }
      }

      const updateData = {};
      if (fullName) updateData.fullName = fullName;
      if (email) updateData.email = email;
      if (phone) updateData.phone = phone;
      if (status && status !== user.status && status === 'active' && user.status === 'inactive') updateData.status = status;

      const user = await User.findByIdAndUpdate(
        req.user.userId,
        updateData,
        { new: true, runValidators: true }
      );

      res.json(user);
    } catch (error) {
      console.log("error", error);
      res.status(500).json({ message: error.message });
    }
  },

  updateUserByAdmin: async (req, res) => {
    try {
      const { userId } = req.params;
      const { fullName, email, phone, status } = req.body;

      const updateData = {};
      if (fullName) updateData.fullName = fullName;
      if (email) updateData.email = email;
      if (phone) updateData.phone = phone;
      if (status) updateData.status = status;

      const user = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true });
      res.json(user);
    } catch (error) {
      console.log("error", error);
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
  },

  // Forgot password - request reset link
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Find user by email
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Generate reset token
      const resetToken = generateResetToken(user._id);

      // Create reset URL
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

      // Send password reset email
      try {
        await sendEmail({
          to: email,
          subject: 'Password Reset Request',
          template: 'emails/reset-password.html',
          variables: {
            fullName: user.fullName || 'Valued Customer',
            resetUrl: resetUrl,
            expiryTime: '1 hour'
          }
        });

        res.status(200).json({ message: 'Password reset link sent to your email' });
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        res.status(500).json({ message: 'Failed to send password reset email' });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Reset password with token
  resetPassword: async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
      }

      // Verify reset token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);
      } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }

      // Find user and update password
      const user = await User.findById(decoded.userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Send confirmation email
      try {
        await sendEmail({
          to: user.email,
          subject: 'Password Reset Successful',
          template: 'emails/password-reset-success.html',
          variables: {
            fullName: user.fullName || 'Valued Customer',
            loginUrl: `${process.env.FRONTEND_URL}/login`
          }
        });
      } catch (emailError) {
        console.error('Failed to send password reset confirmation email:', emailError);
        // Continue even if confirmation email fails
      }

      res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = userController;
