const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController.js');
const { authAdmin } = require('../middleware/auth.js');

router.post('/login', adminController.login);
router.post('/refresh-token', adminController.refreshToken);
router.post('/', adminController.createAdmin);
router.get('/current', adminController.getCurrentAdmin);
router.get('/profile', authAdmin, adminController.getAdminProfile);
router.get('/', adminController.getAllAdmins);
router.get('/:id', adminController.getAdminById);
router.put('/:id', adminController.updateAdmin);
router.delete('/:id', adminController.deleteAdmin);

module.exports = router;