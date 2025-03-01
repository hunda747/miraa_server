const express = require('express');
const router = express.Router();
const {
  addShop,
  getNearbyShops,
  getShopsByCategory,
  searchShops,
  getAllShops,
  getShopById,
  updateShop,
  addProductToShop,
  updateShopProduct,
  removeProductFromShop,
  getShopProducts,
  searchShopByProduct
} = require('../controllers/shopController');

// Route to add a new shop
router.post('/', addShop);
router.get('/nearby', getNearbyShops);
router.get('/category', getShopsByCategory);
router.get('/search', searchShops);
router.get('/', getAllShops);
router.get('/:id', getShopById);
router.put('/:id', updateShop);

// Product management routes
router.get('/:productId/search', searchShopByProduct);
router.post('/:shopId/products', addProductToShop);
router.put('/:shopId/products/:productId', updateShopProduct);
router.delete('/:shopId/products/:productId', removeProductFromShop);
router.get('/:shopId/products', getShopProducts);
module.exports = router;
