// backend/src/routes/applications.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');
const { sendSMS } = require('../services/smsService');

// GET /api/applications
router.get('/', auth, async (req, res) => {
  try {
    const { type, status, page = 1, limit = 50 } = req.query;

    // ── Resolve village scope based on role ──────────────────────────
    let villageIds = [];

    if (req.query.village_id) {
      // Explicit override (sarpanch passes own village_id)
      villageIds = [req.query.village_id];
    } else if (req.user.village_id) {
      villageIds = [req.user.village_id];
    } else if (req.user.role === 'mandal' && req.user.mandal_id) {
      villageIds = await db('villages').where({ mandal_id: req.user.mandal_id }).pluck('id');
    } else if (req.user.role === 'district' && req.user.district_id) {
      villageIds = await db('villages').where({ district_id: req.user.district_id }).pluck('id');
    } else if (['state', 'admin'].includes(req.user.role)) {
      const stateId = req.user.state_id || 1;
      villageIds = await db('villages').where({ state_id: stateId }).pluck('id');
    }

    if (!villageIds.length) {
      return res.json({ success: true, data: [], total: 0 });
    }

    let query = db('applications').whereIn('applications.village_id', villageIds);
    if (type)   query = query.where('applications.type', type);
    if (status) query = query.where('applications.status', status);

    const total  = await query.clone().count('applications.id as count').first();
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const apps = await query.clone()
      .leftJoin('households', 'applications.household_id', 'households.id')
      .leftJoin('farmers',    'applications.farmer_id',    'farmers.id')
      .leftJoin('villages',   'applications.village_id',   'villages.id')
      .select(
        'applications.*',
        'households.head_name as household_name',
        'households.ward_no',
        'households.house_no',
        'farmers.name as farmer_name',
        'farmers.survey_number',
        'villages.name as village_name'
      )
      .orderBy('applications.created_at', 'desc')
      .limit(parseInt(limit)).offset(offset);

    res.json({ success: true, data: apps, total: parseInt(total.count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// GET /api/applications/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const app = await db('applications')
      .where('applications.id', req.params.id)
      .leftJoin('households', 'applications.household_id', 'households.id')
      .leftJoin('farmers', 'applications.farmer_id', 'farmers.id')
      .select('applications.*', 'households.head_name', 'households.mobile as hh_mobile',
              'farmers.name as farmer_name', 'farmers.mobile as farmer_mobile')
      .first();
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
    const docs = await db('application_docs').where({ application_id: req.params.id });
    res.json({ success: true, data: { ...app, documents: docs } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/applications/:id/status
router.put('/:id/status', auth, requireRole('sarpanch', 'mandal', 'admin'), async (req, res) => {
  try {
    const { status, comments, rejection_reason, site_visit_date, site_visit_notes } = req.body;
    const app = await db('applications').where({ id: req.params.id }).first();
    if (!app) return res.status(404).json({ success: false, message: 'Not found' });

    const updates = { status };
    if (status === 'approved') {
      updates.approval_date = new Date();
      updates.approval_comments = comments;
    }
    if (status === 'rejected') updates.rejection_reason = rejection_reason;
    if (status === 'surveyed') {
      updates.site_visit_date = site_visit_date;
      updates.site_visit_notes = site_visit_notes;
    }

    await db('applications').where({ id: req.params.id }).update(updates);

    // Send SMS based on status
    let mobile = null;
    if (app.household_id) {
      const hh = await db('households').where({ id: app.household_id }).first();
      mobile = hh?.mobile;
    } else if (app.farmer_id) {
      const f = await db('farmers').where({ id: app.farmer_id }).first();
      mobile = f?.mobile;
    }

    const tplMap = {
      approved: app.type === 'rooftop' ? 'rooftop_approved' : 'pump_approved',
    };
    if (mobile && tplMap[status]) {
      await sendSMS(mobile, tplMap[status], { app_id: app.application_id });
    }

    res.json({ success: true, message: 'Application status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/applications/stats/overview
router.get('/stats/overview', auth, async (req, res) => {
  try {
    let villageIds = [];
    if (req.query.village_id) {
      villageIds = [req.query.village_id];
    } else if (req.user.village_id) {
      villageIds = [req.user.village_id];
    } else if (req.user.role === 'mandal' && req.user.mandal_id) {
      villageIds = await db('villages').where({ mandal_id: req.user.mandal_id }).pluck('id');
    } else if (req.user.role === 'district' && req.user.district_id) {
      villageIds = await db('villages').where({ district_id: req.user.district_id }).pluck('id');
    } else if (['state', 'admin'].includes(req.user.role)) {
      villageIds = await db('villages').where({ state_id: req.user.state_id || 1 }).pluck('id');
    }
    if (!villageIds.length) {
      return res.json({ success: true, data: { total: 0, rooftop_total: 0, pump_total: 0, pending: 0, approved: 0, installed: 0, rejected: 0 } });
    }
    const stats = await db('applications')
      .whereIn('village_id', villageIds)
      .select(db.raw(`
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE type = 'rooftop') as rooftop_total,
        COUNT(*) FILTER (WHERE type = 'pump') as pump_total,
        COUNT(*) FILTER (WHERE status = 'submitted') as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'installed') as installed,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected
      `))
      .first();
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
