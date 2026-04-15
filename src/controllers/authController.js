const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};

const signup = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)',
      [name, email, phone || null, password_hash]
    );

    await pool.execute(
      'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
      [result.insertId, 'promo', 'Welcome to Giftbloom! 🌸', 'Thank you for joining us. Start exploring our collection of beautiful gifts!']
    );

    const token = generateToken(result.insertId);
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: { id: result.insertId, name, email, phone },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Server error during signup' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (!users.length) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const user = users[0];
    if (!user.password_hash) {
      return res.status(400).json({ success: false, message: 'Please use Google to login' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user.id);
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const [users] = await pool.execute('SELECT id, name FROM users WHERE email = ?', [email]);
    if (!users.length) {
      return res.status(404).json({ success: false, message: 'No account found with this email address' });
    }
    // In production: send real reset email here
    // For now: just confirm the email exists
    res.json({ 
      success: true, 
      message: 'Password reset link sent to your email' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, phone, profile_photo, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json({ success: true, user: users[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    await pool.execute(
      'UPDATE users SET name = ?, phone = ? WHERE id = ?',
      [name, phone, req.user.id]
    );
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { signup, login, forgotPassword, getProfile, updateProfile };