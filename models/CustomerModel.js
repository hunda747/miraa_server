const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const customerSchema = new mongoose.Schema({
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
customerSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Verify password method
customerSchema.methods.verifyPassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;