const express = require('express');
const router = express.Router();
const { getReminders, addReminder, deleteReminder } = require('../controllers/reminderController');
const auth = require('../middleware/auth');

router.get('/', auth, getReminders);
router.post('/add', auth, addReminder);
router.delete('/:id', auth, deleteReminder);

module.exports = router;