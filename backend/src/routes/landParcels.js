// backend/src/routes/landParcels.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');
const { uploadLand } = require('../middleware/upload');

router.get('/', auth, async (req, res) => {
  try {
    const village_id = req.query.village_id || req.user.village_id;
    const data = await db('land_parcels').where({ village_id }).orderBy('id', 'desc');
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const land = await db('land_parcels').where({ id: req.params.id }).first();
    const docs = await db('land_parcel_docs').where({ land_parcel_id: req.params.id });
    res.json({ success: true, data: { ...land, documents: docs } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', auth, requireRole('sarpanch', 'admin'), uploadLand.single('document'), async (req, res) => {
  try {
    const village_id = req.user.village_id;
    const [land] = await db('land_parcels').insert({
      village_id,
      ...req.body,
      geojson_polygon: req.body.geojson_polygon || null,
      status: 'identified',
    }).returning('*');
    if (req.file) {
      await db('land_parcel_docs').insert({
        land_parcel_id: land.id,
        doc_type: 'initial',
        file_url: `/uploads/land/${req.file.filename}`,
        file_name: req.file.originalname,
      });
    }
    res.status(201).json({ success: true, data: land });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id', auth, requireRole('sarpanch', 'admin'), uploadLand.single('document'), async (req, res) => {
  try {
    const [updated] = await db('land_parcels').where({ id: req.params.id }).update({ ...req.body, status_date: new Date() }).returning('*');
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/:id', auth, requireRole('sarpanch', 'admin'), async (req, res) => {
  try {
    await db('land_parcels').where({ id: req.params.id }).delete();
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
