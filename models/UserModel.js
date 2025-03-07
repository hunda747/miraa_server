const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    maxlength: 100,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: false,
    maxlength: 100,
    unique: true,
    sparse: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: false,
    maxlength: 10,
    unique: true,
    sparse: true,
    match: [/^\d{10}$/, 'Please provide a valid 10-digit phone number']
  },
  status: {
    type: String,
    required: false,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    maxlength: 255
  },
}, {
  timestamps: true, // This adds createdAt and updatedAt fields automatically
  toJSON: {
    transform: function (doc, ret) {
      delete ret.password; // Remove password when converting to JSON
      return ret;
    }
  }
});

// Hash password before saving (handles both insert and update)
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Verify password method
userSchema.methods.verifyPassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

// Add validation to ensure either email or phone is provided
userSchema.pre('validate', function (next) {
  if (!this.email && !this.phone) {
    this.invalidate('email', 'Either email or phone must be provided');
    this.invalidate('phone', 'Either email or phone must be provided');
  }

  // Set username based on phone (priority) or email
  if (this.phone) {
    this.username = this.phone;
  } else if (this.email) {
    this.username = this.email;
  }

  next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;

