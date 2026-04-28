const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const requireAuth = require('../middleware/requireAuth');
const { readJson, writeJson } = require('../services/storageService');

const router = express.Router();
const CONFIG_FILE = 'config.json';
const SIGNATURE_PATH = path.join(__dirname, '../assets/signature.png');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
      cb(null, true);
    } else {
      cb(new Error('Only PNG or JPEG images are allowed.'));
    }
  },
});

router.use(requireAuth);

router.get('/', (_req, res) => {
  const config = readJson(CONFIG_FILE);
  const hasSignature = fs.existsSync(SIGNATURE_PATH);
  res.json({ config, hasSignature });
});

router.put('/', (req, res) => {
  const config = readJson(CONFIG_FILE);
  const { organizationName, address, phone, orgEmail, ein, representative } = req.body;
  const updated = {
    ...config,
    ...(organizationName !== undefined && { organizationName }),
    ...(address !== undefined && { address }),
    ...(phone !== undefined && { phone }),
    ...(orgEmail !== undefined && { orgEmail }),
    ...(ein !== undefined && { ein }),
    ...(representative !== undefined && { representative }),
  };
  writeJson(CONFIG_FILE, updated);
  res.json({ config: updated });
});

router.get('/signature', (_req, res) => {
  if (!fs.existsSync(SIGNATURE_PATH)) {
    return res.status(404).json({ error: 'No signature on file.' });
  }
  res.setHeader('Content-Type', 'image/png');
  res.sendFile(SIGNATURE_PATH);
});

router.post('/signature', upload.single('signature'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  fs.mkdirSync(path.dirname(SIGNATURE_PATH), { recursive: true });
  fs.writeFileSync(SIGNATURE_PATH, req.file.buffer);
  res.json({ message: 'Signature saved.' });
});

router.delete('/signature', (_req, res) => {
  if (fs.existsSync(SIGNATURE_PATH)) fs.unlinkSync(SIGNATURE_PATH);
  res.json({ message: 'Signature removed.' });
});

module.exports = router;
