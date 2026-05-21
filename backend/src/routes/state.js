// backend/src/routes/state.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

router.get('/districts', auth, async (req, res) => {
  try {
    const data = await db('districts').where({ state_id: req.user.state_id || 1 });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/vendors', auth, async (req, res) => {
  try {
    const data = await db('vendors').orderBy('rating', 'desc');
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/vendors', auth, async (req, res) => {
  try {
    const [v] = await db('vendors').insert(req.body).returning('*');
    res.status(201).json({ success: true, data: v });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/vendors/:id', auth, async (req, res) => {
  try {
    const [v] = await db('vendors').where({ id: req.params.id }).update(req.body).returning('*');
    res.json({ success: true, data: v });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/schemes', auth, async (req, res) => {
  try {
    const data = await db('schemes').orderBy('created_at', 'desc');
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/schemes', auth, async (req, res) => {
  try {
    const [s] = await db('schemes').insert(req.body).returning('*');
    res.status(201).json({ success: true, data: s });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
