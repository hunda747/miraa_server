const Shop = require('../models/ShopModel');
const multer = require('multer');
const path = require('path');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/shops') // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
}).single('image');

// Example of adding a shop
const addShop = async (req, res) => {
  try {
    upload(req, res, async function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      const {
        name,
        latitude,
        longitude,
        address,
        category,
        operatingHours,
        description
      } = req.body;

      const imagePath = req.file ? `/uploads/shops/${req.file.filename}` : null;

      const shop = new Shop({
        name,
        description,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        address,
        category,
        isOpen: true,
        image: imagePath,
        operatingHours
      });

      await shop.save();
      res.status(201).json(shop);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Express route handler for finding nearby shops
const getNearbyShops = async (req, res) => {
  try {
    const { latitude, longitude, radius = 5000 } = req.query; // radius in meters

    const shops = await Shop.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(radius)
        }
      },
      isOpen: true // optional filter
    })
      .select('name location address category image operatingHours description') // Select specific fields
      .limit(20); // Limit results

    // Calculate distance for each shop
    const shopsWithDistance = shops.map(shop => {
      const distance = calculateDistance(
        { lat: latitude, long: longitude },
        {
          lat: shop.location.coordinates[1],
          long: shop.location.coordinates[0]
        }
      );

      return {
        ...shop.toObject(),
        distance: Math.round(distance * 100) / 100 // Round to 2 decimal places
      };
    });

    res.json(shopsWithDistance);
  } catch (error) {
    console.log(error);

    res.status(500).json({ error: error.message });
  }
};

// Find shops by category within radius
const getShopsByCategory = async (req, res) => {
  try {
    const { latitude, longitude, radius = 5000, category } = req.query;

    const shops = await Shop.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(radius)
        }
      },
      category: category,
      isOpen: true
    })
      .limit(20);

    res.json(shops);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Search shops by name within radius
const searchShops = async (req, res) => {
  try {
    const { latitude, longitude, radius = 5000, searchTerm } = req.query;

    const shops = await Shop.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(radius)
        }
      },
      name: { $regex: searchTerm, $options: 'i' },
      isOpen: true
    })
      .limit(20);

    res.json(shops);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Distance calculation helper
function calculateDistance(from, to) {
  const R = 6371; // Earth's radius in km
  const dLat = deg2rad(to.lat - from.lat);
  const dLon = deg2rad(to.long - from.long);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(from.lat)) * Math.cos(deg2rad(to.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Get all shops
const getAllShops = async (req, res) => {
  try {
    const shops = await Shop.find({ isOpen: true });
    res.json(shops);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get shop by ID
const getShopById = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }
    res.json(shop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update shop
const updateShop = async (req, res) => {
  try {
    upload(req, res, async function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      const {
        name,
        latitude,
        longitude,
        address,
        category,
        isOpen,
        operatingHours,
        description
      } = req.body;

      const imagePath = req.file ? `/uploads/shops/${req.file.filename}` : undefined;

      const updatedShop = await Shop.findByIdAndUpdate(
        req.params.id,
        {
          name,
          description,
          location: latitude && longitude ? {
            type: 'Point',
            coordinates: [longitude, latitude]
          } : undefined,
          address,
          category,
          isOpen,
          ...(imagePath && { image: imagePath }),
          operatingHours
        },
        { new: true, runValidators: true }
      );

      if (!updatedShop) {
        return res.status(404).json({ message: 'Shop not found' });
      }

      res.json(updatedShop);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add product to shop
const addProductToShop = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { productId, price } = req.body;

    // Validate inputs
    if (!price || price <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid price is required'
      });
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found'
      });
    }

    // Check if product already exists in shop
    const existingProduct = shop.products.find(
      p => p.product.toString() === productId
    );

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        error: 'Product already exists in shop'
      });
    }

    shop.products.push({
      product: productId,
      price,
      inStock: true
    });

    await shop.save();

    // Populate the product details in response
    const updatedShop = await Shop.findById(shopId)
      .populate('products.product');

    res.status(200).json({
      success: true,
      data: updatedShop
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Update product in shop
const updateShopProduct = async (req, res) => {
  try {
    const { shopId, productId } = req.params;
    const { price, inStock } = req.body;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found'
      });
    }

    // Find the product in the shop's products array
    const productIndex = shop.products.findIndex(
      p => p.product.toString() === productId
    );

    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Product not found in shop'
      });
    }

    // Update the product details
    if (price !== undefined) shop.products[productIndex].price = price;
    if (inStock !== undefined) shop.products[productIndex].inStock = inStock;

    await shop.save();

    // Populate the product details in response
    const updatedShop = await Shop.findById(shopId)
      .populate('products.product');

    res.status(200).json({
      success: true,
      data: updatedShop
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Remove product from shop
const removeProductFromShop = async (req, res) => {
  try {
    const { shopId, productId } = req.params;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found'
      });
    }

    // Remove the product from the products array
    shop.products = shop.products.filter(
      p => p.product.toString() !== productId
    );

    await shop.save();

    res.status(200).json({
      success: true,
      data: shop
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Get shop products
const getShopProducts = async (req, res) => {
  try {
    const { shopId } = req.params;

    const shop = await Shop.findById(shopId)
      .populate('products.product');

    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found'
      });
    }

    res.status(200).json({
      success: true,
      data: shop.products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

module.exports = {
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
  getShopProducts
};
