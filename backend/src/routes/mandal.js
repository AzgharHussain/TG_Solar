// backend/src/routes/mandal.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

router.get('/villages', auth, async (req, res) => {
  try {
    const mandal_id = req.query.mandal_id || req.user.mandal_id;
    const data = await db('villages').where({ mandal_id });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/applications/pending', auth, async (req, res) => {
  try {
    const mandal_id = req.query.mandal_id || req.user.mandal_id;
    const villageIds = await db('villages').where({ mandal_id }).pluck('id');
    const apps = await db('applications')
      .whereIn('applications.village_id', villageIds)
      .where('applications.status', 'submitted')
      .leftJoin('villages', 'applications.village_id', 'villages.id')
      .leftJoin('households', 'applications.household_id', 'households.id')
      .leftJoin('farmers', 'applications.farmer_id', 'farmers.id')
      .select('applications.*', 'villages.name as village_name',
              'households.head_name as household_name', 'farmers.name as farmer_name')
      .orderBy('applications.submitted_date', 'desc');
    res.json({ success: true, data: apps });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
