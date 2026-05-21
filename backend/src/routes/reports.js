// backend/src/routes/reports.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const QRCode = require('qrcode');

// GET /api/reports/household-register
router.get('/household-register', auth, async (req, res) => {
  try {
    const village_id = req.query.village_id || req.user.village_id;
    const data = await db('households').where({ village_id, is_deleted: false }).orderBy('ward_no').orderBy('house_no');
    if (req.query.format === 'excel') {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Household Register');
      ws.columns = [
        { header: 'Sl.No', key: 'sno', width: 8 },
        { header: 'Household ID', key: 'household_id', width: 18 },
        { header: 'Head Name', key: 'head_name', width: 22 },
        { header: 'Ward', key: 'ward_no', width: 8 },
        { header: 'House No', key: 'house_no', width: 12 },
        { header: 'Members', key: 'family_members', width: 10 },
        { header: 'Roof Area (sqft)', key: 'roof_area', width: 16 },
        { header: 'Recommended kW', key: 'recommended_capacity', width: 16 },
        { header: 'Solar Status', key: 'solar_status', width: 15 },
        { header: 'Installation Date', key: 'installation_date', width: 18 },
        { header: 'Mobile', key: 'mobile', width: 14 },
      ];
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B4332' } };
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      data.forEach((hh, idx) => {
        ws.addRow({ sno: idx + 1, ...hh, installation_date: hh.installation_date ? new Date(hh.installation_date).toLocaleDateString('en-IN') : '' });
      });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=household_register.xlsx');
      await wb.xlsx.write(res);
      return res.end();
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/reports/farmer-register
router.get('/farmer-register', auth, async (req, res) => {
  try {
    const village_id = req.query.village_id || req.user.village_id;
    const data = await db('farmers').where({ village_id, is_deleted: false }).orderBy('name');
    if (req.query.format === 'excel') {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Farmer Register');
      ws.columns = [
        { header: 'Sl.No', key: 'sno', width: 8 },
        { header: 'Farmer ID', key: 'farmer_id', width: 18 },
        { header: 'Name', key: 'name', width: 22 },
        { header: 'Survey No', key: 'survey_number', width: 14 },
        { header: 'Land (Acres)', key: 'land_extent', width: 14 },
        { header: 'Water Source', key: 'water_source', width: 14 },
        { header: 'Pump Status', key: 'pump_status', width: 14 },
        { header: 'Installed HP', key: 'installed_hp', width: 12 },
        { header: 'Mobile', key: 'mobile', width: 14 },
      ];
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B4332' } };
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      data.forEach((f, idx) => ws.addRow({ sno: idx + 1, ...f }));
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=farmer_register.xlsx');
      await wb.xlsx.write(res);
      return res.end();
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/reports/coverage
router.get('/coverage', auth, async (req, res) => {
  try {
    const village_id = req.query.village_id || req.user.village_id;
    const village = await db('villages').where({ id: village_id }).first();
    const hhStats = await db('households').where({ village_id, is_deleted: false })
      .select(db.raw(`COUNT(*) as total, COUNT(*) FILTER (WHERE solar_status='installed') as installed`)).first();
    const fmStats = await db('farmers').where({ village_id, is_deleted: false })
      .select(db.raw(`COUNT(*) as total, COUNT(*) FILTER (WHERE pump_status='installed') as installed`)).first();

    const hhPct = village.total_household_target > 0 ? (parseInt(hhStats.installed) / village.total_household_target * 100).toFixed(1) : 0;
    const fmPct = village.total_farmer_target > 0 ? (parseInt(fmStats.installed) / village.total_farmer_target * 100).toFixed(1) : 0;
    const score = Math.round(parseFloat(hhPct) * 0.5 + parseFloat(fmPct) * 0.3);

    res.json({
      success: true,
      data: {
        village,
        households: { ...hhStats, target: village.total_household_target, percentage: hhPct },
        farmers: { ...fmStats, target: village.total_farmer_target, percentage: fmPct },
        village_score: score,
        co2_saved: (parseInt(hhStats.installed) * 2 * 1.2).toFixed(1),
        trees_equivalent: Math.round(parseInt(hhStats.installed) * 2 * 1.2 * 16.5),
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/reports/qr/:type/:id
router.get('/qr/:type/:id', auth, async (req, res) => {
  try {
    const { type, id } = req.params;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const url = `${frontendUrl}/${type}/${id}`;
    const qrImage = await QRCode.toDataURL(url);
    res.json({ success: true, data: { qr: qrImage, url } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/reports/templates/households - Download Excel template
router.get('/templates/households', auth, async (req, res) => {
  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Households Template');
    ws.columns = [
      { header: 'Head Name*', key: 'head_name', width: 22 },
      { header: 'Mobile', key: 'mobile', width: 14 },
      { header: 'Ward No (1-15)*', key: 'ward_no', width: 14 },
      { header: 'House No*', key: 'house_no', width: 12 },
      { header: 'Family Members*', key: 'family_members', width: 14 },
      { header: 'Roof Type (flat/sloped/tiled/thatched)', key: 'roof_type', width: 30 },
      { header: 'Roof Length (ft)*', key: 'roof_length', width: 16 },
      { header: 'Roof Width (ft)*', key: 'roof_width', width: 16 },
      { header: 'BPL Card No', key: 'bpl_card_no', width: 16 },
      { header: 'Avg Monthly Bill (Rs)', key: 'avg_monthly_bill', width: 20 },
    ];
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D6A4F' } };
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    // Sample row
    ws.addRow({ head_name: 'Sample Name', mobile: '9876543210', ward_no: '1', house_no: '1-23', family_members: 4, roof_type: 'flat', roof_length: 20, roof_width: 15, bpl_card_no: '', avg_monthly_bill: 300 });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=household_import_template.xlsx');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/reports/templates/farmers - Download Farmer Excel template
router.get('/templates/farmers', auth, async (req, res) => {
  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Farmers Template');
    ws.columns = [
      { header: 'Farmer Name*', key: 'name', width: 22 },
      { header: 'Mobile*', key: 'mobile', width: 14 },
      { header: 'Aadhaar', key: 'aadhaar', width: 14 },
      { header: 'Survey Number*', key: 'survey_number', width: 16 },
      { header: 'Land Extent (Acres)*', key: 'land_extent', width: 18 },
      { header: 'Pump Type (diesel/electric/none)', key: 'current_pump_type', width: 28 },
      { header: 'Pump HP (3/5/7.5/10)', key: 'current_pump_hp', width: 20 },
      { header: 'Water Source (borewell/open_well/canal/tank)', key: 'water_source', width: 35 },
      { header: 'Crops (comma separated)', key: 'crops', width: 25 },
    ];
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D6A4F' } };
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.addRow({ name: 'Sample Farmer', mobile: '9876543210', survey_number: '123/A', land_extent: 3.5, current_pump_type: 'diesel', current_pump_hp: 5, water_source: 'borewell', crops: 'Paddy,Cotton' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=farmer_import_template.xlsx');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
