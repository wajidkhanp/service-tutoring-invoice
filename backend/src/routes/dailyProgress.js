const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const {
  getDayProgress, getStudentDayProgress, setStudentDayProgress,
  clearStudentDayProgress, getMonthProgress, getStudentYearProgress,
} = require('../services/dailyProgressService');
const { getStudentAttendance } = require('../services/attendanceService');

const router = express.Router();
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

router.use(requireAuth);

// GET /api/daily-progress?date=YYYY-MM-DD&studentId=  (studentId optional — omit = all students)
router.get('/', (req, res) => {
  const { date, studentId } = req.query;
  if (!date) return res.status(400).json({ error: 'date is required' });
  if (studentId) {
    const progress = getStudentDayProgress(date, studentId);
    return res.json({ date, studentId, progress });
  }
  const progress = getDayProgress(date);
  res.json({ date, progress });
});

// POST /api/daily-progress  body: { date, studentId, progress: { newLesson?, sabqi?, manzil? } }
router.post('/', (req, res) => {
  const { date, studentId, progress } = req.body;
  if (!date || !studentId) return res.status(400).json({ error: 'date and studentId are required' });
  const saved = setStudentDayProgress(date, studentId, progress || {});
  res.json({ date, studentId, progress: saved });
});

// DELETE /api/daily-progress/:date/:studentId
router.delete('/:date/:studentId', (req, res) => {
  clearStudentDayProgress(req.params.date, req.params.studentId);
  res.json({ success: true });
});

// GET /api/daily-progress/summary?year=&month=&studentId=
router.get('/summary', (req, res) => {
  const { year, month, studentId } = req.query;
  if (!year || !month || !studentId) return res.status(400).json({ error: 'year, month, and studentId are required' });

  // Get the student's present days for this month to compute daysWithoutLesson
  const monthNum = MONTHS.indexOf(month) + 1;
  let attendanceDays = [];
  try {
    const { attendance } = getStudentAttendance(studentId, year);
    const prefix = `${year}-${String(monthNum).padStart(2, '0')}`;
    attendanceDays = Object.entries(attendance)
      .filter(([d, s]) => d.startsWith(prefix) && s !== 'A')
      .map(([d]) => d);
  } catch {}

  const result = getMonthProgress(year, monthNum, studentId, attendanceDays);
  res.json(result);
});

// GET /api/daily-progress/year?year=&studentId=
router.get('/year', (req, res) => {
  const { year, studentId } = req.query;
  if (!year || !studentId) return res.status(400).json({ error: 'year and studentId are required' });
  const data = getStudentYearProgress(studentId, year);
  res.json({ year, studentId, data });
});

module.exports = router;
