const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const ADMIN_EMAILS = ['abhibbl2@gmail.com', 'admin@giftbloom.in'];

const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await pool.execute('SELECT id, name, email FROM users WHERE id = ?', [decoded.id]);
    if (!users.length) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (!ADMIN_EMAILS.includes(users[0].email)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    req.user = users[0];
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = adminAuth;