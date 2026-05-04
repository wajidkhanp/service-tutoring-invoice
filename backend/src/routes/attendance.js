const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { appendEvent } = require('../services/auditService');
const { readJson } = require('../services/storageService');
const {
  getMonthAttendance,
  getStudentAttendance,
  setDayAttendance,
  confirmDay,
  clearStudentDay,
} = require('../services/attendanceService');

const router = express.Router();
router.use(requireAuth);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

router.get('/', (req, res) => {
  const { year, month } = req.query;
  if (!year || !month || isNaN(year) || isNaN(month)) {
    return res.status(400).json({ error: 'year and month query params are required' });
  }
  const result = getMonthAttendance(Number(year), Number(month));
  res.json({ year: Number(year), month: Number(month), ...result });
});

router.get('/student/:studentId', (req, res) => {
  const { studentId } = req.params;
  const { year } = req.query;
  const students = readJson('students.json');
  const student = students.find((s) => s.id === studentId);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  const result = getStudentAttendance(studentId, year ? Number(year) : null);
  res.json({ studentId, studentName: student.name, year: year ? Number(year) : null, ...result });
});

router.post('/', (req, res) => {
  const { date, records } = req.body;
  if (!date || !DATE_RE.test(date)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD format' });
  }
  if (!records || typeof records !== 'object' || Array.isArray(records)) {
    return res.status(400).json({ error: 'records must be an object { studentId: "A"|"T" }' });
  }
  for (const status of Object.values(records)) {
    if (status !== 'A' && status !== 'T') {
      return res.status(400).json({ error: 'Status values must be "A" or "T"' });
    }
  }
  const dayAttendance = setDayAttendance(date, records);
  appendEvent('attendance:save', `${req.user.email} saved attendance for ${date}`, req.user.email);
  res.json({ date, attendance: dayAttendance });
});

router.post('/:date/confirm', (req, res) => {
  const { date } = req.params;
  if (!DATE_RE.test(date)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD format' });
  }
  const dayAttendance = confirmDay(date);
  appendEvent('attendance:confirm', `${req.user.email} confirmed all-present for ${date}`, req.user.email);
  res.json({ date, success: true, attendance: dayAttendance });
});

router.delete('/:date/:studentId', (req, res) => {
  const { date, studentId } = req.params;
  if (!DATE_RE.test(date)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD format' });
  }
  clearStudentDay(date, studentId);
  res.json({ success: true });
});

module.exports = router;
