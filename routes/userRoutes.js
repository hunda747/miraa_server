const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth } = require('../middleware/auth');

router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/google-login', userController.googleLogin);
router.post('/refresh-token', userController.refreshToken);
router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateUser);
router.delete('/profile', auth, userController.deleteUser);
router.get('/', userController.getAllUsers);

module.exports = router;