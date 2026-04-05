const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, markAllRead, deleteNotification } = require('../controllers/notificationController');
const auth = require('../middleware/auth');

router.get('/', auth, getNotifications);
router.put('/mark-read/:id', auth, markAsRead);
router.put('/mark-all-read', auth, markAllRead);
router.delete('/:id', auth, deleteNotification);

module.exports = router;