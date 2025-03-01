const express = require('express');
const router = express.Router();
const deliveryChargeController = require('../controllers/deliveryChargeController');
const { authAdmin } = require('../middleware/auth');

// Routes that require admin authentication
router.post('/', authAdmin, deliveryChargeController.createDeliveryCharge);
router.put('/:id', authAdmin, deliveryChargeController.updateDeliveryCharge);
router.delete('/:id', authAdmin, deliveryChargeController.deleteDeliveryCharge);

// Public routes
router.get('/', deliveryChargeController.getAllDeliveryCharges);
router.get('/:id', deliveryChargeController.getDeliveryCharge);

module.exports = router; 