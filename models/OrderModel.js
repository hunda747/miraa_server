const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    }
  }],
  distance: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  deliveryCharge: {
    type: Number,
    required: true,
    default: 0
  },
  platformFee: {
    type: Number,
    required: true,
    default: 0
  },
  deliveryLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],  // [longitude, latitude]
      required: true
    }
  },
  deliveryAddress: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'wallet'],
    required: true
  }
}, { timestamps: true });

// Create 2dsphere index for geospatial queries
orderSchema.index({ deliveryLocation: '2dsphere' });

// Add a pre-save middleware to calculate netProfit
orderSchema.pre('save', function (next) {
  // Calculate total cost price
  const totalCostPrice = this.items.reduce((sum, item) =>
    sum + (item.price * item.quantity), 0);

  // Calculate net profit
  this.platformFee = this.deliveryCharge * 0.1;

  next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
