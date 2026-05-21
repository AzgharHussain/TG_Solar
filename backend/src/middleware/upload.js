// backend/src/middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const createStorage = (folder) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.env.UPLOAD_DIR || './uploads', folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const imageFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only images and PDFs allowed'), false);
};

const uploadHousehold = multer({ storage: createStorage('houses'), fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadFarmer = multer({ storage: createStorage('farmers'), fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadApp = multer({ storage: createStorage('applications'), fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadComplaint = multer({ storage: createStorage('complaints'), fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadLand = multer({ storage: createStorage('land'), fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });

module.exports = { uploadHousehold, uploadFarmer, uploadApp, uploadComplaint, uploadLand };
