import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  getStudents,
  getMonthAttendance,
  saveAttendance,
  confirmAllPresent,
  clearAttendanceEntry,
  getDailyProgress,
  saveDailyProgress,
} from '../services/api';
import ProgressLogPanel from '../components/ProgressLogPanel';
import { CalendarDays, XCircle, Clock } from 'lucide-react';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DOW_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function pad(n) { return String(n).padStart(2, '0'); }

function toDateStr(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function getValidMonths() {
  const now = new Date();
  const result = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return result;
}

function groupDaysByWeek(year, month) {
  const weeks = [];
  let currentWeek = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dow = date.getDay();
    if (dow === 0) continue;
    if (dow === 1 && currentWeek.length > 0) { weeks.push(currentWeek); currentWeek = []; }
    currentWeek.push({ day: d, dow, dateStr: toDateStr(year, month, d) });
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);
  return weeks.map((days, i) => ({ label: `Week ${i + 1}`, days }));
}

function getCellStatus(attendance, dateStr, studentId) {
  const dayData = attendance[dateStr];
  if (dayData === undefined) return null; // unrecorded day
  const stored = dayData[studentId];
  if (stored === 'A') return 'A';
  if (stored === 'T') return 'T';
  return 'P'; // recorded day, no stored exception = Present
}

function getLockReason(dateStr, student, todayEnd) {
  const cellDate = new Date(dateStr + 'T12:00:00');
  if (cellDate > todayEnd) return 'future';
  if (student.joinDate) {
    const join = new Date(student.joinDate + 'T00:00:00');
    if (cellDate < join) return 'pre-enrollment';
  }
  return null;
}

// ── Desktop: single cell ──────────────────────────────────────
function AttCell({ status, lockReason, isSaving, onClick }) {
  if (lockReason === 'future') {
    return <td className="att-cell att-cell-future" title="Future date">–</td>;
  }
  if (lockReason === 'pre-enrollment') {
    return <td className="att-cell att-cell-preenroll" title="Before enrollment">n/a</td>;
  }
  const cls = status === 'A' ? 'att-absent'
    : status === 'T' ? 'att-tardy'
    : status === 'P' ? 'att-present'
    : 'att-empty';

  return (
    <td
      className={`att-cell att-cell-edit ${cls}${isSaving ? ' att-saving' : ''}`}
      onClick={onClick}
      title={status === 'A' ? 'Absent — click to change' : status === 'T' ? 'Tardy — click to change' : status === 'P' ? 'Present — click to mark absent' : 'Unrecorded — click to mark absent'}
    >
      {status || '·'}
    </td>
  );
}

// ── Mobile: P/A/T toggle row ──────────────────────────────────
function MobileStudentRow({ student, dateStr, status, lockReason, onCycle, onLogProgress }) {
  if (lockReason === 'future' || lockReason === 'pre-enrollment') {
    return (
      <div className="mob-student-row mob-student-locked">
        <span className="mob-student-name">{student.name}</span>
        <span className="mob-locked-label">{lockReason === 'future' ? 'Future' : 'n/a'}</span>
      </div>
    );
  }
  return (
    <div className="mob-student-row">
      <span className="mob-student-name">{student.name}</span>
      <div className="mob-att-btns">
        {['P', 'A', 'T'].map((s) => (
          <button
            key={s}
            className={`mob-att-btn mob-att-${s.toLowerCase()}${status === s ? ' mob-att-active' : ''}`}
            onClick={() => onCycle(dateStr, student, s)}
            type="button"
          >
            {s}
          </button>
        ))}
        <button
          type="button"
          className="mob-att-btn mob-att-log"
          onClick={() => onLogProgress(student, dateStr)}
          title="Log progress"
        >
          📚
        </button>
      </div>
    </div>
  );
}

