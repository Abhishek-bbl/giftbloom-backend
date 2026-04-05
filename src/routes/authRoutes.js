const express = require('express');
const router = express.Router();
const { signup, login, forgotPassword, getProfile, updateProfile } = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);

module.exports = router;