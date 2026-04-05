const pool = require('../config/db');

const generateOrderNumber = () => {
  return 'GB' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);
};

const createOrder = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      items, delivery_address, delivery_date, delivery_slot,
      delivery_type, surprise_delivery, special_instructions,
      payment_method, coupon_code, subtotal, delivery_charge, discount, total
    } = req.body;

    const order_number = generateOrderNumber();

    const [orderResult] = await conn.execute(
      `INSERT INTO orders (order_number, user_id, subtotal, delivery_charge, discount, total, 
       delivery_address, delivery_date, delivery_slot, delivery_type, surprise_delivery, 
       special_instructions, payment_method, coupon_code, payment_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        order_number, req.user.id, subtotal, delivery_charge, discount, total,
        JSON.stringify(delivery_address), delivery_date, delivery_slot,
        delivery_type || 'standard', surprise_delivery || false,
        special_instructions || null, payment_method, coupon_code || null
      ]
    );

    const order_id = orderResult.insertId;

    for (const item of items) {
      await conn.execute(
        `INSERT INTO order_items (order_id, product_id, product_name, product_image, quantity, price, personalization) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [order_id, item.product_id, item.name, item.image, item.quantity, item.price, JSON.stringify(item.personalization || {})]
      );
    }

    await conn.execute('DELETE FROM cart WHERE user_id = ?', [req.user.id]);

    await conn.execute(
      'INSERT INTO notifications (user_id, type, title, message, action_label) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'order', `Order ${order_number} placed! 🎉`, 'Your gift is being prepared with love and will be delivered soon.', 'Track Order']
    );

    await conn.commit();
    res.json({ success: true, message: 'Order placed successfully', order_id, order_number });
  } catch (error) {
    await conn.rollback();
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
};

const getUserOrders = async (req, res) => {
  try {
    const [orders] = await pool.execute(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    for (const order of orders) {
      const [items] = await pool.execute('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      order.items = items;
    }

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getOrderById = async (req, res) => {
  try {
    const [orders] = await pool.execute(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (!orders.length) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const [items] = await pool.execute('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
    orders[0].items = items;

    res.json({ success: true, order: orders[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { createOrder, getUserOrders, getOrderById };