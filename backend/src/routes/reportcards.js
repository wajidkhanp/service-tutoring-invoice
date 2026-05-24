const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readJson, writeJson } = require('../services/storageService');
const requireAuth = require('../middleware/requireAuth');
const { appendEvent } = require('../services/auditService');
const { getStudentAttendance } = require('../services/attendanceService');
const { getMonthProgress } = require('../services/dailyProgressService');
const { buildReportCardPdf } = require('../services/reportCardPdfService');
const { Resend } = require('resend');

const router = express.Router();
const RC_FILE = 'reportcards.json';
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function load() { return readJson(RC_FILE); }
function save(data) { writeJson(RC_FILE, data); }

function getStudents() { return readJson('students.json'); }
function getConfig() { return readJson('config.json'); }

function pad(n) { return String(n).padStart(2, '0'); }

function getHolidaySetForMonth(month, year) {
  const all = readJson('holidays.json');
  const prefix = `${year}-${pad(MONTHS.indexOf(month) + 1)}`;
  return new Set(all.filter((d) => d.startsWith(prefix)));
}

function getMonthAttendanceForStudent(studentId, month, year) {
  const { attendance } = getStudentAttendance(studentId, year);
  const prefix = `${year}-${pad(MONTHS.indexOf(month) + 1)}`;
  const holidays = getHolidaySetForMonth(month, year);
  let present = 0, absent = 0, tardy = 0;
  for (const [date, status] of Object.entries(attendance)) {
    if (!date.startsWith(prefix)) continue;
    if (holidays.has(date)) continue;
    if (status === 'A') absent++;
    else if (status === 'T') tardy++;
    else present++;
  }
  const totalDays = present + absent + tardy;
  return { totalDays, present, absent, tardy };
}

function getPresentDaysForMonth(studentId, month, year) {
  const { attendance } = getStudentAttendance(studentId, year);
  const prefix = `${year}-${pad(MONTHS.indexOf(month) + 1)}`;
  const holidays = getHolidaySetForMonth(month, year);
  return Object.entries(attendance)
    .filter(([d, s]) => d.startsWith(prefix) && s !== 'A' && !holidays.has(d))
    .map(([d]) => d);
}

function buildProgressFromDailyData(studentId, month, year) {
  const empty = {
    newLesson: { targetLines: '', linesCompleted: '', daysWithoutLesson: '', targetMet: null, rating: '', notes: '' },
    sabqi:     { recitedDays: '', notRecitedDays: '', targetMet: null, rating: '', notes: '' },
    manzil:    { targetAjza: '', week1: '', week2: '', week3: '', week4: '', targetMet: null, rating: '', notes: '' },
    akhlaq:    { rating: '', notes: '' },
  };
  try {
    const monthNum = MONTHS.indexOf(month) + 1;
    const presentDays = getPresentDaysForMonth(studentId, month, year);
    const { summary } = getMonthProgress(String(year), monthNum, studentId, presentDays);

    // Map majority ratings to report card rating labels
    const ratingLabel = { good: 'Good', needs_improvement: 'Needs Improvement' };
    const akhlaqRating = ratingLabel[summary.akhlaq?.majority] || '';

    return {
      newLesson: {
        targetLines: '',
        linesCompleted: summary.newLesson.linesCompleted > 0 ? String(summary.newLesson.linesCompleted) : '',
        daysWithoutLesson: summary.newLesson.daysWithoutLesson > 0 ? String(summary.newLesson.daysWithoutLesson) : '',
        targetMet: null, rating: '', notes: '',
      },
      sabqi: {
        recitedDays:    summary.sabqi.recitedDays > 0    ? String(summary.sabqi.recitedDays)    : '',
        notRecitedDays: summary.sabqi.notRecitedDays > 0 ? String(summary.sabqi.notRecitedDays) : '',
        targetMet: null,
        rating: ratingLabel[summary.sabqi.ratingMajority] || '',
        notes: '',
      },
      manzil: {
        targetAjza: '',
        week1: summary.manzil.week1 || '',
        week2: summary.manzil.week2 || '',
        week3: summary.manzil.week3 || '',
        week4: summary.manzil.week4 || '',
        targetMet: null,
        rating: ratingLabel[summary.manzil.ratingMajority] || '',
        notes: '',
      },
      akhlaq: { rating: akhlaqRating, notes: '' },
    };
  } catch {
    return empty;
  }
}

function buildStarsAndAchievementsFromDailyData(studentId, month, year) {
  try {
    const monthNum = MONTHS.indexOf(month) + 1;
    const presentDays = getPresentDaysForMonth(studentId, month, year);
    const { summary } = getMonthProgress(String(year), monthNum, studentId, presentDays);
    return {
      stars: summary.stars || 0,
      achievements: summary.achievements && summary.achievements.length > 0
        ? summary.achievements.join(' · ')
        : '',
    };
  } catch {
    return { stars: 0, achievements: '' };
  }
}

