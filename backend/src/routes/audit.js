const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { getRecent, getAll } = require('../services/auditService');

const router = express.Router();
router.use(requireAuth);

router.get('/recent', (req, res) => {
  const events = getRecent(5);
  res.json({ events });
});

router.get('/all', (req, res) => {
  const events = getAll();
  res.json({ events });
});

module.exports = router;
