import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react';
import {
  getStudents, getMonthAttendance, saveAttendance, confirmAllPresent, clearAttendanceEntry,
  getDailyProgress, saveDailyProgress,
} from '../services/api';
import ProgressLogPanel from '../components/ProgressLogPanel';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW_NAMES   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function pad(n) { return String(n).padStart(2, '0'); }
function toDateStr(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function isWeekend(d) { const w = d.getDay(); return w === 0 || w === 6; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

function prevWeekday(date) {
  let d = addDays(date, -1);
  while (isWeekend(d)) d = addDays(d, -1);
  return d;
}
function nextWeekday(date) {
  let d = addDays(date, 1);
  while (isWeekend(d)) d = addDays(d, 1);
  return d;
}

function hasAnyProgress(p) {
  if (!p) return false;
  return p.newLesson != null || p.sabqi != null || p.manzil != null;
}

function GenderBadge({ gender }) {
  if (!gender) return null;
  return <span className={`gender-badge gender-badge-${gender}`}>{gender === 'male' ? 'M' : 'F'}</span>;
}

function StudentCard({ student, status, hasProgress, isFuture, onStatusChange, onLogProgress }) {
  return (
    <div className={`daily-card daily-card-${status.toLowerCase()}`}>
      <div className="daily-card-header">
        <div className="daily-card-name">
          {student.name}
          <GenderBadge gender={student.gender} />
        </div>
        {student.grade && <div className="daily-card-grade">{student.grade}</div>}
      </div>

      <div className="daily-att-row">
        {[['P', 'Present'], ['A', 'Absent'], ['T', 'Tardy']].map(([s, label]) => (
          <button
            key={s}
            type="button"
            disabled={isFuture}
            className={`daily-att-btn daily-att-${s}${status === s ? ' active' : ''}`}
            onClick={() => onStatusChange(student, s)}
          >
            {label}
          </button>
        ))}
      </div>

      {!isFuture && (
        <button
          type="button"
          className={`daily-progress-btn${hasProgress ? ' logged' : ''}`}
          onClick={() => onLogProgress(student)}
        >
          {hasProgress ? '✓ Progress Logged' : '+ Log Progress'}
        </button>
      )}
    </div>
  );
}

export default function Daily() {
  const todayMidnight = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    return isWeekend(d) ? prevWeekday(d) : d;
  });

  const [students, setStudents]       = useState([]);
  const [studentsLoaded, setStudentsLoaded] = useState(false);

  // attendance data keyed by dateStr → { studentId: 'A'|'T' }
  const [attMap, setAttMap]             = useState({});
  // set of dateStrs that are confirmed school days
  const [recordedSet, setRecordedSet]   = useState(() => new Set());

  // progress logged keyed by dateStr → { studentId: bool }
  const [progressMap, setProgressMap]   = useState({});
  const [progressPanel, setProgressPanel] = useState(null);

  const loadedMonthsRef   = useRef(new Set());
  const loadedProgressRef = useRef(new Set());

  const dateStr  = toDateStr(currentDate);
  const isToday  = dateStr === toDateStr(todayMidnight);
  const isFuture = currentDate > todayMidnight;

  // Load students once
  useEffect(() => {
    getStudents()
      .then((res) => setStudents(res.data.students || []))
      .catch(() => {})
      .finally(() => setStudentsLoaded(true));
  }, []);

  // Load month attendance (cached per month)
  useEffect(() => {
    const year  = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const key   = `${year}-${pad(month)}`;
    if (loadedMonthsRef.current.has(key)) return;
    loadedMonthsRef.current.add(key);

    getMonthAttendance(year, month)
      .then((res) => {
        const raw = res.data.attendance || {};
        setAttMap((prev) => {
          const next = { ...prev };
          Object.entries(raw).forEach(([d, recs]) => { next[d] = recs || {}; });
          return next;
        });
        setRecordedSet((prev) => {
          const next = new Set(prev);
          Object.keys(raw).forEach((d) => next.add(d));
          return next;
        });
      })
      .catch(() => { loadedMonthsRef.current.delete(key); });
  }, [currentDate]);

  // Load daily progress (cached per date, requires students to be loaded first)
  useEffect(() => {
    if (!studentsLoaded || !students.length) return;
    if (loadedProgressRef.current.has(dateStr)) return;
    loadedProgressRef.current.add(dateStr);

    getDailyProgress(dateStr)
      .then((res) => {
        const all = res.data.progress || {};
        const perStudent = {};
        students.forEach((s) => { perStudent[s.id] = hasAnyProgress(all[s.id]); });
        setProgressMap((prev) => ({ ...prev, [dateStr]: perStudent }));
      })
      .catch(() => {
        loadedProgressRef.current.delete(dateStr);
      });
  }, [dateStr, students, studentsLoaded]);

  const getStatus = useCallback((studentId) => {
    if (!recordedSet.has(dateStr)) return 'P';
    return attMap[dateStr]?.[studentId] || 'P';
  }, [attMap, recordedSet, dateStr]);

  const handleStatusChange = useCallback(async (student, newStatus) => {
    const current    = getStatus(student.id);
    if (current === newStatus) return;
    const wasRecorded = recordedSet.has(dateStr);

    // Optimistic update
    setAttMap((prev) => {
      const day = { ...(prev[dateStr] || {}) };
      if (newStatus === 'P') delete day[student.id];
      else day[student.id] = newStatus;
      return { ...prev, [dateStr]: day };
    });
    setRecordedSet((prev) => new Set([...prev, dateStr]));

    try {
      if (!wasRecorded) await confirmAllPresent(dateStr);
      if (newStatus === 'P') await clearAttendanceEntry(dateStr, student.id);
      else await saveAttendance(dateStr, { [student.id]: newStatus });
    } catch {
      // Rollback
      setAttMap((prev) => {
        const day = { ...(prev[dateStr] || {}) };
        if (current === 'P') delete day[student.id];
        else day[student.id] = current;
        return { ...prev, [dateStr]: day };
      });
      if (!wasRecorded) {
        setRecordedSet((prev) => { const s = new Set(prev); s.delete(dateStr); return s; });
      }
    }
  }, [getStatus, dateStr, recordedSet]);

  const openProgressPanel = useCallback(async (student) => {
    let initialProgress = null;
    try {
      const res = await getDailyProgress(dateStr, student.id);
      initialProgress = res.data.progress;
    } catch {}
    setProgressPanel({ student, dateStr, initialProgress });
  }, [dateStr]);

  const handleSaveProgress = useCallback(async (data) => {
    if (!progressPanel) return;
    await saveDailyProgress(progressPanel.dateStr, progressPanel.student.id, data);
    setProgressMap((prev) => ({
      ...prev,
      [progressPanel.dateStr]: {
        ...(prev[progressPanel.dateStr] || {}),
        [progressPanel.student.id]: hasAnyProgress(data),
      },
    }));
  }, [progressPanel]);

  const groups = useMemo(() => [
    { label: 'Boys',  list: students.filter((s) => s.gender === 'male').sort((a, b) => a.name.localeCompare(b.name)) },
    { label: 'Girls', list: students.filter((s) => s.gender === 'female').sort((a, b) => a.name.localeCompare(b.name)) },
    { label: 'Other', list: students.filter((s) => !s.gender).sort((a, b) => a.name.localeCompare(b.name)) },
  ].filter((g) => g.list.length > 0), [students]);

  const summary = useMemo(() => {
    const day = attMap[dateStr] || {};
    let absent = 0, tardy = 0;
    students.forEach((s) => {
      if (day[s.id] === 'A') absent++;
      else if (day[s.id] === 'T') tardy++;
    });
    return { absent, tardy, present: students.length - absent - tardy, total: students.length };
  }, [attMap, dateStr, students]);

  const displayDate = `${DOW_NAMES[currentDate.getDay()]}, ${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header students-page-header">
        <div>
          <h2>Daily Class</h2>
          <p className="page-subtitle">Mark attendance and log Quran progress for today's session.</p>
        </div>
        <div className="daily-date-nav">
          <button className="daily-nav-btn" type="button" onClick={() => setCurrentDate(prevWeekday(currentDate))}>
            <ChevronLeft size={16} />
          </button>
          <span className="daily-date-display">
            <CalendarCheck size={14} />
            {displayDate}
          </span>
          <button
            className="daily-nav-btn"
            type="button"
            disabled={isToday || isFuture}
            onClick={() => setCurrentDate(nextWeekday(currentDate))}
          >
            <ChevronRight size={16} />
          </button>
          {(!isToday) && (
            <button className="btn-secondary daily-today-btn" type="button" onClick={() => setCurrentDate(todayMidnight)}>
              Today
            </button>
          )}
        </div>
      </div>

      {/* Status bar */}
      {studentsLoaded && students.length > 0 && (
        <div className="daily-status-bar">
          {isFuture ? (
            <span className="daily-status-future">Future date — read only</span>
          ) : recordedSet.has(dateStr) ? (
            <>
              <span className="daily-status-dot green" />
              <span className="daily-status-present">{summary.present} present</span>
              {summary.absent > 0 && (
                <><span className="daily-status-sep" /><span className="daily-status-absent">{summary.absent} absent</span></>
              )}
              {summary.tardy > 0 && (
                <><span className="daily-status-sep" /><span className="daily-status-tardy">{summary.tardy} tardy</span></>
              )}
            </>
          ) : (
            <>
              <span className="daily-status-dot gray" />
              <span className="daily-status-dim">Not yet recorded — tap a status button to begin</span>
            </>
          )}
        </div>
      )}

      {/* Card groups */}
      {!studentsLoaded ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : students.length === 0 ? (
        <div className="info-block">
          No students yet. <Link to="/students">Add students</Link> to get started.
        </div>
      ) : (
        groups.map((group, gi) => (
          <div key={group.label}>
            <div className={`daily-group-header${gi > 0 ? ' daily-group-border' : ''}`}>
              {group.label} <span className="student-group-count">{group.list.length}</span>
            </div>
            <div className="daily-cards-grid">
              {group.list.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  status={getStatus(student.id)}
                  hasProgress={progressMap[dateStr]?.[student.id] || false}
                  isFuture={isFuture}
                  onStatusChange={handleStatusChange}
                  onLogProgress={openProgressPanel}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {progressPanel && (
        <ProgressLogPanel
          student={progressPanel.student}
          dateStr={progressPanel.dateStr}
          initialProgress={progressPanel.initialProgress}
          onSave={handleSaveProgress}
          onClose={() => setProgressPanel(null)}
        />
      )}
    </div>
  );
}
