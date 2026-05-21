// backend/src/routes/notifications.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const data = await db('notifications')
      .where(function() {
        this.where({ user_id: req.user.id }).orWhere({ village_id: req.user.village_id });
      })
      .orderBy('created_at', 'desc').limit(50);
    const unread = await db('notifications')
      .where({ user_id: req.user.id, is_read: false }).count('id as c').first();
    res.json({ success: true, data, unread_count: parseInt(unread.c) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id/read', auth, async (req, res) => {
  try {
    await db('notifications').where({ id: req.params.id }).update({ is_read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/read-all', auth, async (req, res) => {
  try {
    await db('notifications').where({ user_id: req.user.id, is_read: false }).update({ is_read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
