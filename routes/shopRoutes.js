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
  updateShopStatus,
  addProductToShop,
  updateShopProduct,
  removeProductFromShop,
  getShopProducts,
  searchShopByProduct,
  getAllShopsForAdmin
} = require('../controllers/shopController');
const { authAdmin } = require('../middleware/auth');

// Route to add a new shop
router.post('/', addShop);
router.get('/nearby', getNearbyShops);
router.get('/category', getShopsByCategory);
router.get('/search', searchShops);
router.get('/', getAllShops);
router.get('/admin', authAdmin, getAllShopsForAdmin);
router.get('/:id', getShopById);
router.put('/:id', updateShop);
router.put('/:shopId/status', updateShopStatus);

// Product management routes
router.get('/:productId/search', searchShopByProduct);
router.post('/:shopId/products', addProductToShop);
router.put('/:shopId/products/:productId', updateShopProduct);
router.delete('/:shopId/products/:productId', removeProductFromShop);
router.get('/:shopId/products', getShopProducts);
module.exports = router;
