const Razorpay = require('razorpay');
const crypto = require('crypto');
const pool = require('../config/db');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR' } = req.body;
    const options = {
      amount: amount * 100,
      currency,
      receipt: 'receipt_' + Date.now(),
    };
    const order = await razorpay.orders.create(options);
    res.json({ success: true, order });
  } catch (error) {
    console.error('Razorpay error:', error);
    res.status(500).json({ success: false, message: 'Payment initiation failed' });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_db_id } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    await pool.execute(
      'UPDATE orders SET payment_status = "paid", payment_id = ?, status = "preparing" WHERE id = ? AND user_id = ?',
      [razorpay_payment_id, order_db_id, req.user.id]
    );

    await pool.execute(
      'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
      [req.user.id, 'order', 'Payment successful! 💳', 'Your payment was received. Your gift is now being prepared.']
    );

    res.json({ success: true, message: 'Payment verified successfully' });
  } catch (error) {
    console.error('Payment verify error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const validateCoupon = async (req, res) => {
  try {
    const { code, order_amount } = req.body;
    const [coupons] = await pool.execute(
      'SELECT * FROM coupons WHERE code = ? AND is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW())',
      [code.toUpperCase()]
    );

    if (!coupons.length) {
      return res.status(404).json({ success: false, message: 'Invalid or expired coupon code' });
    }

    const coupon = coupons[0];
    if (order_amount < coupon.min_order_amount) {
      return res.status(400).json({ success: false, message: `Minimum order amount is ₹${coupon.min_order_amount}` });
    }

    const discount = Math.round((order_amount * coupon.discount_percent) / 100);
    res.json({ success: true, discount_percent: coupon.discount_percent, discount_amount: discount, message: `${coupon.discount_percent}% discount applied!` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { createOrder, verifyPayment, validateCoupon };