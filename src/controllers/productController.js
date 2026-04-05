const pool = require('../config/db');

const getAllProducts = async (req, res) => {
  try {
    const { category, occasion, search, sort, minPrice, maxPrice } = req.query;
    let query = 'SELECT * FROM products WHERE is_active = TRUE';
    const params = [];

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (occasion && occasion !== 'All') {
      query += ' AND occasion = ?';
      params.push(occasion);
    }

    if (search) {
      query += ' AND (name LIKE ? OR category LIKE ? OR occasion LIKE ? OR JSON_SEARCH(keywords, "one", ?) IS NOT NULL)';
      const s = `%${search}%`;
      params.push(s, s, s, `%${search}%`);
    }

    if (minPrice) {
      query += ' AND price >= ?';
      params.push(minPrice);
    }

    if (maxPrice) {
      query += ' AND price <= ?';
      params.push(maxPrice);
    }

    if (sort === 'price_asc') query += ' ORDER BY price ASC';
    else if (sort === 'price_desc') query += ' ORDER BY price DESC';
    else if (sort === 'rating') query += ' ORDER BY rating DESC';
    else query += ' ORDER BY reviews DESC';

    const [products] = await pool.execute(query, params);
    res.json({ success: true, products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getProductById = async (req, res) => {
  try {
    const [products] = await pool.execute('SELECT * FROM products WHERE id = ? AND is_active = TRUE', [req.params.id]);
    if (!products.length) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, product: products[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllProducts, getProductById };