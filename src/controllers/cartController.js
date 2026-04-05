const pool = require('../config/db');

const getCart = async (req, res) => {
  try {
    const [items] = await pool.execute(
      `SELECT c.id, c.quantity, c.personalization, 
       p.id as product_id, p.name, p.price, p.image, p.category, p.delivery_days
       FROM cart c 
       JOIN products p ON c.product_id = p.id 
       WHERE c.user_id = ?`,
      [req.user.id]
    );
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    res.json({ success: true, items, total });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const addToCart = async (req, res) => {
  try {
    const { product_id, quantity = 1, personalization } = req.body;

    const [existing] = await pool.execute(
      'SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?',
      [req.user.id, product_id]
    );

    if (existing.length) {
      await pool.execute(
        'UPDATE cart SET quantity = quantity + ?, personalization = ? WHERE id = ?',
        [quantity, JSON.stringify(personalization || {}), existing[0].id]
      );
    } else {
      await pool.execute(
        'INSERT INTO cart (user_id, product_id, quantity, personalization) VALUES (?, ?, ?, ?)',
        [req.user.id, product_id, quantity, JSON.stringify(personalization || {})]
      );
    }

    res.json({ success: true, message: 'Added to cart' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateCart = async (req, res) => {
  try {
    const { cart_id, quantity } = req.body;
    if (quantity < 1) {
      await pool.execute('DELETE FROM cart WHERE id = ? AND user_id = ?', [cart_id, req.user.id]);
    } else {
      await pool.execute('UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?', [quantity, cart_id, req.user.id]);
    }
    res.json({ success: true, message: 'Cart updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const removeFromCart = async (req, res) => {
  try {
    await pool.execute('DELETE FROM cart WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Removed from cart' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const clearCart = async (req, res) => {
  try {
    await pool.execute('DELETE FROM cart WHERE user_id = ?', [req.user.id]);
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getCart, addToCart, updateCart, removeFromCart, clearCart };