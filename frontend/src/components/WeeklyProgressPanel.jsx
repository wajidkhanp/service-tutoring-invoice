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
  if (p.newLesson.status === 'juzz_completed') return <span className="wpb-badge wpb-special">No lesson · Juzz ✓</span>;
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
      <div key={dateStr} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.7rem 1rem', background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:'12px', flexShrink:0}}>
        <span style={{fontWeight:700, fontSize:'1rem', color:'#1f2937'}}>{dayLabel}</span>
        <span style={{fontSize:'0.82rem', color:'#9ca3af', fontStyle:'italic'}}>No class</span>
      </div>
    );
  }
  if (holiday) {
    return (
      <div key={dateStr} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.7rem 1rem', background:'#fffbeb', border:'1px solid #e5e7eb', borderRadius:'12px', flexShrink:0}}>
        <span style={{fontWeight:700, fontSize:'1rem', color:'#1f2937'}}>{dayLabel}</span>
        <span style={{fontSize:'0.82rem', color:'#d97706', fontWeight:600}}>Holiday</span>
      </div>
    );
  }

  return (
    <div
      key={dateStr}
      onClick={isClickable ? () => setEditingDay(dateStr) : undefined}
      style={{
        border: '1px solid #e5e7eb', borderRadius: '12px',
        overflow: 'hidden', background: '#fff',
        cursor: isClickable ? 'pointer' : 'default',
        flexShrink: 0,
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.7rem 1rem', background: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
      }}>
        <span style={{fontWeight: 700, fontSize: '1rem', color: today ? '#0d9488' : '#1f2937'}}>
          {dayLabel}
        </span>
        {isClickable && <span style={{fontSize: '0.72rem', color: '#9ca3af'}}>Tap to edit →</span>}
      </div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr'}}>
        {future ? (
          <div style={{gridColumn:'1/-1', padding:'0.7rem 0.9rem', fontSize:'0.82rem', color:'#d1d5db', fontStyle:'italic'}}>
            Future — not yet recorded
          </div>
        ) : (
          [
            ['New Lesson', newLessonCell(p)],
            ['Sabqi',      sabqiCell(p)],
            ['Manzil',     manzilCell(p)],
            ['Akhlaq',     akhlaqCell(p)],
            ['Stars',      starsCell(p)],
            ['Remarks',    remarksCell(p)],
          ].map(([label, val], i) => (
            <div
              key={label}
              style={{
                display: 'flex', flexDirection: 'column', gap: '5px',
                padding: '0.6rem 0.85rem',
                borderBottom: i < 4 ? '1px solid #f3f4f6' : 'none',
                borderRight: i % 2 === 0 ? '1px solid #f3f4f6' : 'none',
              }}
            >
              <span style={{fontSize:'0.63rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'#9ca3af'}}>
                {label}
              </span>
              <span style={{fontSize:'0.88rem', minHeight:'20px', display:'flex', alignItems:'center'}}>
                {val}
              </span>
            </div>
          ))
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
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1100);

  // JS-based breakpoint — bypasses iOS Safari CSS media query issues
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1100);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

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

  const backdropStyle = isMobile
    ? { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'flex-end', justifyContent:'center' }
    : { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem' };

  const panelStyle = isMobile
    ? { background:'#fff', borderRadius:'20px 20px 0 0', width:'100%', maxHeight:'94vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 -8px 40px rgba(0,0,0,0.18)' }
    : { background:'#fff', borderRadius:'16px', width:'100%', maxWidth:'1060px', maxHeight:'88vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,0.22)' };

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>

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
          isMobile ? (
            /* Mobile: day cards (JS-controlled, not CSS media query) */
            <div style={{display:'flex', flexDirection:'column', gap:'0.6rem', overflowY:'auto', flex:1, padding:'0.75rem'}}>
              {weekDays.map((date) => renderCard(date, student, holidays, progressByDate, setEditingDay))}
            </div>
          ) : (
            /* Desktop: table */
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
          )
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
