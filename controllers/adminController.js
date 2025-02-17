const Admin = require('../models/adminModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

class AdminController {
  constructor() {
    // Bind methods to preserve 'this' context
    this.login = this.login.bind(this);
    this.refreshToken = this.refreshToken.bind(this);
  }

  // Generate tokens
  generateTokens(adminId, role) {
    const accessToken = jwt.sign(
      {
        id: adminId,
        role: role
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '30m' }
    );

    const refreshToken = jwt.sign(
      { id: adminId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '6m' }
    );

    return { accessToken, refreshToken };
  }

  async getCurrentAdmin(req, res) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Access token is required'
        });
      }

      const accessToken = authHeader.split(' ')[1];

      // Verify access token
      const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);

      // Find admin with decoded ID
      const admin = await Admin.findById(decoded.id).populate('role');

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }

      res.json({
        role: admin.role.name,
        username: admin.username,
        email: admin.email,
        _id: admin._id
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error fetching current admin',
        error: error.message
      });
    }
  }

  // Login admin
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Find admin
      const admin = await Admin.findOne({ email }).select('+password').populate('role');
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Verify password
      const isValidPassword = await admin.verifyPassword(password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(admin._id, admin.role.name);

      res.json({
        accessToken,
        refreshToken
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        message: 'Error during login',
        error: error.message
      });
    }
  }

  // Refresh token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      // Find admin to get role
      const admin = await Admin.findById(decoded.id).populate('role');
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Admin not found'
        });
      }

      // Generate new tokens
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
        this.generateTokens(decoded.id, admin.role.name);

      res.json({
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
  }

  // Create admin
  async createAdmin(req, res) {
    try {
      const { username, email, password, roleId } = req.body;

      // Validate required fields
      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username, email and password are required'
        });
      }

      // Check if admin already exists
      const existingAdmin = await Admin.findOne({
        $or: [{ email }, { username }]
      });

      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: 'Admin with this email or username already exists'
        });
      }

      const admin = await Admin.create({
        username,
        email,
        password,
        role: roleId
      });

      res.status(201).json({
        success: true,
        data: admin,
        message: 'Admin created successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating admin',
        error: error.message
      });
    }
  }

  // Get all admins
  async getAllAdmins(req, res) {
    try {
      const admins = await Admin.find().populate('role');
      res.json({
        success: true,
        data: admins
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching admins',
        error: error.message
      });
    }
  }

  // Get admin by ID
  async getAdminById(req, res) {
    try {
      const { id } = req.params;
      const admin = await Admin.findById(id).populate('role');

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }

      res.json({
        success: true,
        data: admin
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching admin',
        error: error.message
      });
    }
  }

  // Update admin
  async updateAdmin(req, res) {
    try {
      const { id } = req.params;
      const { username, email, password, roleId } = req.body;

      // Check if admin exists
      const admin = await Admin.findById(id);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }

      // Check if new email/username already exists
      if (email || username) {
        const existingAdmin = await Admin.findOne({
          _id: { $ne: id },
          $or: [
            ...(email ? [{ email }] : []),
            ...(username ? [{ username }] : [])
          ]
        });

        if (existingAdmin) {
          return res.status(400).json({
            success: false,
            message: 'Email or username already exists'
          });
        }
      }

      const updateData = {
        ...(username && { username }),
        ...(email && { email }),
        ...(password && { password }),
        ...(roleId && { role: roleId })
      };

      const updatedAdmin = await Admin.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      ).populate('role');

      res.json({
        success: true,
        data: updatedAdmin,
        message: 'Admin updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating admin',
        error: error.message
      });
    }
  }

  // Delete admin
  async deleteAdmin(req, res) {
    try {
      const { id } = req.params;

      const admin = await Admin.findByIdAndDelete(id);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }

      res.json({
        success: true,
        message: 'Admin deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting admin',
        error: error.message
      });
    }
  }
}

module.exports = new AdminController();
