// backend/src/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { auth } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    const user = await db('users')
      .where({ username, is_active: true })
      .leftJoin('villages', 'users.village_id', 'villages.id')
      .leftJoin('mandals', 'users.mandal_id', 'mandals.id')
      .leftJoin('districts', 'users.district_id', 'districts.id')
      .select(
        'users.*',
        'villages.name as village_name',
        'mandals.name as mandal_name',
        'districts.name as district_name'
      )
      .first();

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        village_id: user.village_id,
        mandal_id: user.mandal_id,
        district_id: user.district_id,
        state_id: user.state_id,
        full_name: user.full_name,
        village_name: user.village_name,
        mandal_name: user.mandal_name,
        district_name: user.district_name,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    await db('users').where({ id: user.id }).update({ last_login_at: new Date() });
    await db('login_history').insert({ user_id: user.id, ip_address: req.ip, success: true });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        mobile: user.mobile,
        role: user.role,
        village_id: user.village_id,
        village_name: user.village_name,
        mandal_id: user.mandal_id,
        mandal_name: user.mandal_name,
        district_id: user.district_id,
        district_name: user.district_name,
        preferred_language: user.preferred_language,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await db('users').where({ id: req.user.id }).select('-password_hash').first();
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', auth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await db('users').where({ id: req.user.id }).first();
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(400).json({ success: false, message: 'Current password incorrect' });
    const hash = await bcrypt.hash(new_password, 10);
    await db('users').where({ id: req.user.id }).update({ password_hash: hash });
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/auth/login-history
router.get('/login-history', auth, async (req, res) => {
  try {
    const history = await db('login_history')
      .where({ user_id: req.user.id })
      .orderBy('created_at', 'desc')
      .limit(20);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
