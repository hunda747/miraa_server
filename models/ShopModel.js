const mongoose = require('mongoose');
// Shop Schema
const shopSchema = new mongoose.Schema({
  name: String,
  description: String,
  location: {
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
  address: String,
  category: String,
  isOpen: Boolean,
  image: String, // URL to the image
  operatingHours: {
    open: String,  // Format: "HH:mm"
    close: String  // Format: "HH:mm"
  },
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    inStock: {
      type: Boolean,
      default: true
    }
  }],
  // other shop details...
});

// Create 2dsphere index for geospatial queries
shopSchema.index({ location: '2dsphere' });

const Shop = mongoose.model('Shop', shopSchema);

module.exports = Shop;