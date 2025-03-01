const DeliveryCharge = require('../models/DeliveryCharge');

// Create a new delivery charge range
exports.createDeliveryCharge = async (req, res) => {
  try {
    const { minDistance, maxDistance, charge } = req.body;

    // Check for overlapping ranges
    const overlapping = await DeliveryCharge.findOne({
      isActive: true,
      $or: [
        { minDistance: { $lte: minDistance }, maxDistance: { $gt: minDistance } },
        { minDistance: { $lt: maxDistance }, maxDistance: { $gte: maxDistance } },
        { minDistance: { $gte: minDistance }, maxDistance: { $lte: maxDistance } }
      ]
    });

    if (overlapping) {
      return res.status(400).json({
        message: 'This range overlaps with an existing range',
        overlappingRange: {
          minDistance: overlapping.minDistance,
          maxDistance: overlapping.maxDistance,
          charge: overlapping.charge
        }
      });
    }

    const deliveryCharge = new DeliveryCharge({
      minDistance,
      maxDistance,
      charge
    });

    await deliveryCharge.save();
    res.status(201).json(deliveryCharge);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all delivery charge ranges
exports.getAllDeliveryCharges = async (req, res) => {
  try {
    const deliveryCharges = await DeliveryCharge.find({ isActive: true })
      .sort({ minDistance: 1 });
    res.status(200).json(deliveryCharges);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a specific delivery charge range
exports.getDeliveryCharge = async (req, res) => {
  try {
    const deliveryCharge = await DeliveryCharge.findById(req.params.id);
    if (!deliveryCharge) {
      return res.status(404).json({ message: 'Delivery charge range not found' });
    }
    res.status(200).json(deliveryCharge);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a delivery charge range
exports.updateDeliveryCharge = async (req, res) => {
  try {
    const { minDistance, maxDistance, charge } = req.body;

    // Check for overlapping ranges (excluding the current one)
    if (minDistance !== undefined && maxDistance !== undefined) {
      const overlapping = await DeliveryCharge.findOne({
        _id: { $ne: req.params.id },
        isActive: true,
        $or: [
          { minDistance: { $lte: minDistance }, maxDistance: { $gt: minDistance } },
          { minDistance: { $lt: maxDistance }, maxDistance: { $gte: maxDistance } },
          { minDistance: { $gte: minDistance }, maxDistance: { $lte: maxDistance } }
        ]
      });

      if (overlapping) {
        return res.status(400).json({
          message: 'This range overlaps with an existing range',
          overlappingRange: {
            minDistance: overlapping.minDistance,
            maxDistance: overlapping.maxDistance,
            charge: overlapping.charge
          }
        });
      }
    }

    const deliveryCharge = await DeliveryCharge.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!deliveryCharge) {
      return res.status(404).json({ message: 'Delivery charge range not found' });
    }

    res.status(200).json(deliveryCharge);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a delivery charge range (soft delete)
exports.deleteDeliveryCharge = async (req, res) => {
  try {
    const deliveryCharge = await DeliveryCharge.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!deliveryCharge) {
      return res.status(404).json({ message: 'Delivery charge range not found' });
    }

    res.status(200).json({ message: 'Delivery charge range deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Calculate delivery charge based on distance
exports.calculateDeliveryCharge = async (distance) => {
  try {
    // Find the appropriate charge for the given distance
    const chargeRecord = await DeliveryCharge.findOne({
      minDistance: { $lte: distance },
      maxDistance: { $gt: distance },
      isActive: true
    });

    if (chargeRecord) {
      return chargeRecord.charge;
    }

    // Fallback to default calculation if no range is defined
    // Base charge
    let charge = 20;
    // Add additional charge per km
    charge += Math.ceil(distance) * 10;

    return charge;
  } catch (error) {
    console.error('Error calculating delivery charge:', error);
    // Return default calculation in case of error
    return 20 + Math.ceil(distance) * 10;
  }
}; 