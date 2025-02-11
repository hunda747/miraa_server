const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String, // URL to the image
    required: true
  },
  category: {
    type: String,
    required: true
  },
  // Add any other product details you might need
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;