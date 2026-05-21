// backend/src/routes/district.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

router.get('/mandals', auth, async (req, res) => {
  try {
    const district_id = req.query.district_id || req.user.district_id;
    const data = await db('mandals').where({ district_id });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/vendors', auth, async (req, res) => {
  try {
    const data = await db('vendors').where({ is_blacklisted: false }).orderBy('rating', 'desc');
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/schemes', auth, async (req, res) => {
  try {
    const data = await db('schemes').where({ is_active: true });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
