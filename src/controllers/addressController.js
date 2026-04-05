const pool = require('../config/db');

const getAddresses = async (req, res) => {
  try {
    const [addresses] = await pool.execute('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC', [req.user.id]);
    res.json({ success: true, addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const addAddress = async (req, res) => {
  try {
    const { tag, name, phone, flat, area, city, state, pincode, is_default } = req.body;

    if (is_default) {
      await pool.execute('UPDATE addresses SET is_default = FALSE WHERE user_id = ?', [req.user.id]);
    }

    const [result] = await pool.execute(
      'INSERT INTO addresses (user_id, tag, name, phone, flat, area, city, state, pincode, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, tag || 'Home', name, phone, flat, area, city, state, pincode, is_default || false]
    );

    res.status(201).json({ success: true, message: 'Address added', id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateAddress = async (req, res) => {
  try {
    const { tag, name, phone, flat, area, city, state, pincode, is_default } = req.body;

    if (is_default) {
      await pool.execute('UPDATE addresses SET is_default = FALSE WHERE user_id = ?', [req.user.id]);
    }

    await pool.execute(
      'UPDATE addresses SET tag=?, name=?, phone=?, flat=?, area=?, city=?, state=?, pincode=?, is_default=? WHERE id=? AND user_id=?',
      [tag, name, phone, flat, area, city, state, pincode, is_default || false, req.params.id, req.user.id]
    );

    res.json({ success: true, message: 'Address updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteAddress = async (req, res) => {
  try {
    await pool.execute('DELETE FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Address deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAddresses, addAddress, updateAddress, deleteAddress };