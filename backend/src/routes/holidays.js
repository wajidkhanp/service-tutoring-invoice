const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { readJson, writeJson } = require('../services/storageService');
const { appendEvent } = require('../services/auditService');

const router = express.Router();
const FILE = 'holidays.json';

function load() { return readJson(FILE); }
function save(data) { writeJson(FILE, data); }

function pad(n) { return String(n).padStart(2, '0'); }

// GET /api/holidays?year=2026&month=5
router.get('/', requireAuth, (req, res) => {
  const { year, month } = req.query;
  const holidays = load();
  if (!year || !month) return res.json({ holidays });
  const prefix = `${year}-${pad(Number(month))}`;
  res.json({ holidays: holidays.filter((d) => d.startsWith(prefix)) });
});

// POST /api/holidays — toggle a date as holiday
router.post('/', requireAuth, (req, res) => {
  const { date } = req.body;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  }
  const holidays = load();
  const idx = holidays.indexOf(date);
  let isHoliday;
  if (idx === -1) {
    holidays.push(date);
    holidays.sort();
    isHoliday = true;
    appendEvent('holiday:add', `${req.user.email} marked ${date} as holiday`, req.user.email);
  } else {
    holidays.splice(idx, 1);
    isHoliday = false;
    appendEvent('holiday:remove', `${req.user.email} removed holiday on ${date}`, req.user.email);
  }
  save(holidays);
  res.json({ isHoliday, date });
});

module.exports = router;
