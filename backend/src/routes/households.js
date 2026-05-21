// backend/src/routes/households.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');
const { uploadHousehold } = require('../middleware/upload');
const { sendSMS } = require('../services/smsService');

// GET /api/households - List households
router.get('/', auth, async (req, res) => {
  try {
    const { village_id, status, ward_no, search, page = 1, limit = 50 } = req.query;
    const vid = village_id || req.user.village_id;

    let query = db('households').where({ village_id: vid, is_deleted: false });
    if (status) query = query.where('solar_status', status);
    if (ward_no) query = query.where('ward_no', ward_no);
    if (search) query = query.where(function() {
      this.whereILike('head_name', `%${search}%`)
          .orWhereILike('house_no', `%${search}%`)
          .orWhereILike('mobile', `%${search}%`);
    });

    const total = await query.clone().count('id as count').first();
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const data = await query.clone().orderBy('id', 'desc').limit(parseInt(limit)).offset(offset);

    res.json({ success: true, data, total: parseInt(total.count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/households/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const household = await db('households').where({ id: req.params.id, is_deleted: false }).first();
    if (!household) return res.status(404).json({ success: false, message: 'Household not found' });
    const photos = await db('household_photos').where({ household_id: req.params.id });
    const apps = await db('applications').where({ household_id: req.params.id }).orderBy('created_at', 'desc');
    res.json({ success: true, data: { ...household, photos, applications: apps } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/households - Create household
router.post('/', auth, requireRole('sarpanch', 'admin'), uploadHousehold.fields([
  { name: 'house_front', maxCount: 1 },
  { name: 'roof_photo', maxCount: 1 },
  { name: 'bill_photo', maxCount: 1 },
]), async (req, res) => {
  try {
    const village_id = req.user.village_id;
    // Generate household ID
    const count = await db('households').where({ village_id }).count('id as c').first();
    const seq = String(parseInt(count.c) + 1).padStart(4, '0');
    const village = await db('villages').where({ id: village_id }).first();
    const household_id = `HH-${village.village_code || 'VLG'}-${seq}`;

    const { roof_length, roof_width } = req.body;
    const roof_area = parseFloat(roof_length || 0) * parseFloat(roof_width || 0);
    const recommended_capacity = (roof_area / 10).toFixed(2);

    const [newHH] = await db('households').insert({
      household_id,
      village_id,
      ...req.body,
      roof_area: roof_area.toFixed(2),
      recommended_capacity,
      solar_status: 'not_applied',
    }).returning('*');

    // Save photos
    if (req.files) {
      for (const [type, files] of Object.entries(req.files)) {
        for (const f of files) {
          await db('household_photos').insert({
            household_id: newHH.id,
            photo_type: type === 'house_front' ? 'house_front' : type === 'roof_photo' ? 'roof' : 'electricity_bill',
            file_url: `/uploads/houses/${f.filename}`,
            file_name: f.originalname,
          });
        }
      }
    }

    // Send SMS if mobile provided
    if (req.body.mobile) {
      await sendSMS(req.body.mobile, 'household_added', { village_name: village.name });
    }

    res.status(201).json({ success: true, data: newHH, message: 'Household added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// PUT /api/households/:id
router.put('/:id', auth, requireRole('sarpanch', 'admin'), uploadHousehold.fields([
  { name: 'house_front', maxCount: 1 }, { name: 'roof_photo', maxCount: 1 }, { name: 'bill_photo', maxCount: 1 },
]), async (req, res) => {
  try {
    const { roof_length, roof_width } = req.body;
    const updates = { ...req.body };
    if (roof_length && roof_width) {
      updates.roof_area = (parseFloat(roof_length) * parseFloat(roof_width)).toFixed(2);
      updates.recommended_capacity = (parseFloat(updates.roof_area) / 10).toFixed(2);
    }
    delete updates.household_id;
    const [updated] = await db('households').where({ id: req.params.id }).update(updates).returning('*');
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/households/:id
router.delete('/:id', auth, requireRole('sarpanch', 'admin'), async (req, res) => {
  try {
    await db('households').where({ id: req.params.id }).update({
      is_deleted: true,
      deleted_at: new Date(),
      deleted_reason: req.body.reason || 'Not specified',
    });
    res.json({ success: true, message: 'Household deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/households/:id/apply-solar
router.post('/:id/apply-solar', auth, requireRole('sarpanch', 'admin'), async (req, res) => {
  try {
    const hh = await db('households').where({ id: req.params.id }).first();
    if (!hh) return res.status(404).json({ success: false, message: 'Household not found' });
    if (hh.solar_status === 'installed') return res.status(400).json({ success: false, message: 'Already installed' });

    const count = await db('applications').where({ type: 'rooftop' }).count('id as c').first();
    const app_id = `APP-RT-${String(parseInt(count.c) + 1).padStart(5, '0')}`;

    const [app] = await db('applications').insert({
      application_id: app_id,
      type: 'rooftop',
      household_id: hh.id,
      village_id: hh.village_id,
      status: 'submitted',
      submitted_date: new Date(),
      subsidy_central_pct: 30,
      subsidy_state_pct: 30,
    }).returning('*');

    await db('households').where({ id: hh.id }).update({ solar_status: 'applied' });

    if (hh.mobile) await sendSMS(hh.mobile, 'rooftop_applied', { app_id });

    res.json({ success: true, data: app, message: 'Solar application submitted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/households/:id/mark-installed
router.post('/:id/mark-installed', auth, requireRole('sarpanch', 'admin'), async (req, res) => {
  try {
    const { installation_date, installed_capacity, vendor_name } = req.body;
    const hh = await db('households').where({ id: req.params.id }).first();
    await db('households').where({ id: req.params.id }).update({
      solar_status: 'installed',
      installation_date,
      installed_capacity,
      vendor_name,
    });
    await db('applications').where({ household_id: req.params.id, type: 'rooftop' })
      .whereNot('status', 'installed').update({ status: 'installed', installation_date });

    if (hh.mobile) await sendSMS(hh.mobile, 'rooftop_installed', { capacity: installed_capacity });

    res.json({ success: true, message: 'Marked as installed' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/households/stats/village
router.get('/stats/village', auth, async (req, res) => {
  try {
    const village_id = req.query.village_id || req.user.village_id;
    const stats = await db('households')
      .where({ village_id, is_deleted: false })
      .select(db.raw(`
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE solar_status = 'applied') as applied,
        COUNT(*) FILTER (WHERE solar_status = 'installed') as installed,
        COUNT(*) FILTER (WHERE solar_status = 'not_applied') as not_applied
      `))
      .first();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
