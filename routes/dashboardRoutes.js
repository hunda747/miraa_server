const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { auth } = require('../middleware/auth');

/**
 * @route   GET /api/dashboard
 * @desc    Get dashboard data organized in sections based on user role
 * @access  Authenticated users (data returned depends on role)
 */
router.get('/', auth, dashboardController.getDashboardData);

module.exports = router; 