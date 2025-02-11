const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 50,
    unique: true
  },
  description: {
    type: String,
    maxlength: 255
  }
}, {
  timestamps: true // This adds createdAt and updatedAt fields automatically
});

// Define the relationship with Admin model
roleSchema.virtual('admins', {
  ref: 'Admin',
  localField: '_id',
  foreignField: 'role'
});

const Role = mongoose.model('Role', roleSchema);

module.exports = Role;