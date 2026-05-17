const { readJson, writeJson } = require('./storageService');
const FILE = 'daily_progress.json';

function load() { return readJson(FILE); }
function save(data) { writeJson(FILE, data); }

// Get all students' progress for one date
function getDayProgress(date) {
  const data = load();
  return data[date] || {};
}

// Get one student's progress for a date
function getStudentDayProgress(date, studentId) {
  return getDayProgress(date)[studentId] || null;
}

// Save one student's progress for a date (merge, don't overwrite other students)
function setStudentDayProgress(date, studentId, progressData) {
  const data = load();
  if (!data[date]) data[date] = {};
  data[date][studentId] = progressData;
  save(data);
  return data[date][studentId];
}

// Clear one student's progress for a date
function clearStudentDayProgress(date, studentId) {
  const data = load();
  if (data[date]) {
    delete data[date][studentId];
  }
  save(data);
}

// Aggregate a student's progress for a full month
// Returns: { days: [ { date, progress } ], summary: { newLesson, sabqi, manzil } }
// `attendanceDays` is an array of date strings the student was present
function getMonthProgress(year, month, studentId, attendanceDays = []) {
  const data = load();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const days = [];

  for (const [date, students] of Object.entries(data)) {
    if (!date.startsWith(prefix)) continue;
    if (students[studentId]) {
      days.push({ date, progress: students[studentId] });
    }
  }
  days.sort((a, b) => a.date.localeCompare(b.date));

  // Aggregate summary
  let nlLines = 0;
  let nlDays = 0;
  const nlSurahs = [];
  let sabqiDays = 0;
  let sabqiMissed = 0;
  const manzilDays = [];
  let totalStars = 0;
  const achievements = [];
  let akhlaqGood = 0;
  let akhlaqNeedsImprovement = 0;

  for (const { date, progress } of days) {
    const isPresent = attendanceDays.length === 0 || attendanceDays.includes(date);

    if (progress.newLesson?.surahNumber) {
      // only count actual surah lessons — not special statuses (missed, did_not_pass, juzz_completed)
      nlLines += Number(progress.newLesson.lines) || 0;
      nlDays++;
      if (!nlSurahs.includes(progress.newLesson.surahNumber)) {
        nlSurahs.push(progress.newLesson.surahNumber);
      }
    }

    if (progress.sabqi === true) sabqiDays++;
    else if (progress.sabqi === false && isPresent) sabqiMissed++;

    if (progress.manzil?.recited) {
      manzilDays.push({ date, juzzNumber: progress.manzil.juzzNumber, surahNumber: progress.manzil.surahNumber, surahName: progress.manzil.surahName });
    }

    if (progress.stars) totalStars += Number(progress.stars) || 0;
    if (progress.achievement && typeof progress.achievement === 'string' && progress.achievement.trim()) {
      achievements.push(progress.achievement.trim());
    }
    if (progress.akhlaq === 'good') akhlaqGood++;
    else if (progress.akhlaq === 'needs_improvement') akhlaqNeedsImprovement++;
  }

  // Days without new lesson = present days minus days with a lesson
  const daysWithoutLesson = Math.max(0, attendanceDays.length - nlDays);

  // Majority akhlaq: tie goes to 'good'
  let akhlaqMajority = null;
  if (akhlaqGood > 0 || akhlaqNeedsImprovement > 0) {
    akhlaqMajority = akhlaqNeedsImprovement > akhlaqGood ? 'needs_improvement' : 'good';
  }

  // Group manzil by week (week 1 = days 1-7, week 2 = 8-14, etc.)
  const manzilByWeek = { week1: [], week2: [], week3: [], week4: [] };
  for (const m of manzilDays) {
    const day = parseInt(m.date.split('-')[2], 10);
    const wk = day <= 7 ? 'week1' : day <= 14 ? 'week2' : day <= 21 ? 'week3' : 'week4';
    const label = m.juzzNumber ? `Juzz ${m.juzzNumber}` : (m.surahName || '');
    if (label && !manzilByWeek[wk].includes(label)) manzilByWeek[wk].push(label);
  }

  return {
    days,
    summary: {
      newLesson: {
        linesCompleted: nlLines,
        daysWithoutLesson,
        surahNumbers: nlSurahs,
      },
      sabqi: {
        recitedDays: sabqiDays,
        notRecitedDays: sabqiMissed,
      },
      manzil: {
        week1: manzilByWeek.week1.join(', '),
        week2: manzilByWeek.week2.join(', '),
        week3: manzilByWeek.week3.join(', '),
        week4: manzilByWeek.week4.join(', '),
        daysRecited: manzilDays.length,
      },
      stars: totalStars,
      achievements,
      akhlaq: { majority: akhlaqMajority, goodDays: akhlaqGood, needsImprovementDays: akhlaqNeedsImprovement },
    },
  };
}

// Get a student's progress across all months in a year (for graphs)
// Returns array of { year, month (1-12), linesMemorized, sabqiRate, manzilDays }
function getStudentYearProgress(studentId, year) {
  const data = load();
  const byMonth = {};

  for (const [date, students] of Object.entries(data)) {
    if (!date.startsWith(String(year))) continue;
    if (!students[studentId]) continue;
    const monthNum = parseInt(date.split('-')[1], 10);
    if (!byMonth[monthNum]) byMonth[monthNum] = { lines: 0, sabqiDays: 0, sabqiTotal: 0, manzilDays: 0 };
    const p = students[studentId];
    if (p.newLesson) byMonth[monthNum].lines += Number(p.newLesson.lines) || 0;
    if (p.sabqi === true) { byMonth[monthNum].sabqiDays++; byMonth[monthNum].sabqiTotal++; }
    else if (p.sabqi === false) byMonth[monthNum].sabqiTotal++;
    if (p.manzil?.recited) byMonth[monthNum].manzilDays++;
  }

  return Object.entries(byMonth).map(([m, v]) => ({
    month: parseInt(m, 10),
    year: parseInt(year, 10),
    linesMemorized: v.lines,
    sabqiRate: v.sabqiTotal > 0 ? Math.round((v.sabqiDays / v.sabqiTotal) * 100) : null,
    manzilDays: v.manzilDays,
  })).sort((a, b) => a.month - b.month);
}

module.exports = { getDayProgress, getStudentDayProgress, setStudentDayProgress, clearStudentDayProgress, getMonthProgress, getStudentYearProgress };
