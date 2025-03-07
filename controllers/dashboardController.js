const Order = require('../models/OrderModel');
const User = require('../models/UserModel');
const Shop = require('../models/ShopModel');
const Product = require('../models/ProductModel');
const Admin = require('../models/AdminModel');

/**
 * Get dashboard data organized in sections based on user role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Dashboard data organized in sections
 */
exports.getDashboardData = async (req, res) => {
  try {
    // Get current date and calculate date ranges
    const currentDate = new Date();
    const startOfToday = new Date(currentDate.setHours(0, 0, 0, 0));
    const endOfToday = new Date(currentDate.setHours(23, 59, 59, 999));

    // Calculate start of week (Sunday)
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Calculate start of month
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    // Calculate start of year
    const startOfYear = new Date(currentDate.getFullYear(), 0, 1);

    // Get user role from the authenticated user
    const userRole = req.user.role;
    const userId = req.user.id;

    let dashboardData = {};

    // Return different dashboard data based on user role
    if (userRole === 'SUPER_ADMIN') {
      // For SUPER_ADMIN, return all platform data
      const ordersSection = await getOrdersSection(startOfToday, endOfToday);
      const usersSection = await getUsersSection(startOfToday);
      const revenueSection = await getRevenueSection(startOfToday, startOfWeek, startOfMonth, startOfYear);
      const productsSection = await getProductsSection();
      const shopsSection = await getShopsSection();

      dashboardData = {
        orders: ordersSection,
        users: usersSection,
        revenue: revenueSection,
        products: productsSection,
        shops: shopsSection
      };
    }
    else if (userRole === 'SHOP_OWNER' || userRole === 'DELIVERY') {
      // For SHOP_OWNER, return data specific to their shop
      const shopId = await getShopIdForOwner(userId);

      if (!shopId) {
        return res.status(404).json({
          success: false,
          message: 'No shop found for this user'
        });
      }

      const ordersSection = await getShopOrdersSection(shopId, startOfToday, endOfToday);
      const revenueSection = await getShopRevenueSection(shopId, startOfToday, startOfWeek, startOfMonth, startOfYear);
      const productsSection = await getShopProductsSection(shopId);

      dashboardData = {
        orders: ordersSection,
        revenue: revenueSection,
        products: productsSection
      };
    }
    else {
      // For any other role, return limited data
      const ordersSection = await getOrdersSection(startOfToday, endOfToday);

      dashboardData = {
        orders: ordersSection
      };
    }

    // Return dashboard data
    return res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Dashboard Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
};

/**
 * Get shop ID for a shop owner
 */
async function getShopIdForOwner(userId) {
  // This function should retrieve the shop ID associated with the user
  // Implementation depends on your data model
  const admin = await Admin.findById(userId);
  return admin ? admin.shop._id : null;
}

/**
 * Get orders section data
 */
async function getOrdersSection(startOfToday, endOfToday) {
  // Total orders count
  const totalOrders = await Order.countDocuments();

  // Today's orders
  const todayOrders = await Order.countDocuments({
    createdAt: { $gte: startOfToday, $lte: endOfToday }
  });

  // Orders by status
  const ordersByStatus = await Order.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    totalOrders,
    todayOrders,
    ordersByStatus
  };
}

/**
 * Get shop-specific orders section data
 */
