// backend/src/routes/farmers.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');
const { uploadFarmer } = require('../middleware/upload');
const { sendSMS } = require('../services/smsService');

// GET /api/farmers
router.get('/', auth, async (req, res) => {
  try {
    const { village_id, status, search, crop, page = 1, limit = 50 } = req.query;
    const vid = village_id || req.user.village_id;

    let query = db('farmers').where({ village_id: vid, is_deleted: false });
    if (status) query = query.where('pump_status', status);
    if (search) query = query.where(function() {
      this.whereILike('name', `%${search}%`)
          .orWhereILike('survey_number', `%${search}%`)
          .orWhereILike('mobile', `%${search}%`);
    });
    if (crop) query = query.whereRaw('? = ANY(crops)', [crop]);

    const total = await query.clone().count('id as count').first();
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const data = await query.clone().orderBy('id', 'desc').limit(parseInt(limit)).offset(offset);

    res.json({ success: true, data, total: parseInt(total.count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/farmers/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const farmer = await db('farmers').where({ id: req.params.id, is_deleted: false }).first();
    if (!farmer) return res.status(404).json({ success: false, message: 'Farmer not found' });
    const docs = await db('farmer_documents').where({ farmer_id: req.params.id });
    const apps = await db('applications').where({ farmer_id: req.params.id }).orderBy('created_at', 'desc');
    res.json({ success: true, data: { ...farmer, documents: docs, applications: apps } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/farmers
router.post('/', auth, requireRole('sarpanch', 'admin'), uploadFarmer.fields([
  { name: 'pahani', maxCount: 1 }, { name: 'passbook', maxCount: 1 },
]), async (req, res) => {
  try {
    const village_id = req.user.village_id;
    const count = await db('farmers').where({ village_id }).count('id as c').first();
    const seq = String(parseInt(count.c) + 1).padStart(4, '0');
    const village = await db('villages').where({ id: village_id }).first();
    const farmer_id = `FM-${village.village_code || 'VLG'}-${seq}`;

    const crops = req.body.crops ? (Array.isArray(req.body.crops) ? req.body.crops : [req.body.crops]) : [];

    const [farmer] = await db('farmers').insert({
      farmer_id,
      village_id,
      ...req.body,
      crops,
      pump_status: 'no_pump',
    }).returning('*');

    if (req.files) {
      for (const [type, files] of Object.entries(req.files)) {
        for (const f of files) {
          await db('farmer_documents').insert({
            farmer_id: farmer.id,
            doc_type: type,
            file_url: `/uploads/farmers/${f.filename}`,
            file_name: f.originalname,
          });
        }
      }
    }

    if (req.body.mobile) {
      await sendSMS(req.body.mobile, 'household_added', { village_name: village.name });
    }

    res.status(201).json({ success: true, data: farmer, message: 'Farmer added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// PUT /api/farmers/:id
router.put('/:id', auth, requireRole('sarpanch', 'admin'), uploadFarmer.fields([
  { name: 'pahani', maxCount: 1 }, { name: 'passbook', maxCount: 1 },
]), async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.farmer_id;
    if (updates.crops && !Array.isArray(updates.crops)) updates.crops = [updates.crops];
    const [updated] = await db('farmers').where({ id: req.params.id }).update(updates).returning('*');
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/farmers/:id
router.delete('/:id', auth, requireRole('sarpanch', 'admin'), async (req, res) => {
  try {
    await db('farmers').where({ id: req.params.id }).update({ is_deleted: true });
    res.json({ success: true, message: 'Farmer deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/farmers/:id/apply-pump
router.post('/:id/apply-pump', auth, requireRole('sarpanch', 'admin'), async (req, res) => {
  try {
    const farmer = await db('farmers').where({ id: req.params.id }).first();
    if (!farmer) return res.status(404).json({ success: false, message: 'Farmer not found' });

    const count = await db('applications').where({ type: 'pump' }).count('id as c').first();
    const app_id = `APP-PM-${String(parseInt(count.c) + 1).padStart(5, '0')}`;

    const [app] = await db('applications').insert({
      application_id: app_id,
      type: 'pump',
      farmer_id: farmer.id,
      village_id: farmer.village_id,
      status: 'submitted',
      submitted_date: new Date(),
      requested_hp: req.body.hp || 5,
      subsidy_central_pct: 30,
      subsidy_state_pct: 30,
      total_cost: req.body.total_cost || 350000,
      beneficiary_contribution: req.body.contribution || 140000,
    }).returning('*');

    await db('farmers').where({ id: farmer.id }).update({ pump_status: 'applied' });
    if (farmer.mobile) await sendSMS(farmer.mobile, 'pump_applied', { app_id });

    res.json({ success: true, data: app, message: 'Pump application submitted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/farmers/:id/mark-installed
router.post('/:id/mark-installed', auth, requireRole('sarpanch', 'admin'), async (req, res) => {
  try {
    const { installation_date, installed_hp, vendor_name } = req.body;
    const farmer = await db('farmers').where({ id: req.params.id }).first();
    await db('farmers').where({ id: req.params.id }).update({ pump_status: 'installed', installation_date, installed_hp, vendor_name });
    await db('applications').where({ farmer_id: req.params.id, type: 'pump' }).whereNot('status', 'installed').update({ status: 'installed', installation_date });
    if (farmer.mobile) await sendSMS(farmer.mobile, 'pump_installed', { hp: installed_hp });
    res.json({ success: true, message: 'Pump marked as installed' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/farmers/stats/village
router.get('/stats/village', auth, async (req, res) => {
  try {
    const village_id = req.query.village_id || req.user.village_id;
    const stats = await db('farmers')
      .where({ village_id, is_deleted: false })
      .select(db.raw(`
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE pump_status = 'applied') as applied,
        COUNT(*) FILTER (WHERE pump_status = 'installed') as installed,
        COUNT(*) FILTER (WHERE pump_status IN ('no_pump','diesel','electric')) as not_applied
      `))
      .first();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
