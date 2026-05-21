// backend/src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const app = express();

// Ensure uploads directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
['houses', 'farmers', 'applications', 'complaints', 'land'].forEach(dir => {
  const p = path.join(uploadDir, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(path.resolve(uploadDir)));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/villages', require('./routes/villages'));
app.use('/api/households', require('./routes/households'));
app.use('/api/farmers', require('./routes/farmers'));
app.use('/api/land-parcels', require('./routes/landParcels'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/shg', require('./routes/shg'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/sms', require('./routes/sms'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/mandal', require('./routes/mandal'));
app.use('/api/district', require('./routes/district'));
app.use('/api/state', require('./routes/state'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/assets', require('./routes/assets'));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Surya Shakti TS', version: '1.0.0', state: 'Telangana', time: new Date() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`☀️  Surya Shakti TS — API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV}`);
  console.log(`   Frontend: ${process.env.FRONTEND_URL}`);
});

module.exports = app;
