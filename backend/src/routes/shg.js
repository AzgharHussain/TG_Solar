// backend/src/routes/shg.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const village_id = req.query.village_id || req.user.village_id;
    const data = await db('shg').where({ village_id, is_active: true });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const shg = await db('shg').where({ id: req.params.id }).first();
    const assets = await db('shg_assets').where({ shg_id: req.params.id });
    const collections = await db('shg_collections').where({ shg_id: req.params.id }).orderBy('created_at', 'desc');
    const expenses = await db('shg_expenses').where({ shg_id: req.params.id }).orderBy('expense_date', 'desc');
    res.json({ success: true, data: { ...shg, assets, collections, expenses } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', auth, requireRole('sarpanch', 'admin'), async (req, res) => {
  try {
    const village_id = req.user.village_id;
    const count = await db('shg').where({ village_id }).count('id as c').first();
    const seq = String(parseInt(count.c) + 1).padStart(3, '0');
    const village = await db('villages').where({ id: village_id }).first();
    const shg_id = `SHG-${village.village_code || 'VLG'}-${seq}`;
    const [shg] = await db('shg').insert({ shg_id, village_id, ...req.body }).returning('*');
    res.status(201).json({ success: true, data: shg });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id', auth, requireRole('sarpanch', 'admin'), async (req, res) => {
  try {
    const [updated] = await db('shg').where({ id: req.params.id }).update(req.body).returning('*');
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/:id/collections', auth, requireRole('sarpanch', 'admin'), async (req, res) => {
  try {
    const [coll] = await db('shg_collections').insert({ shg_id: req.params.id, ...req.body }).returning('*');
    res.status(201).json({ success: true, data: coll });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/:id/expenses', auth, requireRole('sarpanch', 'admin'), async (req, res) => {
  try {
    const [exp] = await db('shg_expenses').insert({ shg_id: req.params.id, ...req.body }).returning('*');
    res.status(201).json({ success: true, data: exp });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
