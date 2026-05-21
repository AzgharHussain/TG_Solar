// backend/src/routes/sms.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');
const { sendSMS } = require('../services/smsService');

router.get('/logs', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    let q = db('sms_logs');
    if (status) q = q.where('status', status);
    const total = await q.clone().count('id as count').first();
    const data = await q.clone().orderBy('created_at', 'desc')
      .limit(parseInt(limit)).offset((parseInt(page) - 1) * parseInt(limit));
    res.json({ success: true, data, total: parseInt(total.count) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/templates', auth, async (req, res) => {
  try {
    const data = await db('sms_templates').orderBy('template_key');
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/templates/:id', auth, async (req, res) => {
  try {
    const [updated] = await db('sms_templates').where({ id: req.params.id }).update(req.body).returning('*');
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/send', auth, async (req, res) => {
  try {
    const { mobile, message, template_key, recipients } = req.body;
    if (recipients && Array.isArray(recipients)) {
      const results = await Promise.allSettled(
        recipients.map(m => sendSMS(m, template_key || 'custom', {}))
      );
      res.json({ success: true, message: `Sent to ${results.length} recipients` });
    } else {
      await db('sms_logs').insert({ recipient_mobile: mobile, message, status: 'sent', template_key: 'custom' });
      console.log(`[Manual SMS] To: ${mobile} | ${message}`);
      res.json({ success: true, message: 'SMS sent' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
