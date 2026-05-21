// backend/src/routes/dashboard.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

// GET /api/dashboard/sarpanch
router.get('/sarpanch', auth, async (req, res) => {
  try {
    const village_id = req.query.village_id || req.user.village_id;
    const village = await db('villages').where({ id: village_id }).first();

    // Household stats
    const hhStats = await db('households').where({ village_id, is_deleted: false })
      .select(db.raw(`COUNT(*) as total, COUNT(*) FILTER (WHERE solar_status='applied') as applied, COUNT(*) FILTER (WHERE solar_status='installed') as installed`))
      .first();

    // Farmer stats
    const fmStats = await db('farmers').where({ village_id, is_deleted: false })
      .select(db.raw(`COUNT(*) as total, COUNT(*) FILTER (WHERE pump_status='applied') as applied, COUNT(*) FILTER (WHERE pump_status='installed') as installed`))
      .first();

    // Application stats
    const appStats = await db('applications').where({ village_id })
      .select(db.raw(`COUNT(*) FILTER (WHERE status='submitted') as pending, COUNT(*) FILTER (WHERE status='approved') as approved`))
      .first();

    // Complaint stats
    const complaintStats = await db('complaints').where({ village_id })
      .select(db.raw(`COUNT(*) FILTER (WHERE status='open') as open_count, COUNT(*) FILTER (WHERE status='in_progress') as in_progress`))
      .first();

    // Land parcel
    const landStats = await db('land_parcels').where({ village_id })
      .select(db.raw(`COUNT(*) as total, COUNT(*) FILTER (WHERE status='installed') as installed`))
      .first();

    // Village score calculation
    const hhTarget = village.total_household_target || 1;
    const fmTarget = village.total_farmer_target || 1;
    const hhPct = Math.min(100, (parseInt(hhStats.installed) / hhTarget) * 100);
    const fmPct = Math.min(100, (parseInt(fmStats.installed) / fmTarget) * 100);
    const landPct = parseInt(landStats.installed) > 0 ? 100 : 0;
    const villageScore = Math.round((hhPct * 0.5) + (fmPct * 0.3) + (landPct * 0.2));

    // CO2 saved: avg 1.2 tons/kW/year, avg 2kW per household
    const co2Saved = (parseInt(hhStats.installed) * 2 * 1.2).toFixed(1);
    const treesEquiv = Math.round(co2Saved * 16.5);

    res.json({
      success: true,
      data: {
        village,
        households: {
          total: parseInt(hhStats.total),
          applied: parseInt(hhStats.applied),
          installed: parseInt(hhStats.installed),
          target: village.total_household_target,
          percentage: hhTarget > 0 ? Math.round((parseInt(hhStats.installed) / hhTarget) * 100) : 0,
        },
        farmers: {
          total: parseInt(fmStats.total),
          applied: parseInt(fmStats.applied),
          installed: parseInt(fmStats.installed),
          target: village.total_farmer_target,
          percentage: fmTarget > 0 ? Math.round((parseInt(fmStats.installed) / fmTarget) * 100) : 0,
        },
        land_plant: {
          total: parseInt(landStats.total),
          installed: parseInt(landStats.installed),
          target_mw: village.land_plant_target_mw,
        },
        village_score: villageScore,
        pending_applications: parseInt(appStats.pending),
        approved_applications: parseInt(appStats.approved),
        open_complaints: parseInt(complaintStats.open_count),
        in_progress_complaints: parseInt(complaintStats.in_progress),
        co2_saved: parseFloat(co2Saved),
        trees_equivalent: treesEquiv,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/dashboard/mandal
router.get('/mandal', auth, async (req, res) => {
  try {
    const mandal_id = req.query.mandal_id || req.user.mandal_id;

    const villages = await db('villages')
      .where({ 'villages.mandal_id': mandal_id })
      .leftJoin('households', function() {
        this.on('villages.id', 'households.village_id').andOn(db.raw('households.is_deleted = false'));
      })
      .leftJoin('farmers', function() {
        this.on('villages.id', 'farmers.village_id').andOn(db.raw('farmers.is_deleted = false'));
      })
      .select(
        'villages.id', 'villages.name', 'villages.total_household_target', 'villages.total_farmer_target',
        db.raw(`COUNT(DISTINCT households.id) as total_hh`),
        db.raw(`COUNT(DISTINCT households.id) FILTER (WHERE households.solar_status = 'installed') as hh_installed`),
        db.raw(`COUNT(DISTINCT farmers.id) as total_farmers`),
        db.raw(`COUNT(DISTINCT farmers.id) FILTER (WHERE farmers.pump_status = 'installed') as pump_installed`)
      )
      .groupBy('villages.id', 'villages.name', 'villages.total_household_target', 'villages.total_farmer_target');

    res.json({ success: true, data: villages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/dashboard/district
router.get('/district', auth, async (req, res) => {
  try {
    const district_id = req.query.district_id || req.user.district_id;

    const mandals = await db('mandals').where({ 'mandals.district_id': district_id })
      .leftJoin('villages', 'mandals.id', 'villages.mandal_id')
      .leftJoin('households', function() {
        this.on('villages.id', 'households.village_id').andOn(db.raw('households.is_deleted = false'));
      })
      .leftJoin('farmers', function() {
        this.on('villages.id', 'farmers.village_id').andOn(db.raw('farmers.is_deleted = false'));
      })
      .select(
        'mandals.id', 'mandals.name',
        db.raw(`COUNT(DISTINCT villages.id) as village_count`),
        db.raw(`COUNT(DISTINCT households.id) as total_hh`),
        db.raw(`COUNT(DISTINCT households.id) FILTER (WHERE households.solar_status = 'installed') as hh_installed`),
        db.raw(`COUNT(DISTINCT farmers.id) as total_farmers`),
        db.raw(`COUNT(DISTINCT farmers.id) FILTER (WHERE farmers.pump_status = 'installed') as pump_installed`)
      )
      .groupBy('mandals.id', 'mandals.name');

    res.json({ success: true, data: mandals });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/dashboard/state
router.get('/state', auth, async (req, res) => {
  try {
    const districts = await db('districts').where({ 'districts.state_id': req.user.state_id || 1 })
      .leftJoin('mandals', 'districts.id', 'mandals.district_id')
      .leftJoin('villages', 'districts.id', 'villages.district_id')
      .leftJoin('households', function() {
        this.on('villages.id', 'households.village_id').andOn(db.raw('households.is_deleted = false'));
      })
      .leftJoin('farmers', function() {
        this.on('villages.id', 'farmers.village_id').andOn(db.raw('farmers.is_deleted = false'));
      })
      .select(
        'districts.id', 'districts.name',
        db.raw(`COUNT(DISTINCT mandals.id) as mandal_count`),
        db.raw(`COUNT(DISTINCT villages.id) as village_count`),
        db.raw(`COUNT(DISTINCT households.id) as total_hh`),
        db.raw(`COUNT(DISTINCT households.id) FILTER (WHERE households.solar_status = 'installed') as hh_installed`),
        db.raw(`COUNT(DISTINCT farmers.id) as total_farmers`),
        db.raw(`COUNT(DISTINCT farmers.id) FILTER (WHERE farmers.pump_status = 'installed') as pump_installed`)
      )
      .groupBy('districts.id', 'districts.name');

    // Return districts array directly so StateDashboard can use r.data as array
    res.json({ success: true, data: districts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/dashboard/monthly-trend?village_id=x  (last 12 months)
router.get('/monthly-trend', auth, async (req, res) => {
  try {
    const village_id = req.query.village_id || req.user.village_id;
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const label = d.toLocaleString('en-IN', { month: 'short' });

      const [hh] = await db('applications')
        .where({ village_id, type: 'rooftop' })
        .whereRaw(`EXTRACT(YEAR FROM installation_date) = ? AND EXTRACT(MONTH FROM installation_date) = ?`, [year, month])
        .count('id as c');
      const [fm] = await db('applications')
        .where({ village_id, type: 'pump' })
        .whereRaw(`EXTRACT(YEAR FROM installation_date) = ? AND EXTRACT(MONTH FROM installation_date) = ?`, [year, month])
        .count('id as c');

      months.push({ m: label, hh: parseInt(hh.c) || 0, fm: parseInt(fm.c) || 0 });
    }
    res.json({ success: true, data: months });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/dashboard/district-summary?district_id=x  (detailed mandal breakdown with app stats)
router.get('/district-summary', auth, async (req, res) => {
  try {
    const district_id = req.query.district_id || req.user.district_id;
    const mandals = await db('mandals').where({ district_id })
      .leftJoin('villages', 'mandals.id', 'villages.mandal_id')
      .leftJoin('households', function() {
        this.on('villages.id', 'households.village_id').andOn(db.raw('households.is_deleted = false'));
      })
      .leftJoin('farmers', function() {
        this.on('villages.id', 'farmers.village_id').andOn(db.raw('farmers.is_deleted = false'));
      })
      .leftJoin('applications', 'villages.id', 'applications.village_id')
      .select(
        'mandals.id', 'mandals.name',
        db.raw(`COUNT(DISTINCT villages.id) as village_count`),
        db.raw(`COUNT(DISTINCT households.id) as total_hh`),
        db.raw(`COUNT(DISTINCT households.id) FILTER (WHERE households.solar_status = 'installed') as hh_installed`),
        db.raw(`COUNT(DISTINCT farmers.id) as total_farmers`),
        db.raw(`COUNT(DISTINCT farmers.id) FILTER (WHERE farmers.pump_status = 'installed') as pump_installed`),
        db.raw(`COUNT(DISTINCT applications.id) FILTER (WHERE applications.status = 'submitted') as pending_apps`),
        db.raw(`COUNT(DISTINCT applications.id) FILTER (WHERE applications.status = 'installed') as completed_apps`)
      )
      .groupBy('mandals.id', 'mandals.name')
      .orderBy('hh_installed', 'desc');

    res.json({ success: true, data: mandals });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

