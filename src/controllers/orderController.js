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
      payment_method, coupon_code, subtotal, delivery_charge,
      discount, total, payment_id
    } = req.body;

    const order_number = generateOrderNumber();

    const [orderResult] = await conn.execute(
      `INSERT INTO orders (order_number, user_id, subtotal, delivery_charge, discount, total,
       delivery_address, delivery_date, delivery_slot, delivery_type, surprise_delivery,
       special_instructions, payment_method, payment_id, coupon_code, payment_status, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'placed')`,
      [
        order_number, req.user.id, subtotal, delivery_charge || 0,
        discount || 0, total, JSON.stringify(delivery_address),
        delivery_date || null, delivery_slot || null,
        delivery_type || 'standard', surprise_delivery || false,
        special_instructions || null, payment_method || 'Online',
        payment_id || null, coupon_code || null,
        payment_id ? 'paid' : 'pending'
      ]
    );

    const order_id = orderResult.insertId;

    for (const item of items) {
      await conn.execute(
        `INSERT INTO order_items (order_id, product_id, product_name, product_image, quantity, price, personalization)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          order_id, item.product_id, item.name, item.image || '',
          item.quantity || 1, item.price,
          JSON.stringify(item.personalization || {})
        ]
      );
    }

    await conn.execute('DELETE FROM cart WHERE user_id = ?', [req.user.id]);

    await conn.execute(
      'INSERT INTO notifications (user_id, type, title, message, action_label) VALUES (?, ?, ?, ?, ?)',
      [
        req.user.id, 'order',
        `Order #${order_number} placed successfully!`,
        `Your gift is being prepared with love. Expected delivery in ${delivery_type === 'express' ? '1-2' : '3-5'} business days.`,
        'Track Order'
      ]
    );

    await conn.commit();
    res.json({
      success: true,
      message: 'Order placed successfully',
      order_id,
      order_number,
    });
  } catch (error) {
    await conn.rollback();
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Server error creating order' });
  } finally {
    conn.release();
  }
};

const getUserOrders = async (req, res) => {
  try {
    const [orders] = await pool.execute(
      `SELECT o.*, 
       COUNT(oi.id) as item_count
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = ?
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    for (const order of orders) {
      const [items] = await pool.execute(
        'SELECT * FROM order_items WHERE order_id = ?',
        [order.id]
      );
      order.items = items.map(item => ({
        ...item,
        personalization: typeof item.personalization === 'string'
          ? JSON.parse(item.personalization || '{}')
          : item.personalization || {},
      }));
      order.delivery_address = typeof order.delivery_address === 'string'
        ? JSON.parse(order.delivery_address || '{}')
        : order.delivery_address || {};
    }

    res.json({ success: true, orders });
  } catch (error) {
    console.error('Get orders error:', error);
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

    const order = orders[0];
    const [items] = await pool.execute(
      'SELECT * FROM order_items WHERE order_id = ?',
      [order.id]
    );

    order.items = items.map(item => ({
      ...item,
      personalization: typeof item.personalization === 'string'
        ? JSON.parse(item.personalization || '{}')
        : item.personalization || {},
    }));

    order.delivery_address = typeof order.delivery_address === 'string'
      ? JSON.parse(order.delivery_address || '{}')
      : order.delivery_address || {};

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getAllOrdersAdmin = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
                 COUNT(oi.id) as item_count
                 FROM orders o
                 JOIN users u ON o.user_id = u.id
                 LEFT JOIN order_items oi ON o.id = oi.order_id`;
    const params = [];

    if (status && status !== 'all') {
      query += ' WHERE o.status = ?';
      params.push(status);
    }

    query += ' GROUP BY o.id ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [orders] = await pool.execute(query, params);

    for (const order of orders) {
      const [items] = await pool.execute('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      order.items = items.map(item => ({
        ...item,
        personalization: typeof item.personalization === 'string'
          ? JSON.parse(item.personalization || '{}')
          : item.personalization || {},
      }));
      order.delivery_address = typeof order.delivery_address === 'string'
        ? JSON.parse(order.delivery_address || '{}')
        : order.delivery_address || {};
    }

    const [[{ total }]] = await pool.execute('SELECT COUNT(*) as total FROM orders');
    const [[stats]] = await pool.execute(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total) as total_revenue,
        COUNT(CASE WHEN status = 'placed' THEN 1 END) as new_orders,
        COUNT(CASE WHEN status = 'preparing' THEN 1 END) as preparing,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered
      FROM orders
    `);

    res.json({ success: true, orders, total, stats, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Admin orders error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['placed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    await pool.execute('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);

    const [[order]] = await pool.execute(
      'SELECT o.*, u.id as uid FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?',
      [req.params.id]
    );

    const statusMessages = {
      preparing: 'Your order is being prepared with love!',
      out_for_delivery: 'Your gift is out for delivery! Expected today.',
      delivered: 'Your gift has been delivered! We hope they loved it.',
      cancelled: 'Your order has been cancelled. Refund will be processed in 3-5 days.',
    };

    if (statusMessages[status]) {
      await pool.execute(
        'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
        [order.uid, 'order', `Order #${order.order_number} Update`, statusMessages[status]]
      );
    }

    res.json({ success: true, message: 'Order status updated' });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { createOrder, getUserOrders, getOrderById, getAllOrdersAdmin, updateOrderStatus };