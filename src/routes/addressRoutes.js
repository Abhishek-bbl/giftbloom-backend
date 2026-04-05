const express = require('express');
const router = express.Router();
const { getAddresses, addAddress, updateAddress, deleteAddress } = require('../controllers/addressController');
const auth = require('../middleware/auth');

router.get('/', auth, getAddresses);
router.post('/add', auth, addAddress);
router.put('/:id', auth, updateAddress);
router.delete('/:id', auth, deleteAddress);

module.exports = router;