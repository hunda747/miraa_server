const mongoose = require('mongoose');

const deliveryChargeSchema = new mongoose.Schema({
  minDistance: {
    type: Number,
    required: true,
    min: 0
  },
  maxDistance: {
    type: Number,
    required: true,
    validate: {
      validator: function (value) {
        return value > this.minDistance;
      },
      message: 'Max distance must be greater than min distance'
    }
  },
  charge: {
    type: Number,
    required: true,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create index for efficient querying
deliveryChargeSchema.index({ minDistance: 1, maxDistance: 1 });

// Add a static method to find the appropriate charge for a given distance
deliveryChargeSchema.statics.findChargeForDistance = async function (distance) {
  const charge = await this.findOne({
    minDistance: { $lte: distance },
    maxDistance: { $gt: distance },
    isActive: true
  });

  return charge ? charge.charge : null;
};

const DeliveryCharge = mongoose.model('DeliveryCharge', deliveryChargeSchema);

module.exports = DeliveryCharge; 