router.use(requireAuth);

// GET /api/reportcards?month=&year=
router.get('/', (req, res) => {
  const { month, year } = req.query;
  let cards = load();
  if (month) cards = cards.filter((c) => c.month === month);
  if (year) cards = cards.filter((c) => String(c.year) === String(year));
  cards.sort((a, b) => {
    const yearDiff = Number(b.year) - Number(a.year);
    if (yearDiff !== 0) return yearDiff;
    return MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month) || a.studentName.localeCompare(b.studentName);
  });
  res.json({ reportCards: cards });
});

// GET /api/reportcards/months — unique month+year combos that have report cards
router.get('/months', (req, res) => {
  const cards = load();
  const seen = new Set();
  const combos = [];
  for (const c of cards) {
    const key = `${c.month}|${c.year}`;
    if (!seen.has(key)) { seen.add(key); combos.push({ month: c.month, year: String(c.year) }); }
  }
  combos.sort((a, b) => Number(b.year) - Number(a.year) || MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month));
  res.json({ combos });
});

// GET /api/reportcards/:id
router.get('/:id', (req, res) => {
  const card = load().find((c) => c.id === req.params.id);
  if (!card) return res.status(404).json({ error: 'Report card not found' });
  res.json({ reportCard: card });
});

// POST /api/reportcards — create single
router.post('/', (req, res) => {
  const { studentId, month, year } = req.body;
  if (!studentId || !month || !year) {
    return res.status(400).json({ error: 'studentId, month, and year are required' });
  }
  const students = getStudents();
  const student = students.find((s) => s.id === studentId);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const cards = load();
  const existing = cards.find((c) => c.studentId === studentId && c.month === month && String(c.year) === String(year));
  if (existing) return res.status(409).json({ error: 'Report card already exists for this student and month', reportCard: existing });

  const attendance = getMonthAttendanceForStudent(studentId, month, Number(year));
  const progress = buildProgressFromDailyData(studentId, month, Number(year));
  const { stars, achievements } = buildStarsAndAchievementsFromDailyData(studentId, month, Number(year));

  const card = {
    id: uuidv4(),
    studentId,
    studentName: student.name,
    month,
    year: String(year),
    teacherName: req.user.name || '',
    classLevel: student.grade || '',
    attendance,
    progress,
    stars,
    achievements,
    remarks: '',
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sentAt: null,
    sentTo: null,
  };

  cards.push(card);
  save(cards);
  appendEvent('reportcard:create', `${req.user.email} created report card for ${student.name} (${month} ${year})`, req.user.email);
  res.status(201).json({ reportCard: card });
});

// POST /api/reportcards/bulk — create drafts for all students without a card this month
router.post('/bulk', (req, res) => {
  const { month, year } = req.body;
  if (!month || !year) return res.status(400).json({ error: 'month and year are required' });

  const students = getStudents();
  const cards = load();
  let created = 0;
  let skipped = 0;

  for (const student of students) {
    const exists = cards.find((c) => c.studentId === student.id && c.month === month && String(c.year) === String(year));
    if (exists) { skipped++; continue; }

    const attendance = getMonthAttendanceForStudent(student.id, month, Number(year));
    const progress = buildProgressFromDailyData(student.id, month, Number(year));
    const { stars, achievements } = buildStarsAndAchievementsFromDailyData(student.id, month, Number(year));
    cards.push({
      id: uuidv4(),
      studentId: student.id,
      studentName: student.name,
      month,
      year: String(year),
      teacherName: req.user.name || '',
      classLevel: student.grade || '',
      attendance,
      progress,
      stars,
      achievements,
      remarks: '',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sentAt: null,
      sentTo: null,
    });
    created++;
  }

  save(cards);
  if (created > 0) {
    appendEvent('reportcard:bulk', `${req.user.email} bulk-created ${created} report cards for ${month} ${year}`, req.user.email);
  }
  res.json({ created, skipped, total: students.length });
});

// PUT /api/reportcards/:id
router.put('/:id', (req, res) => {
  const cards = load();
  const idx = cards.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Report card not found' });

  const { teacherName, classLevel, attendance, progress, stars, achievements, remarks, status } = req.body;
  const card = cards[idx];

  cards[idx] = {
    ...card,
    teacherName: teacherName !== undefined ? teacherName : card.teacherName,
    classLevel: classLevel !== undefined ? classLevel : card.classLevel,
    attendance: attendance !== undefined ? attendance : card.attendance,
    progress: progress !== undefined ? progress : card.progress,
    stars: stars !== undefined ? Math.max(0, Math.min(Number(stars), 20)) : card.stars,
    achievements: achievements !== undefined ? achievements : card.achievements,
    remarks: remarks !== undefined ? remarks : card.remarks,
    status: status !== undefined ? status : card.status,
    updatedAt: new Date().toISOString(),
  };

  save(cards);
  appendEvent('reportcard:update', `${req.user.email} updated report card for ${card.studentName} (${card.month} ${card.year})`, req.user.email);
  res.json({ reportCard: cards[idx] });
});

