const express = require('express');
const router = express.Router();
const { getWishlist, addToWishlist, removeFromWishlist, checkWishlist } = require('../controllers/wishlistController');
const auth = require('../middleware/auth');

router.get('/', auth, getWishlist);
router.get('/check', auth, checkWishlist);
router.post('/add', auth, addToWishlist);
router.delete('/remove/:id', auth, removeFromWishlist);

module.exports = router;