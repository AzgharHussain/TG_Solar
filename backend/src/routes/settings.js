// backend/src/routes/settings.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Village profile
router.get('/village', auth, async (req, res) => {
  try {
    const village_id = req.query.village_id || req.user.village_id;
    const data = await db('villages').where({ id: village_id }).first();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/village', auth, requireRole('sarpanch', 'admin'), async (req, res) => {
  try {
    const village_id = req.user.village_id;
    const [updated] = await db('villages').where({ id: village_id }).update(req.body).returning('*');
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// User management
router.get('/users', auth, async (req, res) => {
  try {
    const data = await db('users')
      .where({ village_id: req.user.village_id })
      .select('id', 'username', 'full_name', 'mobile', 'role', 'is_active', 'last_login_at', 'created_at');
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/users', auth, requireRole('sarpanch', 'admin'), async (req, res) => {
  try {
    const { username, full_name, mobile, role, password } = req.body;
    const hash = await bcrypt.hash(password || 'Admin@123', 10);
    const [user] = await db('users').insert({
      username, full_name, mobile, role, password_hash: hash,
      village_id: req.user.village_id,
      mandal_id: req.user.mandal_id,
      district_id: req.user.district_id,
      state_id: req.user.state_id,
    }).returning('id', 'username', 'full_name', 'role');
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

router.put('/users/:id', auth, requireRole('sarpanch', 'admin'), async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.password) {
      update.password_hash = await bcrypt.hash(update.password, 10);
      delete update.password;
    }
    delete update.username;
    const [updated] = await db('users').where({ id: req.params.id }).update(update).returning('id', 'username', 'full_name', 'role', 'is_active');
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Audit logs
router.get('/audit-logs', auth, requireRole('state', 'admin'), async (req, res) => {
  try {
    const data = await db('audit_logs')
      .leftJoin('users', 'audit_logs.user_id', 'users.id')
      .select('audit_logs.*', 'users.username', 'users.full_name')
      .orderBy('audit_logs.created_at', 'desc')
      .limit(200);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
