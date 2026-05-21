// backend/src/routes/assets.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');

// ── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_ICONS = {
  rooftop:    '🏠',
  pump:       '💧',
  land_plant: '⚡',
  inverter:   '🔌',
  battery:    '🔋',
  meter:      '📟',
  other:      '📦',
};

async function generateAssetCode(village_id) {
  const village = await db('villages').where({ id: village_id }).first();
  const code = village?.village_code || 'VLG';
  const count = await db('assets').where({ village_id }).count('id as c').first();
  const seq = String(parseInt(count.c) + 1).padStart(4, '0');
  return `AST-${code}-${seq}`;
}

// ── GET /api/assets ──────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const {
      village_id,
      asset_type,
      status,
      search,
      page  = 1,
      limit = 50,
    } = req.query;

    const vid = village_id || req.user.village_id;

    let query = db('assets')
      .where({ village_id: vid, is_deleted: false });

    if (asset_type) query = query.where('asset_type', asset_type);
    if (status)     query = query.where('status', status);
    if (search) {
      query = query.where(function () {
        this.whereILike('name',      `%${search}%`)
            .orWhereILike('asset_code', `%${search}%`)
            .orWhereILike('make',    `%${search}%`)
            .orWhereILike('serial_no', `%${search}%`);
      });
    }

    const total  = await query.clone().count('id as count').first();
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const data   = await query
      .clone()
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit))
      .offset(offset);

    // Attach last inspection date for each asset
    const assetIds = data.map((a) => a.id);
    let inspMap = {};
    if (assetIds.length) {
      const lastInsp = await db('asset_inspections')
        .whereIn('asset_id', assetIds)
        .orderBy('inspection_date', 'desc')
        .select('asset_id', 'inspection_date', 'condition');
      inspMap = lastInsp.reduce((acc, r) => {
        if (!acc[r.asset_id]) acc[r.asset_id] = r;
        return acc;
      }, {});
    }

    const enriched = data.map((a) => ({
      ...a,
      last_inspection: inspMap[a.id] || null,
    }));

    res.json({
      success: true,
      data: enriched,
      total: parseInt(total.count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/assets/stats ────────────────────────────────────────────────────
router.get('/stats', auth, async (req, res) => {
  try {
    const vid = req.query.village_id || req.user.village_id;

    const [totals] = await db('assets')
      .where({ village_id: vid, is_deleted: false })
      .select(
        db.raw(`COUNT(*) as total`),
        db.raw(`COUNT(*) FILTER (WHERE status = 'active') as active`),
        db.raw(`COUNT(*) FILTER (WHERE status = 'under_repair') as under_repair`),
        db.raw(`COUNT(*) FILTER (WHERE status = 'inactive') as inactive`),
        db.raw(`COUNT(*) FILTER (WHERE status = 'decommissioned') as decommissioned`),
        db.raw(`COUNT(*) FILTER (WHERE warranty_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as warranty_expiring`),
        db.raw(`COUNT(*) FILTER (WHERE amc_end < CURRENT_DATE AND amc_end IS NOT NULL) as amc_expired`),
      );

    const byType = await db('assets')
      .where({ village_id: vid, is_deleted: false })
      .groupBy('asset_type')
      .select('asset_type', db.raw('COUNT(*) as count'));

    res.json({ success: true, data: { totals, byType } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/assets/:id ──────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const asset = await db('assets').where({ id: req.params.id, is_deleted: false }).first();
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });

    const inspections = await db('asset_inspections')
      .where({ asset_id: asset.id })
      .orderBy('inspection_date', 'desc');

    // Linked record names
    let linked = {};
    if (asset.household_id) {
      const hh = await db('households').where({ id: asset.household_id }).select('head_name', 'household_id').first();
      linked.household = hh;
    }
    if (asset.farmer_id) {
      const fr = await db('farmers').where({ id: asset.farmer_id }).select('farmer_name', 'farmer_id').first();
      linked.farmer = fr;
    }
    if (asset.land_parcel_id) {
      const lp = await db('land_parcels').where({ id: asset.land_parcel_id }).select('parcel_name', 'parcel_id').first();
      linked.land_parcel = lp;
    }

    res.json({ success: true, data: { ...asset, inspections, linked } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/assets ─────────────────────────────────────────────────────────
router.post('/', auth, requireRole('sarpanch', 'admin'), async (req, res) => {
  try {
    const village_id = req.user.village_id;
    const asset_code = await generateAssetCode(village_id);

    const payload = {
      asset_code,
      village_id,
      asset_type:        req.body.asset_type        || 'other',
      name:              req.body.name,
      make:              req.body.make               || null,
      model:             req.body.model              || null,
      serial_no:         req.body.serial_no          || null,
      capacity_kw:       req.body.capacity_kw        || null,
      installation_date: req.body.installation_date  || null,
      warranty_expiry:   req.body.warranty_expiry    || null,
      amc_start:         req.body.amc_start          || null,
      amc_end:           req.body.amc_end            || null,
      vendor_name:       req.body.vendor_name        || null,
      status:            req.body.status             || 'active',
      household_id:      req.body.household_id       || null,
      farmer_id:         req.body.farmer_id          || null,
      land_parcel_id:    req.body.land_parcel_id     || null,
      location_lat:      req.body.location_lat       || null,
      location_lng:      req.body.location_lng       || null,
      notes:             req.body.notes              || null,
    };

    const [asset] = await db('assets').insert(payload).returning('*');
    res.status(201).json({ success: true, data: asset, message: 'Asset registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ── PUT /api/assets/:id ──────────────────────────────────────────────────────
router.put('/:id', auth, requireRole('sarpanch', 'admin'), async (req, res) => {
  try {
    const allowed = [
      'asset_type', 'name', 'make', 'model', 'serial_no',
      'capacity_kw', 'installation_date', 'warranty_expiry',
      'amc_start', 'amc_end', 'vendor_name', 'status',
      'household_id', 'farmer_id', 'land_parcel_id',
      'location_lat', 'location_lng', 'notes',
    ];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k] || null; });
    updates.updated_at = new Date();

    const [updated] = await db('assets')
      .where({ id: req.params.id })
      .update(updates)
      .returning('*');

    if (!updated) return res.status(404).json({ success: false, message: 'Asset not found' });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── DELETE /api/assets/:id ───────────────────────────────────────────────────
router.delete('/:id', auth, requireRole('sarpanch', 'admin'), async (req, res) => {
  try {
    await db('assets').where({ id: req.params.id }).update({
      is_deleted: true,
      deleted_at: new Date(),
    });
    res.json({ success: true, message: 'Asset removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/assets/:id/inspections ────────────────────────────────────────
router.post('/:id/inspections', auth, requireRole('sarpanch', 'admin'), async (req, res) => {
  try {
    const asset = await db('assets').where({ id: req.params.id, is_deleted: false }).first();
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });

    const [insp] = await db('asset_inspections').insert({
      asset_id:           asset.id,
      inspection_date:    req.body.inspection_date    || new Date(),
      inspector_name:     req.body.inspector_name,
      condition:          req.body.condition          || 'good',
      findings:           req.body.findings           || null,
      action_taken:       req.body.action_taken       || null,
      next_inspection_due: req.body.next_inspection_due || null,
    }).returning('*');

    res.status(201).json({ success: true, data: insp, message: 'Inspection logged' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
