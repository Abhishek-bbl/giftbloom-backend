const pool = require('../config/db');

const getWishlist = async (req, res) => {
  try {
    const [items] = await pool.execute(
      `SELECT w.id, w.product_id, p.name, p.price, p.image, p.category, p.tag, p.rating, p.reviews
       FROM wishlist w 
       JOIN products p ON w.product_id = p.id 
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, items });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const { product_id } = req.body;
    if (!product_id) {
      return res.status(400).json({ success: false, message: 'Product ID required' });
    }
    const [existing] = await pool.execute(
      'SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?',
      [req.user.id, product_id]
    );
    if (existing.length) {
      return res.json({ success: true, message: 'Already in wishlist', alreadyAdded: true });
    }
    await pool.execute(
      'INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)',
      [req.user.id, product_id]
    );
    res.json({ success: true, message: 'Added to wishlist' });
  } catch (error) {
    console.error('Add wishlist error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    await pool.execute(
      'DELETE FROM wishlist WHERE product_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Removed from wishlist' });
  } catch (error) {
    console.error('Remove wishlist error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const checkWishlist = async (req, res) => {
  try {
    const [items] = await pool.execute(
      'SELECT product_id FROM wishlist WHERE user_id = ?',
      [req.user.id]
    );
    const productIds = items.map(item => item.product_id);
    res.json({ success: true, productIds });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist, checkWishlist };