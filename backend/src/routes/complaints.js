// backend/src/routes/complaints.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');
const { uploadComplaint } = require('../middleware/upload');
const { sendSMS } = require('../services/smsService');

router.get('/', auth, async (req, res) => {
  try {
    const { village_id, status, asset_type, urgency, page = 1, limit = 50 } = req.query;
    const vid = village_id || req.user.village_id;
    let q = db('complaints').where({ village_id: vid });
    if (status) q = q.where('status', status);
    if (asset_type) q = q.where('asset_type', asset_type);
    if (urgency) q = q.where('urgency', urgency);
    const total = await q.clone().count('id as count').first();
    const data = await q.clone().orderBy('created_at', 'desc')
      .limit(parseInt(limit)).offset((parseInt(page) - 1) * parseInt(limit));
    res.json({ success: true, data, total: parseInt(total.count) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const complaint = await db('complaints').where({ id: req.params.id }).first();
    res.json({ success: true, data: complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', auth, uploadComplaint.single('photo'), async (req, res) => {
  try {
    const village_id = req.query.village_id || req.user.village_id;
    const count = await db('complaints').count('id as c').first();
    const ticket_id = `TKT-${String(parseInt(count.c) + 1).padStart(5, '0')}`;
    const [complaint] = await db('complaints').insert({
      ticket_id,
      village_id,
      ...req.body,
      photo_url: req.file ? `/uploads/complaints/${req.file.filename}` : null,
      status: 'open',
    }).returning('*');
    res.status(201).json({ success: true, data: complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id', auth, uploadComplaint.single('after_repair_photo'), async (req, res) => {
  try {
    const updates = { ...req.body };
    if (req.file) updates.after_repair_photo_url = `/uploads/complaints/${req.file.filename}`;
    if (updates.status === 'resolved') updates.resolved_date = new Date();
    const [updated] = await db('complaints').where({ id: req.params.id }).update(updates).returning('*');

    if (updates.status === 'resolved' && updated.asset_id && updated.asset_type === 'rooftop') {
      const hh = await db('households').where({ id: updated.asset_id }).first();
      if (hh?.mobile) await sendSMS(hh.mobile, 'complaint_resolved', { ticket_id: updated.ticket_id });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
