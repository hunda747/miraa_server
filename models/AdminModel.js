const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 50,
    unique: true
  },
  email: {
    type: String,
    required: true,
    maxlength: 100,
    unique: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    maxlength: 255
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  }
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
adminSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Verify password method
adminSchema.methods.verifyPassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;