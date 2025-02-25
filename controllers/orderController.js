const Order = require('../models/OrderModel');
const Shop = require('../models/ShopModel');
const { calculateDistance } = require('../utils/direction');

// Create new order
exports.createOrder = async (req, res) => {
  try {
    const {
      shopId,
      items,
      deliveryLocation,
      deliveryAddress,
      paymentMethod
    } = req.body;
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found'
      });
    }
    // const distance = 10;
    // Calculate delivery charge based on distance
    // console.log(shop);
    console.log({ lat: deliveryLocation[0], long: deliveryLocation[1] }, { lat: shop.location.coordinates[0], long: shop.location.coordinates[1] });

    const distance = calculateDistance({ lat: deliveryLocation[0], long: deliveryLocation[1] }, { lat: shop.location.coordinates[0], long: shop.location.coordinates[1] });
    const deliveryCharge = calculateDeliveryCharge(distance);
    // Calculate total amount
    const totalAmount = items.reduce((sum, item) =>
      sum + (item.price * item.quantity), 0);

    const order = new Order({
      user: req.user.userId, // Assuming user is attached by auth middleware
      shop: shopId,
      items,
      distance,
      totalAmount,
      deliveryCharge,
      deliveryLocation: {
        type: 'Point',
        coordinates: deliveryLocation
      },
      deliveryAddress,
      paymentMethod
    });

    await order.save();

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get all orders (with filtering and pagination)
exports.getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const userId = req.query.userId;

    let query = {};

    // Add filters if provided
    if (status) query.status = status;
    if (userId) query.user = userId;

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('shop', 'name')
      .populate('items.product', 'name image')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: orders.length,
        totalRecords: total
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get single order
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('shop', 'name')
      .populate('items.product', 'name image');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Validate status transition
    if (!isValidStatusTransition(order.status, status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status transition'
      });
    }

    order.status = status;
    await order.save();

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Delete order (soft delete or cancel)
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Only allow deletion of pending orders
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Can only delete pending orders'
      });
    }

    order.status = 'cancelled';
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Helper function to calculate delivery charge
const calculateDeliveryCharge = (distance) => {
  // Base charge
  let charge = 20;

  // Add additional charge per km
  charge += Math.ceil(distance) * 10;

  return charge;
};

// Helper function to validate status transitions
const isValidStatusTransition = (currentStatus, newStatus) => {
  const validTransitions = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['out_for_delivery'],
    out_for_delivery: ['delivered'],
    delivered: [],
    cancelled: []
  };

  return validTransitions[currentStatus]?.includes(newStatus);
};
