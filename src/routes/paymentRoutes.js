const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment, validateCoupon } = require('../controllers/paymentController');
const auth = require('../middleware/auth');

router.post('/create-order', auth, createOrder);
router.post('/verify', auth, verifyPayment);
router.post('/validate-coupon', auth, validateCoupon);

module.exports = router;