import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStudents, getStudentAttendance } from '../services/api';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function pad(n) { return String(n).padStart(2, '0'); }

function formatDate(iso) {
  if (!iso) return '—';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

function groupByMonth(attendance) {
  const groups = {};
  for (const [date, status] of Object.entries(attendance)) {
    const [y, m] = date.split('-');
    const key = `${y}-${m}`;
    if (!groups[key]) groups[key] = { year: Number(y), month: Number(m), days: [] };
    groups[key].days.push({ date, status });
  }
  return Object.values(groups)
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .map((g) => ({ ...g, days: g.days.sort((a, b) => a.date.localeCompare(b.date)) }));
}

function buildWeekGrid(year, month, days) {
  const statusMap = {};
  for (const { date, status } of days) statusMap[date] = status;

  const daysInMonth = new Date(year, month, 0).getDate();
  const weeks = [];
  let currentWeek = null;

  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow === 0 || dow === 6) continue;

    if (dow === 1 || currentWeek === null) {
      if (currentWeek) weeks.push(currentWeek);
      currentWeek = { weekNum: weeks.length + 1, cells: {} };
    }

    const dateStr = `${year}-${pad(month)}-${pad(d)}`;
    currentWeek.cells[dow] = { d, dateStr, status: statusMap[dateStr] };
  }
  if (currentWeek && Object.keys(currentWeek.cells).length > 0) weeks.push(currentWeek);
  return weeks;
}

function GenderBadge({ gender }) {
  if (!gender) return null;
  return <span className={`gender-badge gender-badge-${gender}`}>{gender === 'male' ? 'M' : 'F'}</span>;
}

function getValidYears() {
  const now = new Date();
  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) years.push(y);
  return years;
}

export default function StudentAttendance() {
  const { studentId } = useParams();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [summary, setSummary] = useState({ present: 0, absent: 0, tardy: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedMonths, setExpandedMonths] = useState(new Set());

  const validYears = useMemo(() => getValidYears(), []);

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([getStudents(), getStudentAttendance(studentId, year)])
      .then(([studRes, attRes]) => {
        const found = (studRes.data.students || []).find((s) => s.id === studentId);
        setStudent(found || null);
        setAttendance(attRes.data.attendance || {});
        setSummary(attRes.data.summary || { present: 0, absent: 0, tardy: 0, total: 0 });
        const now = new Date();
        setExpandedMonths(new Set([`${now.getFullYear()}-${pad(now.getMonth() + 1)}`]));
      })
      .catch(() => setError('Unable to load attendance data.'))
      .finally(() => setLoading(false));
  }, [studentId, year]);

  const monthGroups = useMemo(() => groupByMonth(attendance), [attendance]);

  const attendanceRate = summary.total > 0
    ? ((summary.present / summary.total) * 100).toFixed(1)
    : null;

  const toggleMonth = (key) => {
    setExpandedMonths((prev) => {
      const s = new Set(prev);
      if (s.has(key)) s.delete(key); else s.add(key);
      return s;
    });
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading-screen"><div className="spinner"></div></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="page">
        <nav className="page-breadcrumb">
          <Link to="/students">Students</Link>
          <span className="bc-sep">›</span>
          <span className="bc-current">Attendance</span>
        </nav>
        <div className="alert alert-error">Student not found.</div>
      </div>
    );
  }

  return (
    <div className="page">
      <nav className="page-breadcrumb">
        <Link to="/students">Students</Link>
        <span className="bc-sep">›</span>
        <Link to={`/students/${studentId}`}>{student.name}</Link>
        <span className="bc-sep">›</span>
        <span className="bc-current">Attendance</span>
      </nav>

      <div className="sa-student-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {student.name}
            <GenderBadge gender={student.gender} />
          </h2>
          <div className="sa-student-meta">
            {student.grade && <span>{student.grade}</span>}
            {student.grade && student.joinDate && <span className="sa-meta-dot">·</span>}
            {student.joinDate && <span>Joined {formatDate(student.joinDate)}</span>}
          </div>
        </div>

        <div className="sa-year-nav">
          <label className="sa-year-label">Year</label>
          <select
            className="att-month-select"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {validYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="sa-stats-row">
        <div className="sa-stat-card sa-stat-present">
          <div className="sa-stat-num">{summary.present}</div>
          <div className="sa-stat-lbl">Present</div>
        </div>
        <div className="sa-stat-card sa-stat-absent">
          <div className="sa-stat-num">{summary.absent}</div>
          <div className="sa-stat-lbl">Absent</div>
        </div>
        <div className="sa-stat-card sa-stat-tardy">
          <div className="sa-stat-num">{summary.tardy}</div>
          <div className="sa-stat-lbl">Tardy</div>
        </div>
        <div className="sa-stat-card sa-stat-rate">
          <div className="sa-stat-num">{attendanceRate !== null ? `${attendanceRate}%` : '—'}</div>
          <div className="sa-stat-lbl">Attendance Rate</div>
        </div>
      </div>

      {monthGroups.length === 0 ? (
        <div className="info-block">No attendance recorded for {year}.</div>
      ) : (
        <div className="sa-months">
          {monthGroups.map(({ year: y, month: m, days }) => {
            const key = `${y}-${pad(m)}`;
            const isExpanded = expandedMonths.has(key);
            const p = days.filter((d) => d.status === 'P').length;
            const a = days.filter((d) => d.status === 'A').length;
            const t = days.filter((d) => d.status === 'T').length;
            const weeks = buildWeekGrid(y, m, days);

            return (
              <div key={key} className="sa-month-block">
                <button
                  type="button"
                  className="sa-month-toggle"
                  onClick={() => toggleMonth(key)}
                >
                  <span className="sa-month-title">
                    {MONTH_NAMES[m - 1]} {y}
                    <span className="sa-month-total">{days.length} school days</span>
                  </span>
                  <span className="sa-month-mini">
                    <span className="sa-mini-p">P: {p}</span>
                    <span className="sa-mini-a">A: {a}</span>
                    <span className="sa-mini-t">T: {t}</span>
                    <span className="sa-chevron">{isExpanded ? '▲' : '▼'}</span>
                  </span>
                </button>

                {isExpanded && (
                  <div className="sa-month-body">
                    <div className="sa-week-grid-wrap">
                      <table className="sa-week-table">
                        <thead>
                          <tr>
                            <th className="sa-wk-th"></th>
                            <th className="sa-day-col">Mon</th>
                            <th className="sa-day-col">Tue</th>
                            <th className="sa-day-col">Wed</th>
                            <th className="sa-day-col">Thu</th>
                            <th className="sa-day-col">Fri</th>
                          </tr>
                        </thead>
                        <tbody>
                          {weeks.map((week) => (
                            <tr key={week.weekNum}>
                              <td className="sa-wk-label">W{week.weekNum}</td>
                              {[1, 2, 3, 4, 5].map((dow) => {
                                const cell = week.cells[dow];
                                if (!cell) return <td key={dow} className="sa-cell-blank"></td>;
                                if (cell.status === undefined) {
                                  return (
                                    <td key={dow} className="sa-cell-noschool">
                                      <span className="sa-cell-d">{cell.d}</span>
                                    </td>
                                  );
                                }
                                const cls = cell.status === 'A' ? 'att-absent' : cell.status === 'T' ? 'att-tardy' : 'att-present';
                                return (
                                  <td key={dow} className={`sa-week-cell ${cls}`}>
                                    <span className="sa-cell-d">{cell.d}</span>
                                    <span className="sa-cell-s">{cell.status}</span>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