async function getShopOrdersSection(shopId, startOfToday, endOfToday) {
  // Total orders count for this shop
  const totalOrders = await Order.countDocuments({ shop: shopId });

  // Today's orders for this shop
  const todayOrders = await Order.countDocuments({
    shop: shopId,
    createdAt: { $gte: startOfToday, $lte: endOfToday }
  });

  // Orders by status for this shop
  const ordersByStatus = await Order.aggregate([
    {
      $match: { shop: shopId }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    totalOrders,
    todayOrders,
    ordersByStatus
  };
}

/**
 * Get delivery-specific orders section data
 */
async function getDeliveryOrdersSection(deliveryUserId, startOfToday, endOfToday) {
  // Total orders count for this delivery person
  const totalOrders = await Order.countDocuments({
    deliveryPerson: deliveryUserId,
    status: { $in: ['out_for_delivery', 'delivered'] }
  });

  // Today's orders for this delivery person
  const todayOrders = await Order.countDocuments({
    deliveryPerson: deliveryUserId,
    createdAt: { $gte: startOfToday, $lte: endOfToday },
    status: { $in: ['out_for_delivery', 'delivered'] }
  });

  // Orders by status for this delivery person
  const ordersByStatus = await Order.aggregate([
    {
      $match: {
        deliveryPerson: deliveryUserId,
        status: { $in: ['out_for_delivery', 'delivered'] }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    totalOrders,
    todayOrders,
    ordersByStatus
  };
}

/**
 * Get users section data
 */
async function getUsersSection(startOfToday) {
  // Total users count
  const totalUsers = await User.countDocuments();

  // New users today
  const newUsersToday = await User.countDocuments({
    createdAt: { $gte: startOfToday }
  });

  // Active vs Inactive users
  const usersByStatus = await User.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    totalUsers,
    newUsersToday,
    usersByStatus
  };
}

/**
 * Get revenue section data
 */
async function getRevenueSection(startOfToday, startOfWeek, startOfMonth, startOfYear) {
  // Total revenue
  const totalRevenueResult = await Order.aggregate([
    {
      $match: { status: 'delivered', paymentStatus: 'paid' }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$totalAmount' },
        platformFees: { $sum: '$platformFee' }
      }
    }
  ]);

  const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;
  const totalPlatformFees = totalRevenueResult.length > 0 ? totalRevenueResult[0].platformFees : 0;

  // Today's revenue
  const todayRevenueResult = await Order.aggregate([
    {
      $match: {
        status: 'delivered',
        paymentStatus: 'paid',
        createdAt: { $gte: startOfToday }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$totalAmount' },
        platformFees: { $sum: '$platformFee' }
      }
    }
  ]);

  const todayRevenue = todayRevenueResult.length > 0 ? todayRevenueResult[0].total : 0;

  // Revenue by payment method
  const revenueByPaymentMethod = await Order.aggregate([
    {
      $match: { status: 'delivered', paymentStatus: 'paid' }
    },
    {
      $group: {
        _id: '$paymentMethod',
        total: { $sum: '$totalAmount' }
      }
    }
  ]);

  // Monthly revenue trend (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyRevenueTrend = await Order.aggregate([
    {
      $match: {
        status: 'delivered',
        paymentStatus: 'paid',
        createdAt: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        total: { $sum: '$totalAmount' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);

  return {
    totalRevenue,
    totalPlatformFees,
    todayRevenue,
    revenueByPaymentMethod,
    monthlyRevenueTrend
  };
}

/**
 * Get shop-specific revenue section data
 */
async function getShopRevenueSection(shopId, startOfToday, startOfWeek, startOfMonth, startOfYear) {
  // Total revenue for this shop
  const totalRevenueResult = await Order.aggregate([
    {
      $match: {
        shop: shopId,
        status: 'delivered',
        paymentStatus: 'paid'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$totalAmount' },
        platformFees: { $sum: '$platformFee' }
      }
    }
  ]);

  const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;
  const totalPlatformFees = totalRevenueResult.length > 0 ? totalRevenueResult[0].platformFees : 0;

  // Today's revenue for this shop
  const todayRevenueResult = await Order.aggregate([
    {
      $match: {
        shop: shopId,
        status: 'delivered',
        paymentStatus: 'paid',
        createdAt: { $gte: startOfToday }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$totalAmount' }
      }
    }
  ]);

  const todayRevenue = todayRevenueResult.length > 0 ? todayRevenueResult[0].total : 0;

  // Revenue by payment method for this shop
  const revenueByPaymentMethod = await Order.aggregate([
    {
      $match: {
        shop: shopId,
        status: 'delivered',
        paymentStatus: 'paid'
      }
    },
    {
      $group: {
        _id: '$paymentMethod',
        total: { $sum: '$totalAmount' }
      }
    }
  ]);

  // Monthly revenue trend (last 6 months) for this shop
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyRevenueTrend = await Order.aggregate([
    {
      $match: {
        shop: shopId,
        status: 'delivered',
        paymentStatus: 'paid',
        createdAt: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        total: { $sum: '$totalAmount' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);

  return {
    totalRevenue,
    totalPlatformFees,
    todayRevenue,
    revenueByPaymentMethod,
    monthlyRevenueTrend
  };
}

/**
 * Get delivery-specific revenue section data
 */
async function getDeliveryRevenueSection(deliveryUserId, startOfToday) {
  // Total delivery charges earned
  const totalRevenueResult = await Order.aggregate([
    {
      $match: {
        deliveryPerson: deliveryUserId,
        status: 'delivered'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$deliveryCharge' }
      }
    }
  ]);

  const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

  // Today's delivery charges earned
  const todayRevenueResult = await Order.aggregate([
    {
      $match: {
        deliveryPerson: deliveryUserId,
        status: 'delivered',
        createdAt: { $gte: startOfToday }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$deliveryCharge' }
      }
    }
  ]);

  const todayRevenue = todayRevenueResult.length > 0 ? todayRevenueResult[0].total : 0;

  return {
    totalRevenue,
    todayRevenue
  };
}

/**
 * Get products section data
 */
async function getProductsSection() {
  // Total products count
  const totalProducts = await Product.countDocuments();

  // Products by category
  const productsByCategory = await Product.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    }
  ]);

  // Top products by order frequency
  const topProducts = await Order.aggregate([
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        orderCount: { $sum: 1 },
        totalQuantity: { $sum: '$items.quantity' }
      }
    },
    { $sort: { orderCount: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'productDetails'
      }
    },
    { $unwind: '$productDetails' },
    {
      $project: {
        _id: 1,
        name: '$productDetails.name',
        category: '$productDetails.category',
        orderCount: 1,
        totalQuantity: 1
      }
    }
  ]);

  return {
    totalProducts,
    productsByCategory,
    topProducts
  };
}

/**
 * Get shop-specific products section data
 */
async function getShopProductsSection(shopId) {
  // Get shop products
  const shop = await Shop.findById(shopId);
  const totalProducts = shop.products ? shop.products.length : 0;

  // Products by category for this shop
  const productsByCategory = [];
  if (shop.products && shop.products.length > 0) {
    // Get product IDs from shop
    const productIds = shop.products.map(p => p.product);

    // Get categories for these products
    const products = await Product.find({ _id: { $in: productIds } });

    // Count by category
    const categoryCount = {};
    products.forEach(product => {
      if (!categoryCount[product.category]) {
        categoryCount[product.category] = 0;
      }
      categoryCount[product.category]++;
    });

    // Format for response
    for (const [category, count] of Object.entries(categoryCount)) {
      productsByCategory.push({ _id: category, count });
    }
  }

  // Top products for this shop
  const topProducts = await Order.aggregate([
    { $match: { shop: shopId } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        orderCount: { $sum: 1 },
        totalQuantity: { $sum: '$items.quantity' }
      }
    },
    { $sort: { orderCount: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'productDetails'
      }
    },
    { $unwind: '$productDetails' },
    {
      $project: {
        _id: 1,
        name: '$productDetails.name',
        category: '$productDetails.category',
        orderCount: 1,
        totalQuantity: 1
      }
    }
  ]);

  return {
    totalProducts,
    productsByCategory,
    topProducts
  };
}

/**
 * Get shops section data
 */
async function getShopsSection() {
  // Total shops count
  const totalShops = await Shop.countDocuments();

  // Shops by category
  const shopsByCategory = await Shop.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    }
  ]);

  // Top shops by order count
  const topShops = await Order.aggregate([
    {
      $group: {
        _id: '$shop',
        orderCount: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' }
      }
    },
    { $sort: { orderCount: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'shops',
        localField: '_id',
        foreignField: '_id',
        as: 'shopDetails'
      }
    },
    { $unwind: '$shopDetails' },
    {
      $project: {
        _id: 1,
        name: '$shopDetails.name',
        category: '$shopDetails.category',
        orderCount: 1,
        totalRevenue: 1
      }
    }
  ]);

  // Currently open shops
  const openShops = await Shop.countDocuments({ isOpen: true });

  return {
    totalShops,
    openShops,
    shopsByCategory,
    topShops
  };
}

module.exports = exports;
