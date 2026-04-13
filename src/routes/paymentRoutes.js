const express = require('express');
const router = express.Router();
const { createPaymentOrder, verifyPayment, validateCoupon } = require('../controllers/paymentController');
const auth = require('../middleware/auth');

router.post('/create-order', auth, createPaymentOrder);
router.post('/verify', auth, verifyPayment);
router.post('/validate-coupon', auth, validateCoupon);

module.exports = router; 