export default function Attendance() {
  const now = new Date();
  const validMonths = useMemo(() => getValidMonths(), []);
  const defaultMonth = validMonths[validMonths.length - 1];

  const [selectedYear, setSelectedYear] = useState(defaultMonth.year);
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth.month);
  const [genderFilter, setGenderFilter] = useState('all');

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingCells, setSavingCells] = useState(new Set());
  const [expandedDays, setExpandedDays] = useState(new Set());
  const [progressPanel, setProgressPanel] = useState(null); // { student, dateStr, initialProgress }

  const openProgressPanel = useCallback(async (student, dateStr) => {
    let initialProgress = null;
    try {
      const res = await getDailyProgress(dateStr, student.id);
      initialProgress = res.data.progress;
    } catch { /* start fresh */ }
    setProgressPanel({ student, dateStr, initialProgress });
  }, []);

  const handleSaveProgress = useCallback(async (data) => {
    if (!progressPanel) return;
    await saveDailyProgress(progressPanel.dateStr, progressPanel.student.id, data);
  }, [progressPanel]);

  const todayEnd = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  const todayStr = useMemo(() => {
    return toDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const weeks = useMemo(() => groupDaysByWeek(selectedYear, selectedMonth), [selectedYear, selectedMonth]);

  const filteredStudents = useMemo(() => {
    const sorted = [...students].sort((a, b) => {
      if (a.gender === b.gender) return a.name.localeCompare(b.name);
      if (a.gender === 'male') return -1;
      if (b.gender === 'male') return 1;
      return 0;
    });
    if (genderFilter === 'male') return sorted.filter((s) => s.gender === 'male');
    if (genderFilter === 'female') return sorted.filter((s) => s.gender === 'female');
    return sorted;
  }, [students, genderFilter]);

  const maleCount = useMemo(() => students.filter((s) => s.gender === 'male').length, [students]);
  const femaleCount = useMemo(() => students.filter((s) => s.gender === 'female').length, [students]);

  const summary = useMemo(() => {
    let recorded = 0, absences = 0, tardies = 0;
    const prefix = `${selectedYear}-${pad(selectedMonth)}`;
    for (const [date, records] of Object.entries(attendance)) {
      if (!date.startsWith(prefix)) continue;
      recorded++;
      for (const student of filteredStudents) {
        if (records[student.id] === 'A') absences++;
        else if (records[student.id] === 'T') tardies++;
      }
    }
    return { recorded, absences, tardies };
  }, [attendance, filteredStudents, selectedYear, selectedMonth]);

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([getStudents(), getMonthAttendance(selectedYear, selectedMonth)])
      .then(([studRes, attRes]) => {
        setStudents(studRes.data.students || []);
        setAttendance(attRes.data.attendance || {});
        // auto-expand today if in current month
        const todayDow = new Date(todayStr + 'T12:00:00').getDay();
        if (todayDow !== 0) setExpandedDays(new Set([todayStr]));
      })
      .catch(() => setError('Unable to load attendance data. Please try again.'))
      .finally(() => setLoading(false));
  }, [selectedYear, selectedMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMonthChange = (e) => {
    const [y, m] = e.target.value.split('-').map(Number);
    setSelectedYear(y);
    setSelectedMonth(m);
  };

  const cycleStatus = useCallback(async (dateStr, student, targetStatus = null) => {
    const currentStored = attendance[dateStr]?.[student.id] ?? null;
    let nextStored;
    if (targetStatus) {
      // Mobile direct selection: P → clear, A/T → set
      nextStored = targetStatus === 'P' ? null : targetStatus;
    } else {
      // Desktop click-to-cycle: null/P → A → T → null
      if (currentStored === null) nextStored = 'A';
      else if (currentStored === 'A') nextStored = 'T';
      else nextStored = null;
    }

    const prevAttendance = attendance;
    const cellKey = `${dateStr}:${student.id}`;

    setAttendance((prev) => {
      const updated = { ...prev };
      if (!updated[dateStr]) updated[dateStr] = {};
      const day = { ...updated[dateStr] };
      if (nextStored) { day[student.id] = nextStored; } else { delete day[student.id]; }
      updated[dateStr] = day;
      return updated;
    });
    setSavingCells((prev) => new Set([...prev, cellKey]));

    try {
      if (nextStored) {
        await saveAttendance(dateStr, { [student.id]: nextStored });
      } else {
        await clearAttendanceEntry(dateStr, student.id);
      }
    } catch {
      setAttendance(prevAttendance);
      setError('Failed to save. Please try again.');
    } finally {
      setSavingCells((prev) => { const s = new Set(prev); s.delete(cellKey); return s; });
    }
  }, [attendance]);

  const handleConfirmDay = useCallback(async (dateStr) => {
    if (attendance[dateStr] !== undefined) return;
    const prev = attendance;
    setAttendance((a) => ({ ...a, [dateStr]: {} }));
    try {
      await confirmAllPresent(dateStr);
    } catch {
      setAttendance(prev);
      setError('Failed to confirm day. Please try again.');
    }
  }, [attendance]);

  const toggleDay = (dateStr) => {
    setExpandedDays((prev) => {
      const s = new Set(prev);
      if (s.has(dateStr)) s.delete(dateStr); else s.add(dateStr);
      return s;
    });
  };

  // Group students by gender for the "all" view separator rows
  const boys = filteredStudents.filter((s) => s.gender === 'male');
  const girls = filteredStudents.filter((s) => s.gender === 'female');
  const ungrouped = filteredStudents.filter((s) => !s.gender);

  function renderStudentRows(studentList) {
    return studentList.map((student) => (
      <tr key={student.id}>
        <td className="att-name-col">
          <div className="att-name-row">
            <Link to={`/attendance/student/${student.id}`} className="att-student-link">
              {student.name}
            </Link>
            <button
              type="button"
              className="att-log-btn"
              onClick={() => openProgressPanel(student, todayStr)}
              title={`Log progress for ${student.name} today`}
            >
              📚
            </button>
          </div>
        </td>
        {weeks.map((week) =>
          week.days.map(({ dateStr }) => {
            const lockReason = getLockReason(dateStr, student, todayEnd);
            const status = getCellStatus(attendance, dateStr, student.id);
            const cellKey = `${dateStr}:${student.id}`;
            return (
              <AttCell
                key={dateStr}
                status={status}
                lockReason={lockReason}
                isSaving={savingCells.has(cellKey)}
                onClick={lockReason ? undefined : () => cycleStatus(dateStr, student)}
              />
            );
          })
        )}
      </tr>
    ));
  }

  function renderSeparator(label, count) {
    const totalCols = weeks.reduce((n, w) => n + w.days.length, 0) + 1;
    return (
      <tr key={`sep-${label}`}>
        <td colSpan={totalCols} className="att-group-sep">
          {label} <span className="att-group-count">({count})</span>
        </td>
      </tr>
    );
  }

  const selectedMonthStr = `${selectedYear}-${pad(selectedMonth)}`;

  return (
    <div className="page">
      <div className="page-header students-page-header">
        <div>
          <h2>Attendance</h2>
          <p className="page-subtitle">Daily attendance tracker — click a cell to cycle P → A → T.</p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* Controls bar */}
      <div className="att-controls">
        <select
          className="att-month-select"
          value={selectedMonthStr}
          onChange={handleMonthChange}
        >
          {validMonths.map(({ year, month }) => (
            <option key={`${year}-${month}`} value={`${year}-${pad(month)}`}>
              {MONTH_NAMES[month - 1]} {year}
            </option>
          ))}
        </select>

        <div className="att-gender-tabs">
          {[
            { key: 'all', label: `All (${students.length})` },
            { key: 'male', label: `Boys (${maleCount})` },
            { key: 'female', label: `Girls (${femaleCount})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`att-gender-tab${genderFilter === key ? ' att-gender-tab-active' : ''}`}
              onClick={() => setGenderFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary bar */}
      <div className="att-summary-bar">
        <div className="att-summary-item">
          <CalendarDays size={16} className="att-summary-icon"/>
          <span className="att-summary-num">{summary.recorded}</span>
          <span className="att-summary-lbl">Recorded Days</span>
        </div>
        <div className="att-summary-divider" />
        <div className="att-summary-item">
          <XCircle size={16} className="att-summary-icon att-icon-absent"/>
          <span className="att-summary-num att-num-absent">{summary.absences}</span>
          <span className="att-summary-lbl">Absences</span>
        </div>
        <div className="att-summary-divider" />
        <div className="att-summary-item">
          <Clock size={16} className="att-summary-icon att-icon-tardy"/>
          <span className="att-summary-num att-num-tardy">{summary.tardies}</span>
          <span className="att-summary-lbl">Tardies</span>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner"></div></div>
      ) : (
        <>
          {/* ── DESKTOP GRID (hidden on mobile) ─────────────────── */}
          <div className="att-grid-wrap">
            <table className="att-table">
              <thead>
                {/* Week header row */}
                <tr>
                  <th className="att-name-th att-name-col" rowSpan={2}>Student</th>
                  {weeks.map((week) => (
                    <th key={week.label} colSpan={week.days.length} className="att-week-th">
                      {week.label}
                    </th>
                  ))}
                </tr>
                {/* Day header row */}
                <tr>
                  {weeks.map((week) =>
                    week.days.map(({ day, dow, dateStr }) => {
                      const isToday = dateStr === todayStr;
                      const isFuture = new Date(dateStr + 'T12:00:00') > todayEnd;
                      const isDayRecorded = attendance[dateStr] !== undefined;
                      return (
                        <th
                          key={dateStr}
                          className={`att-day-th${isToday ? ' att-day-today' : ''}${isFuture ? ' att-day-future' : ''}`}
                        >
                          <span className="att-day-dow">{DOW_SHORT[dow]}</span>
                          <span className="att-day-num">{day}</span>
                          {!isFuture && (
                            <button
                              type="button"
                              className={`att-confirm-btn${isDayRecorded ? ' att-confirm-done' : ''}`}
                              onClick={() => handleConfirmDay(dateStr)}
                              title={isDayRecorded ? 'Day recorded' : 'Mark all present for this day'}
                            >
                              ✓
                            </button>
                          )}
                        </th>
                      );
                    })
                  )}
                </tr>
              </thead>
              <tbody>
                {genderFilter === 'all' ? (
                  <>
                    {boys.length > 0 && renderSeparator('Boys', boys.length)}
                    {renderStudentRows(boys)}
                    {girls.length > 0 && renderSeparator('Girls', girls.length)}
                    {renderStudentRows(girls)}
                    {ungrouped.length > 0 && renderSeparator('Other', ungrouped.length)}
                    {renderStudentRows(ungrouped)}
                  </>
                ) : (
                  renderStudentRows(filteredStudents)
                )}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={100} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
                      No students found. Add students in the Students page.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── MOBILE DAY-STACK (shown only on mobile) ─────────── */}
          <div className="att-mobile-wrap">
            {weeks.map((week) => (
              <div key={week.label} className="mob-week-block">
                <div className="mob-week-label">{week.label}</div>
                {week.days.map(({ day, dow, dateStr }) => {
                  const isFuture = new Date(dateStr + 'T12:00:00') > todayEnd;
                  const isToday = dateStr === todayStr;
                  const isDayRecorded = attendance[dateStr] !== undefined;
                  const isExpanded = expandedDays.has(dateStr);

                  return (
                    <div key={dateStr} className={`mob-day-block${isToday ? ' mob-day-today' : ''}`}>
                      <button
                        type="button"
                        className="mob-day-header"
                        onClick={() => !isFuture && toggleDay(dateStr)}
                        disabled={isFuture}
                      >
                        <span className="mob-day-title">
                          {DOW_SHORT[dow]}, {MONTH_NAMES[selectedMonth - 1].slice(0, 3)} {day}
                          {isToday && <span className="mob-today-badge">Today</span>}
                        </span>
                        <span className="mob-day-right">
                          {isFuture ? (
                            <span className="mob-future-label">Future</span>
                          ) : isDayRecorded ? (
                            <span className="mob-recorded-badge">✓ Recorded</span>
                          ) : (
                            <span className="mob-unrecorded-badge">Tap to record</span>
                          )}
                          {!isFuture && <span className="mob-chevron">{isExpanded ? '▲' : '▼'}</span>}
                        </span>
                      </button>

                      {isExpanded && !isFuture && (
                        <div className="mob-day-body">
                          {!isDayRecorded && (
                            <button
                              type="button"
                              className="mob-confirm-all-btn"
                              onClick={() => handleConfirmDay(dateStr)}
                            >
                              ✓ All Present
                            </button>
                          )}
                          {genderFilter === 'all' && boys.length > 0 && (
                            <div className="mob-group-label">Boys</div>
                          )}
                          {(genderFilter === 'all' ? boys : genderFilter === 'male' ? filteredStudents : []).map((student) => (
                            <MobileStudentRow
                              key={student.id}
                              student={student}
                              dateStr={dateStr}
                              status={getCellStatus(attendance, dateStr, student.id)}
                              lockReason={getLockReason(dateStr, student, todayEnd)}
                              onCycle={cycleStatus}
                              onLogProgress={openProgressPanel}
                            />
                          ))}
                          {genderFilter === 'all' && girls.length > 0 && (
                            <div className="mob-group-label">Girls</div>
                          )}
                          {(genderFilter === 'all' ? girls : genderFilter === 'female' ? filteredStudents : []).map((student) => (
                            <MobileStudentRow
                              key={student.id}
                              student={student}
                              dateStr={dateStr}
                              status={getCellStatus(attendance, dateStr, student.id)}
                              lockReason={getLockReason(dateStr, student, todayEnd)}
                              onCycle={cycleStatus}
                              onLogProgress={openProgressPanel}
                            />
                          ))}
                          {genderFilter === 'all' && ungrouped.length > 0 && (
                            <div className="mob-group-label">Other</div>
                          )}
                          {(genderFilter === 'all' ? ungrouped : []).map((student) => (
                            <MobileStudentRow
                              key={student.id}
                              student={student}
                              dateStr={dateStr}
                              status={getCellStatus(attendance, dateStr, student.id)}
                              lockReason={getLockReason(dateStr, student, todayEnd)}
                              onCycle={cycleStatus}
                              onLogProgress={openProgressPanel}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Progress Log Panel */}
      {progressPanel && (
        <ProgressLogPanel
          student={progressPanel.student}
          dateStr={progressPanel.dateStr}
          initialProgress={progressPanel.initialProgress}
          onSave={handleSaveProgress}
          onClose={() => setProgressPanel(null)}
        />
      )}

      {/* Legend */}
      <div className="att-legend">
        <span className="att-legend-item"><span className="att-cell att-present att-legend-swatch">P</span> Present</span>
        <span className="att-legend-item"><span className="att-cell att-absent att-legend-swatch">A</span> Absent</span>
        <span className="att-legend-item"><span className="att-cell att-tardy att-legend-swatch">T</span> Tardy</span>
        <span className="att-legend-item"><span className="att-cell att-empty att-legend-swatch">·</span> Unrecorded</span>
        <span className="att-legend-item"><span className="att-cell att-cell-future att-legend-swatch">–</span> Future</span>
      </div>
    </div>
  );
}
