const Order = require('../models/OrderModel');
const Shop = require('../models/ShopModel');
const Admin = require('../models/AdminModel');
const { calculateDistance } = require('../utils/direction');
const { calculateDeliveryCharge } = require('./deliveryChargeController');

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

    // Verify all items are available in sufficient quantity
    for (const item of items) {
      const shopProduct = shop.products.find(
        p => p.product.toString() === item.product
      );

      if (!shopProduct) {
        return res.status(400).json({
          success: false,
          error: `Product ${item.product} not found in shop`
        });
      }

      // if (shopProduct.quantity < item.quantity) {
      //   return res.status(400).json({
      //     success: false,
      //     error: `Insufficient quantity for product ${item.product}. Available: ${shopProduct.quantity}, Requested: ${item.quantity}`
      //   });
      // }
    }

    // Calculate distance and delivery charge
    console.log({ lat: deliveryLocation[0], long: deliveryLocation[1] }, { lat: shop.location.coordinates[0], long: shop.location.coordinates[1] });
    const distance = calculateDistance({ lat: deliveryLocation[0], long: deliveryLocation[1] }, { lat: shop.location.coordinates[0], long: shop.location.coordinates[1] });
    const deliveryCharge = await calculateDeliveryCharge(distance);

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

    // Decrease product quantities
    for (const item of items) {
      const productIndex = shop.products.findIndex(
        p => p.product.toString() === item.product
      );

      shop.products[productIndex].quantity = (shop.products[productIndex].quantity - item.quantity) < 0 ? 0 : shop.products[productIndex].quantity - item.quantity;
      // Update inStock status based on new quantity
      shop.products[productIndex].inStock = shop.products[productIndex].quantity > 0;
    }

    await shop.save();

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
    const limit = parseInt(req.query.limit) || 100;
    const status = req.query.status;
    const userId = req.user.role === 'USER' ? req.user.userId : req.query.userId;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    let query = {};

    // Add filters if provided
    if (status) query.status = status;
    if (userId) query.user = userId;

    // Add date range filter if provided
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        // Set endDate to end of the day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endOfDay;
      }
    }

    if (req.user.role === 'SHOP_OWNER' || req.user.role === 'DELIVERY') {
      console.log("req.user", req.user);
      const admin = await Admin.findById(req.user.id);
      query.shop = admin.shop;
    }

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

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.userId }).populate('user', 'name email')
      .populate('shop', 'name image')
      .populate('items.product', 'name image');

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
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
