const { readJson, writeJson } = require('./storageService');

const FILE = 'attendance.json';

function pad(n) { return String(n).padStart(2, '0'); }

function load() { return readJson(FILE); }
function save(data) { writeJson(FILE, data); }

function getMonthAttendance(year, month) {
  const data = load();
  const prefix = `${year}-${pad(month)}`;
  const attendance = {};
  for (const [date, records] of Object.entries(data)) {
    if (date.startsWith(prefix)) attendance[date] = records;
  }
  return { schoolDays: Object.keys(attendance).length, attendance };
}

function getStudentAttendance(studentId, year) {
  const data = load();
  const attendance = {};
  let present = 0, absent = 0, tardy = 0;

  const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));

  for (const [date, records] of entries) {
    if (year && !date.startsWith(String(year))) continue;
    const stored = records[studentId];
    if (stored === 'A') {
      attendance[date] = 'A';
      absent++;
    } else if (stored === 'T') {
      attendance[date] = 'T';
      tardy++;
    } else {
      attendance[date] = 'P';
      present++;
    }
  }

  return { attendance, summary: { present, absent, tardy, total: present + absent + tardy } };
}

function setDayAttendance(date, records) {
  const data = load();
  if (!data[date]) data[date] = {};
  for (const [studentId, status] of Object.entries(records)) {
    if (status === 'A' || status === 'T') {
      data[date][studentId] = status;
    } else {
      delete data[date][studentId];
    }
  }
  save(data);
  return data[date];
}

function confirmDay(date) {
  const data = load();
  if (!data[date]) {
    data[date] = {};
    save(data);
  }
  return data[date];
}

function clearStudentDay(date, studentId) {
  const data = load();
  if (data[date]) {
    delete data[date][studentId];
    save(data);
  }
  return true;
}

module.exports = { getMonthAttendance, getStudentAttendance, setDayAttendance, confirmDay, clearStudentDay };
