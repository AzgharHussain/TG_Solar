// backend/src/routes/villages.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { mandal_id, district_id } = req.query;
    let q = db('villages');
    if (mandal_id) q = q.where({ mandal_id });
    if (district_id) q = q.where({ district_id });
    const data = await q.orderBy('name');
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/map-data/:village_id', auth, async (req, res) => {
  try {
    const { village_id } = req.params;
    const households = await db('households').where({ village_id, is_deleted: false })
      .select('id', 'household_id', 'head_name', 'ward_no', 'house_no', 'latitude', 'longitude', 'solar_status', 'roof_type', 'roof_area');
    const farmers = await db('farmers').where({ village_id, is_deleted: false })
      .select('id', 'farmer_id', 'name', 'survey_number', 'land_extent', 'latitude', 'longitude', 'pump_status');
    const land_parcels = await db('land_parcels').where({ village_id })
      .select('id', 'survey_number', 'extent_acres', 'geojson_polygon', 'status', 'plant_capacity_mw');
    const village = await db('villages').where({ id: village_id }).first();

    res.json({ success: true, data: { village, households, farmers, land_parcels } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const [updated] = await db('villages').where({ id: req.params.id }).update(req.body).returning('*');
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
