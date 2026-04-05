const pool = require('../config/db');

const getReminders = async (req, res) => {
  try {
    const [reminders] = await pool.execute(
      'SELECT * FROM reminders WHERE user_id = ? AND is_active = TRUE ORDER BY occasion_date ASC',
      [req.user.id]
    );
    res.json({ success: true, reminders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const addReminder = async (req, res) => {
  try {
    const { occasion_name, occasion_date, reminder_timing } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO reminders (user_id, occasion_name, occasion_date, reminder_timing) VALUES (?, ?, ?, ?)',
      [req.user.id, occasion_name, occasion_date, reminder_timing || '1week']
    );
    res.status(201).json({ success: true, message: 'Reminder set', id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteReminder = async (req, res) => {
  try {
    await pool.execute('UPDATE reminders SET is_active = FALSE WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Reminder deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getReminders, addReminder, deleteReminder };