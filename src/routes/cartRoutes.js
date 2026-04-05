const express = require('express');
const router = express.Router();
const { getCart, addToCart, updateCart, removeFromCart, clearCart } = require('../controllers/cartController');
const auth = require('../middleware/auth');

router.get('/', auth, getCart);
router.post('/add', auth, addToCart);
router.put('/update', auth, updateCart);
router.delete('/remove/:id', auth, removeFromCart);
router.delete('/clear', auth, clearCart);

module.exports = router;