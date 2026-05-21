// backend/src/services/smsService.js
const db = require('../config/db');

/**
 * Send SMS to a mobile number using a template key
 * @param {string} mobile - recipient mobile number
 * @param {string} templateKey - SMS template key
 * @param {Object} variables - variables to replace in template
 */
async function sendSMS(mobile, templateKey, variables = {}) {
  try {
    const template = await db('sms_templates').where({ template_key: templateKey, is_active: true }).first();
    if (!template) {
      console.warn(`[SMS] Template not found: ${templateKey}`);
      return false;
    }

    let message = template.message_en;
    // Replace variables like {app_id}, {village_name}, etc.
    for (const [key, val] of Object.entries(variables)) {
      message = message.replace(new RegExp(`{${key}}`, 'g'), val);
    }

    const logEntry = {
      recipient_mobile: mobile,
      message,
      template_key: templateKey,
      status: 'pending',
    };

    const [log] = await db('sms_logs').insert(logEntry).returning('id');

    const provider = process.env.SMS_PROVIDER || 'console';

    if (provider === 'console') {
      console.log(`[SMS] To: ${mobile} | Message: ${message}`);
      await db('sms_logs').where({ id: log.id || log }).update({ status: 'sent' });
      return true;
    }

    if (provider === 'msg91') {
      // MSG91 integration
      const axios = require('axios');
      const response = await axios.post('https://api.msg91.com/api/v5/flow/', {
        flow_id: process.env.MSG91_FLOW_ID,
        sender: process.env.MSG91_SENDER_ID || 'GRMSRY',
        mobiles: `91${mobile}`,
        VAR1: message,
      }, {
        headers: { authkey: process.env.MSG91_AUTH_KEY, 'Content-Type': 'application/json' },
      });
      await db('sms_logs').where({ id: log.id || log }).update({ status: 'sent', provider_message_id: response.data?.request_id });
      return true;
    }

    return false;
  } catch (err) {
    console.error(`[SMS] Error sending SMS to ${mobile}:`, err.message);
    return false;
  }
}

async function sendBulkSMS(mobiles, templateKey, variables = {}) {
  const results = await Promise.allSettled(
    mobiles.map(m => sendSMS(m, templateKey, variables))
  );
  return results;
}

module.exports = { sendSMS, sendBulkSMS };
