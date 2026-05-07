import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { TrendingUp, BookOpen, RotateCcw, Book } from 'lucide-react';
import { getStudents, getStudentYearProgress } from '../services/api';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ACCENT = '#0d9488';
const BLUE   = '#3b82f6';
const AMBER  = '#f59e0b';

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="prog-stat-card">
      {icon && <div className="prog-stat-icon">{icon}</div>}
      <div className="prog-stat-value" style={color ? { color } : {}}>{value}</div>
      <div className="prog-stat-label">{label}</div>
      {sub && <div className="prog-stat-sub">{sub}</div>}
    </div>
  );
}

export default function StudentProgress() {
  const { studentId } = useParams();
  const now = new Date();

  const [student, setStudent]   = useState(null);
  const [year, setYear]         = useState(now.getFullYear());
  const [data, setData]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  // Load student info once
  useEffect(() => {
    getStudents()
      .then((res) => {
        const s = (res.data.students || []).find((s) => s.id === studentId);
        setStudent(s || null);
      })
      .catch(() => {});
  }, [studentId]);

  // Load progress data when year changes
  useEffect(() => {
    setLoading(true);
    setError('');
    getStudentYearProgress(studentId, year)
      .then((res) => setData(res.data.data || []))
      .catch(() => setError('Unable to load progress data.'))
      .finally(() => setLoading(false));
  }, [studentId, year]);

  // Build chart data — fill in all 12 months even if no data
  const chartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const entry = data.find((d) => d.month === monthNum);
      return {
        month: MONTH_NAMES[i],
        lines:     entry?.linesMemorized ?? 0,
        sabqi:     entry?.sabqiRate      ?? null,
        manzil:    entry?.manzilDays     ?? 0,
        hasData:   !!entry,
      };
    });
  }, [data]);

  const totals = useMemo(() => ({
    lines:      data.reduce((s, d) => s + (d.linesMemorized || 0), 0),
    manzilDays: data.reduce((s, d) => s + (d.manzilDays || 0), 0),
    avgSabqi:   (() => {
      const withData = data.filter((d) => d.sabqiRate !== null);
      if (!withData.length) return null;
      return Math.round(withData.reduce((s, d) => s + d.sabqiRate, 0) / withData.length);
    })(),
  }), [data]);

  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) years.push(y);
    return years;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!student && !loading) {
    return (
      <div className="page">
        <nav className="page-breadcrumb">
          <Link to="/students">Students</Link>
          <span className="bc-sep">›</span>
          <span className="bc-current">Progress</span>
        </nav>
        <div className="info-block">Student not found.</div>
      </div>
    );
  }

  return (
    <div className="page">
      <nav className="page-breadcrumb">
        <Link to="/students">Students</Link>
        <span className="bc-sep">›</span>
        <Link to={`/students/${studentId}`}>{student?.name || '…'}</Link>
        <span className="bc-sep">›</span>
        <span className="bc-current">Progress</span>
      </nav>

      {/* Header */}
      <div className="page-header students-page-header">
        <div>
          <h2>Progress — {student?.name || '…'}</h2>
          <p className="page-subtitle">Memorisation progress tracked from daily class logs.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select
            className="att-month-select"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <Link to={`/attendance/student/${studentId}`} className="btn-secondary" style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Attendance →
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-screen"><div className="spinner"></div></div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="prog-stats-row">
            <StatCard label="Lines Memorised" value={totals.lines} sub={`in ${year}`} color={ACCENT} icon={<BookOpen size={18} color={ACCENT}/>} />
            <StatCard label="Avg Sabqi Rate"  value={totals.avgSabqi !== null ? `${totals.avgSabqi}%` : '—'} sub="days recited" icon={<RotateCcw size={18} color="#f59e0b"/>} />
            <StatCard label="Manzil Days"     value={totals.manzilDays} sub="total revisions" color={BLUE} icon={<Book size={18} color={BLUE}/>} />
          </div>

          {/* Lines memorised bar chart */}
          <div className="panel prog-chart-panel">
            <div className="prog-chart-title">Lines Memorised per Month</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                <Tooltip
                  formatter={(v) => [v, 'Lines']}
                  contentStyle={{ fontSize: 12, borderRadius: 6 }}
                />
                <Bar dataKey="lines" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.lines > 0 ? ACCENT : '#e5e7eb'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sabqi consistency line chart */}
          <div className="panel prog-chart-panel">
            <div className="prog-chart-title">Sabqi Consistency % per Month</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip
                  formatter={(v) => [v !== null ? `${v}%` : '—', 'Sabqi Rate']}
                  contentStyle={{ fontSize: 12, borderRadius: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="sabqi"
                  stroke={AMBER}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: AMBER }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Manzil days bar chart */}
          <div className="panel prog-chart-panel">
            <div className="prog-chart-title">Manzil Recitation Days per Month</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                <Tooltip
                  formatter={(v) => [v, 'Days']}
                  contentStyle={{ fontSize: 12, borderRadius: 6 }}
                />
                <Bar dataKey="manzil" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.manzil > 0 ? BLUE : '#e5e7eb'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly detail table */}
          <div className="panel">
            <div className="prog-chart-title" style={{ padding: '1rem 1.25rem 0' }}>Monthly Breakdown</div>
            <div className="panel-body" style={{ padding: 0 }}>
              <table className="student-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Lines</th>
                    <th>Sabqi Rate</th>
                    <th>Manzil Days</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.filter((r) => r.hasData).length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>
                      No progress logged for {year} yet. Start by logging daily progress from the Attendance page.
                    </td></tr>
                  ) : (
                    chartData.map((row) => row.hasData && (
                      <tr key={row.month}>
                        <td style={{ fontWeight: 500 }}>{row.month} {year}</td>
                        <td style={{ color: row.lines > 0 ? ACCENT : 'var(--gray-400)' }}>{row.lines || '—'}</td>
                        <td>{row.sabqi !== null ? (
                          <span style={{ color: row.sabqi >= 80 ? '#15803d' : row.sabqi >= 60 ? AMBER : '#dc2626', fontWeight: 600 }}>
                            {row.sabqi}%
                          </span>
                        ) : '—'}</td>
                        <td>{row.manzil || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
