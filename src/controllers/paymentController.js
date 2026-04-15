const Razorpay = require('razorpay');
const crypto = require('crypto');
const pool = require('../config/db');

const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'placeholder') {
    throw new Error('Razorpay not configured');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

const createPaymentOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', order_db_id } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }
    const razorpay = getRazorpay();
    const options = {
      amount: Math.round(amount * 100),
      currency,
      receipt: `receipt_${order_db_id || Date.now()}`,
      notes: {
        order_db_id: order_db_id || '',
        user_id: req.user.id,
      },
    };
    const razorpayOrder = await razorpay.orders.create(options);
    res.json({
      success: true,
      order: razorpayOrder,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Razorpay create order error:', error);
    res.status(500).json({ success: false, message: error.message || 'Payment initiation failed' });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_db_id,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      await pool.execute(
        'UPDATE orders SET payment_status = "failed" WHERE id = ? AND user_id = ?',
        [order_db_id, req.user.id]
      );
      return res.status(400).json({ success: false, message: 'Payment verification failed. Please contact support.' });
    }

    await pool.execute(
      'UPDATE orders SET payment_status = "paid", payment_id = ?, status = "preparing" WHERE id = ? AND user_id = ?',
      [razorpay_payment_id, order_db_id, req.user.id]
    );

    const [[order]] = await pool.execute(
      'SELECT order_number FROM orders WHERE id = ?',
      [order_db_id]
    );

    await pool.execute(
      'INSERT INTO notifications (user_id, type, title, message, action_label) VALUES (?, ?, ?, ?, ?)',
      [
        req.user.id, 'order',
        `Payment successful! Order #${order?.order_number}`,
        'Your payment was received. Your gift is now being lovingly prepared.',
        'Track Order'
      ]
    );

    res.json({ success: true, message: 'Payment verified', order_number: order?.order_number });
  } catch (error) {
    console.error('Payment verify error:', error);
    res.status(500).json({ success: false, message: 'Server error during verification' });
  }
};

const validateCoupon = async (req, res) => {
  try {
    const { code, order_amount } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Coupon code required' });

    const [coupons] = await pool.execute(
      'SELECT * FROM coupons WHERE code = ? AND is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW())',
      [code.toUpperCase()]
    );

    if (!coupons.length) {
      return res.status(404).json({ success: false, message: 'Invalid or expired coupon code' });
    }

    const coupon = coupons[0];
    if (order_amount < coupon.min_order_amount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount is ₹${coupon.min_order_amount}`
      });
    }

    const discount = Math.round((order_amount * coupon.discount_percent) / 100);
    res.json({
      success: true,
      discount_percent: coupon.discount_percent,
      discount_amount: discount,
      message: `${coupon.discount_percent}% discount applied! You save ₹${discount}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { createPaymentOrder, verifyPayment, validateCoupon };