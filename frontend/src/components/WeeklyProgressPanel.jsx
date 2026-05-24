import { useState, useEffect } from 'react';
import { getDailyProgress, saveDailyProgress, getMonthHolidays } from '../services/api';
import ProgressLogPanel from './ProgressLogPanel';

const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function pad(n) { return String(n).padStart(2, '0'); }
function toDateStr(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

function getWeekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  d.setDate(d.getDate() + diff);
  return d;
}

function getWeekDays(weekStart) {
  return [0, 1, 2, 3, 4, 5].map((i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  }); // Mon through Sat
}

function isNoClassDay(date, student) {
  return date.getDay() === 0 || (student.gender === 'female' && date.getDay() === 5);
}

function isHolidayDay(date, holidays) {
  return holidays.has(toDateStr(date));
}

function isFutureDay(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

function isTodayDay(date) {
  const today = new Date();
  return toDateStr(date) === toDateStr(today);
}

function formatWeekRange(weekStart) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 5); // Saturday
  const s = weekStart;
  const e = weekEnd;
  if (s.getMonth() === e.getMonth()) {
    return `${MON[s.getMonth()]} ${s.getDate()} – ${e.getDate()}, ${s.getFullYear()}`;
  }
  return `${MON[s.getMonth()]} ${s.getDate()} – ${MON[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
}

// ── Cell helpers ─────────────────────────────────────────────

function newLessonCell(p) {
  if (!p?.newLesson) return '—';
  if (p.newLesson.status === 'missed') return <span className="wpb-badge wpb-missed">Missed</span>;
  if (p.newLesson.status === 'did_not_pass') return <span className="wpb-badge wpb-missed">Did not pass</span>;
  if (p.newLesson.status === 'juzz_completed') return <span className="wpb-badge wpb-special">Juzz ✓</span>;
  if (p.newLesson.surahName) {
    return (
      <span className="wpb-cell-text">
        {p.newLesson.surahName}{p.newLesson.lines ? ` · ${p.newLesson.lines}L` : ''}
      </span>
    );
  }
  return '—';
}

function sabqiCell(p) {
  if (!p) return '—';
  if (p.sabqi === true) {
    const r = p.sabqiRating;
    return (
      <span className={`wpb-badge ${r === 'good' ? 'wpb-good' : r === 'needs_improvement' ? 'wpb-ni' : 'wpb-yes'}`}>
        ✓{r === 'good' ? ' G' : r === 'needs_improvement' ? ' NI' : ''}
      </span>
    );
  }
  if (p.sabqi === false) return <span className="wpb-badge wpb-no">✗</span>;
  return '—';
}

function manzilCell(p) {
  if (!p?.manzil) return '—';
  if (p.manzil.recited === false) return <span className="wpb-badge wpb-no">✗</span>;
  if (!p.manzil.recited) return '—';
  const parts = [];
  if (p.manzil.details) parts.push(p.manzil.details);
  else if (p.manzil.juzzNumber) parts.push(`Juzz ${p.manzil.juzzNumber}`);
  const text = parts.join(' ') || 'Yes';
  const r = p.manzil.rating;
  return (
    <span className="wpb-cell-text">
      {text.length > 18 ? text.slice(0, 18) + '…' : text}
      {r && (
        <span className={`wpb-rating-badge ${r === 'good' ? 'wpb-good' : 'wpb-ni'}`}>
          {r === 'good' ? 'G' : 'NI'}
        </span>
      )}
    </span>
  );
}

function akhlaqCell(p) {
  if (!p?.akhlaq) return '—';
  return (
    <span className={`wpb-badge ${p.akhlaq === 'good' ? 'wpb-good' : 'wpb-ni'}`}>
      {p.akhlaq === 'good' ? 'Good' : 'NI'}
    </span>
  );
}

function starsCell(p) {
  if (!p?.stars) return '—';
  return <span className="wpb-stars">{'★'.repeat(p.stars)}</span>;
}

function remarksCell(p) {
  if (!p?.achievement) return '—';
  const t = p.achievement;
  return (
    <span className="wpb-cell-text" title={t}>
      {t.length > 20 ? t.slice(0, 20) + '…' : t}
    </span>
  );
}

// ── Mobile card renderer ─────────────────────────────────────

function renderCard(date, student, holidays, progressByDate, setEditingDay) {
  const dateStr = toDateStr(date);
  const noClass = isNoClassDay(date, student);
  const holiday = isHolidayDay(date, holidays);
  const future = isFutureDay(date);
  const today = isTodayDay(date);
  const isClickable = !noClass && !holiday && !future;
  const p = progressByDate[dateStr];

  const dayLabel = `${DOW_SHORT[date.getDay()]} ${date.getDate()}`;

  if (noClass) {
    return (
      <div key={dateStr} className="wpb-card wpb-card-noclass wpb-card-simple">
        <span className="wpb-card-simple-day">{dayLabel}</span>
        <span className="wpb-card-noclass-text">No class</span>
      </div>
    );
  }
  if (holiday) {
    return (
      <div key={dateStr} className="wpb-card wpb-card-holiday wpb-card-simple">
        <span className="wpb-card-simple-day">{dayLabel}</span>
        <span className="wpb-card-holiday-text">Holiday</span>
      </div>
    );
  }

  return (
    <div
      key={dateStr}
      className={`wpb-card${isClickable ? ' wpb-card-clickable' : ''}`}
      onClick={isClickable ? () => setEditingDay(dateStr) : undefined}
    >
      <div className="wpb-card-head">
        <span className={`wpb-card-head-day${today ? ' wpb-card-head-today' : ''}`}>{dayLabel}</span>
        {isClickable && <span className="wpb-card-edit-hint">Tap to edit →</span>}
      </div>
      <div className="wpb-card-body">
        {future ? (
          <div className="wpb-card-future-label">Future — not yet recorded</div>
        ) : (
          <>
            <div className="wpb-card-field"><span className="wpb-card-label">New Lesson</span><span>{newLessonCell(p)}</span></div>
            <div className="wpb-card-field"><span className="wpb-card-label">Sabqi</span><span>{sabqiCell(p)}</span></div>
            <div className="wpb-card-field"><span className="wpb-card-label">Manzil</span><span>{manzilCell(p)}</span></div>
            <div className="wpb-card-field"><span className="wpb-card-label">Akhlaq</span><span>{akhlaqCell(p)}</span></div>
            <div className="wpb-card-field"><span className="wpb-card-label">Stars</span><span>{starsCell(p)}</span></div>
            <div className="wpb-card-field"><span className="wpb-card-label">Remarks</span><span>{remarksCell(p)}</span></div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────

export default function WeeklyProgressPanel({ student, initialDate, onClose }) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(initialDate || new Date()));
  const [progressByDate, setProgressByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingDay, setEditingDay] = useState(null);
  const [holidays, setHolidays] = useState(new Set());

  // Current week's Monday for disabling forward nav
  const todayWeekStart = getWeekStart(new Date());
  const isCurrentWeek = toDateStr(weekStart) >= toDateStr(todayWeekStart);

  useEffect(() => {
    setLoading(true);
    const days = getWeekDays(weekStart);
    const year = weekStart.getFullYear();
    const month = weekStart.getMonth() + 1;
    const lastDay = days[days.length - 1];
    const needsNextMonth = lastDay.getMonth() !== weekStart.getMonth();

    Promise.all([
      getMonthHolidays(year, month),
      needsNextMonth
        ? getMonthHolidays(lastDay.getFullYear(), lastDay.getMonth() + 1)
        : Promise.resolve({ data: { holidays: [] } }),
      ...days.map((d) => getDailyProgress(toDateStr(d), student.id).catch(() => null)),
    ]).then(([hol1, hol2, ...progResults]) => {
      const allHolidays = [
        ...(hol1.data.holidays || []),
        ...(hol2.data.holidays || []),
      ];
      setHolidays(new Set(allHolidays));
      const byDate = {};
      days.forEach((d, i) => {
        byDate[toDateStr(d)] = progResults[i]?.data?.progress || null;
      });
      setProgressByDate(byDate);
    }).finally(() => setLoading(false));
  }, [weekStart, student.id]);

  const weekDays = getWeekDays(weekStart);

  function renderRow(date) {
    const dateStr = toDateStr(date);
    const noClass = isNoClassDay(date, student);
    const holiday = isHolidayDay(date, holidays);
    const future = isFutureDay(date);
    const today = isTodayDay(date);
    const isClickable = !noClass && !holiday && !future;
    const p = progressByDate[dateStr];
    const hasData = !noClass && !holiday && p != null;

    const dayLabel = (
      <td className={`wpb-day-cell${today ? ' wpb-day-today' : ''}`}>
        {DOW_SHORT[date.getDay()]} {date.getDate()}
      </td>
    );

    let rowClass = '';
    if (noClass) rowClass = 'wpb-row-noclass';
    else if (holiday) rowClass = 'wpb-row-holiday';
    else if (future) rowClass = 'wpb-row-future';
    else if (hasData) rowClass = 'wpb-row-has-data';

    if (isClickable) rowClass += (rowClass ? ' ' : '') + 'wpb-row-clickable';

    const handleClick = isClickable ? () => setEditingDay(dateStr) : undefined;

    if (noClass) {
      return (
        <tr key={dateStr} className={rowClass}>
          {dayLabel}
          <td colSpan={6} className="wpb-noclass-cell">No class</td>
        </tr>
      );
    }

    if (holiday) {
      return (
        <tr key={dateStr} className={rowClass}>
          {dayLabel}
          <td colSpan={6} className="wpb-holiday-cell">Holiday</td>
        </tr>
      );
    }

    return (
      <tr key={dateStr} className={rowClass} onClick={handleClick}>
        {dayLabel}
        <td>{future ? '—' : newLessonCell(p)}</td>
        <td>{future ? '—' : sabqiCell(p)}</td>
        <td>{future ? '—' : manzilCell(p)}</td>
        <td>{future ? '—' : akhlaqCell(p)}</td>
        <td>{future ? '—' : starsCell(p)}</td>
        <td>{future ? '—' : remarksCell(p)}</td>
      </tr>
    );
  }

  return (
    <div className="wpb-backdrop" onClick={onClose}>
      <div className="wpb-panel" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="wpb-header">
          <div>
            <div className="wpb-student-name">{student.name}</div>
            {student.grade && <div className="wpb-student-sub">{student.grade}</div>}
          </div>
          <button className="prog-close" onClick={onClose} type="button">×</button>
        </div>

        {/* Week nav */}
        <div className="wpb-nav">
          <button
            className="wpb-nav-btn"
            type="button"
            onClick={() =>
              setWeekStart((d) => {
                const n = new Date(d);
                n.setDate(n.getDate() - 7);
                return n;
              })
            }
          >
            ◀
          </button>
          <span className="wpb-nav-label">Week of {formatWeekRange(weekStart)}</span>
          <button
            className="wpb-nav-btn"
            type="button"
            disabled={isCurrentWeek}
            onClick={() =>
              setWeekStart((d) => {
                const n = new Date(d);
                n.setDate(n.getDate() + 7);
                return n;
              })
            }
          >
            ▶
          </button>
        </div>

        {/* Table or spinner */}
        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : (
          <>
            {/* Desktop: table */}
            <div className="wpb-table-wrap">
              <table className="wpb-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>New Lesson</th>
                    <th>Sabqi</th>
                    <th>Manzil</th>
                    <th>Akhlaq</th>
                    <th>★</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {weekDays.map((date) => renderRow(date))}
                </tbody>
              </table>
            </div>
            {/* Mobile: day cards */}
            <div className="wpb-cards">
              {weekDays.map((date) => renderCard(date, student, holidays, progressByDate, setEditingDay))}
            </div>
          </>
        )}

        {/* Day edit overlay */}
        {editingDay && (
          <ProgressLogPanel
            student={student}
            dateStr={editingDay}
            initialProgress={progressByDate[editingDay]}
            onSave={async (data) => {
              await saveDailyProgress(editingDay, student.id, data);
              setProgressByDate((prev) => ({ ...prev, [editingDay]: data }));
            }}
            onClose={() => setEditingDay(null)}
          />
        )}
      </div>
    </div>
  );
}
