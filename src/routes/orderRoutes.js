const express = require('express');
const router = express.Router();
const { createOrder, getUserOrders, getOrderById, getAllOrdersAdmin, updateOrderStatus } = require('../controllers/orderController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

router.post('/create', auth, createOrder);
router.get('/', auth, getUserOrders);
router.get('/admin/all', adminAuth, getAllOrdersAdmin);
router.put('/admin/:id/status', adminAuth, updateOrderStatus);
router.get('/:id', auth, getOrderById);

module.exports = router;