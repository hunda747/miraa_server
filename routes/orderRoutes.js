const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  deleteOrder,
  getMyOrders
} = require('../controllers/orderController');
const { auth } = require('../middleware/auth');

// Create new order
router.post('/', auth, createOrder);
router.get('/', auth, getOrders);
router.get('/:id', getOrder);
router.patch('/:id/status', updateOrderStatus);
router.delete('/:id', deleteOrder);
router.get('/mine', auth, getMyOrders);

module.exports = router;