// DELETE /api/reportcards/:id
router.delete('/:id', (req, res) => {
  const cards = load();
  const idx = cards.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Report card not found' });
  const [removed] = cards.splice(idx, 1);
  save(cards);
  appendEvent('reportcard:delete', `${req.user.email} deleted report card for ${removed.studentName} (${removed.month} ${removed.year})`, req.user.email);
  res.json({ success: true });
});

// GET /api/reportcards/:id/pdf
router.get('/:id/pdf', async (req, res) => {
  const card = load().find((c) => c.id === req.params.id);
  if (!card) return res.status(404).json({ error: 'Report card not found' });
  try {
    const config = getConfig();
    const pdfBuffer = await buildReportCardPdf(card, config);
    const filename = `ReportCard_${card.studentName.replace(/\s+/g, '_')}_${card.month}_${card.year}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF error:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// POST /api/reportcards/:id/email
router.post('/:id/email', async (req, res) => {
  if (!process.env.RESEND_API_KEY) {
    return res.status(503).json({ error: 'Email not configured. Add RESEND_API_KEY to environment.' });
  }
  const card = load().find((c) => c.id === req.params.id);
  if (!card) return res.status(404).json({ error: 'Report card not found' });

  const students = getStudents();
  const student = students.find((s) => s.id === card.studentId);
  const recipientEmail = student?.parentEmail || student?.email;
  if (!recipientEmail) return res.status(400).json({ error: 'No email address on file for this student. Add a parent email in the student profile.' });

  try {
    const config = getConfig();
    const pdfBuffer = await buildReportCardPdf(card, config);
    const filename = `ReportCard_${card.studentName.replace(/\s+/g, '_')}_${card.month}_${card.year}.pdf`;
    const orgName = config.organizationName || 'Al Noor Hifz Academy';
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@example.com';
    const resend = new Resend(process.env.RESEND_API_KEY);

    const att = card.attendance || {};
    const rate = att.totalDays > 0 ? ((att.present / att.totalDays) * 100).toFixed(1) + '%' : 'N/A';

    await resend.emails.send({
      from: `${orgName} <${fromEmail}>`,
      to: recipientEmail,
      subject: `Monthly Report Card — ${card.studentName} — ${card.month} ${card.year}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;color:#111827">
          <p>Dear Parent/Guardian,</p>
          <p>Please find attached the <strong>${card.month} ${card.year}</strong> report card for <strong>${card.studentName}</strong>.</p>
          <table style="border-collapse:collapse;margin:16px 0;font-size:14px">
            <tr><td style="padding:4px 20px 4px 0;color:#6b7280">Student</td><td><strong>${card.studentName}</strong></td></tr>
            <tr><td style="padding:4px 20px 4px 0;color:#6b7280">Period</td><td>${card.month} ${card.year}</td></tr>
            <tr><td style="padding:4px 20px 4px 0;color:#6b7280">Attendance</td><td>${att.present || 0} / ${att.totalDays || 0} days (${rate})</td></tr>
            ${card.stars > 0 ? `<tr><td style="padding:4px 20px 4px 0;color:#6b7280">Stars Earned</td><td>${card.stars}</td></tr>` : ''}
          </table>
          ${card.remarks ? `<p style="font-size:14px;color:#374151"><em>"${card.remarks}"</em></p>` : ''}
          <p style="font-size:14px">Please review the attached PDF and sign the Parent Acknowledgement section.</p>
          <p style="font-size:14px">Thank you,<br/><strong>${card.teacherName || config.representative || 'The Teaching Staff'}</strong><br/>${orgName}</p>
        </div>
      `,
      attachments: [{ filename, content: pdfBuffer }],
    });

    // Mark as sent
    const cards = load();
    const idx = cards.findIndex((c) => c.id === card.id);
    if (idx !== -1) {
      cards[idx].status = 'sent';
      cards[idx].sentAt = new Date().toISOString();
      cards[idx].sentTo = recipientEmail;
      save(cards);
    }

    appendEvent('reportcard:email', `${req.user.email} emailed report card for ${card.studentName} to ${recipientEmail}`, req.user.email);
    res.json({ success: true, sentTo: recipientEmail });
  } catch (err) {
    console.error('Email error:', err);
    res.status(500).json({ error: err.message || 'Failed to send email' });
  }
});

module.exports = router;
