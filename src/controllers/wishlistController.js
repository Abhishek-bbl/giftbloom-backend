const pool = require('../config/db');

const getWishlist = async (req, res) => {
  try {
    const [items] = await pool.execute(
      `SELECT w.id, p.id as product_id, p.name, p.price, p.image, p.category, p.tag
       FROM wishlist w JOIN products p ON w.product_id = p.id WHERE w.user_id = ?`,
      [req.user.id]
    );
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const { product_id } = req.body;
    await pool.execute(
      'INSERT IGNORE INTO wishlist (user_id, product_id) VALUES (?, ?)',
      [req.user.id, product_id]
    );
    res.json({ success: true, message: 'Added to wishlist' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    await pool.execute('DELETE FROM wishlist WHERE product_id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Removed from wishlist' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist };