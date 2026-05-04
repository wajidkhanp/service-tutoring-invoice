import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getStudents, getReportCards, createReportCard, bulkCreateReportCards, deleteReportCard, downloadReportCardPdf, emailReportCard,
} from '../services/api';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getValidMonths() {
  const now = new Date();
  const list = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    list.push({ month: MONTHS[d.getMonth()], year: String(d.getFullYear()) });
  }
  return list;
}

function GenderBadge({ gender }) {
  if (!gender) return null;
  return <span className={`gender-badge gender-badge-${gender}`}>{gender === 'male' ? 'M' : 'F'}</span>;
}

function StatusBadge({ status }) {
  const map = {
    sent: { label: 'Sent', cls: 'rc-status-sent' },
    complete: { label: 'Complete', cls: 'rc-status-complete' },
    draft: { label: 'Draft', cls: 'rc-status-draft' },
  };
  const info = map[status] || map.draft;
  return <span className={`rc-status-badge ${info.cls}`}>{info.label}</span>;
}

export default function ReportCards() {
  const navigate = useNavigate();
  const validMonths = useMemo(() => getValidMonths(), []);

  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${MONTHS[now.getMonth()]}|${now.getFullYear()}`;
  });
  const [students, setStudents] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [actionId, setActionId] = useState(null);

  const [month, year] = period.split('|');

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([getStudents(), getReportCards({ month, year })])
      .then(([sRes, rcRes]) => {
        setStudents(sRes.data.students || []);
        setCards(rcRes.data.reportCards || []);
      })
      .catch(() => setError('Unable to load data.'))
      .finally(() => setLoading(false));
  }, [month, year]);

  const cardMap = useMemo(() => {
    const m = {};
    for (const c of cards) m[c.studentId] = c;
    return m;
  }, [cards]);

  const stats = useMemo(() => {
    const total = students.length;
    const started = cards.length;
    const sent = cards.filter((c) => c.status === 'sent').length;
    const complete = cards.filter((c) => c.status === 'complete').length;
    const draft = cards.filter((c) => c.status === 'draft').length;
    return { total, started, sent, complete, draft, notStarted: total - started };
  }, [students, cards]);

  const handleBulkGenerate = async () => {
    setBulkLoading(true);
    setError('');
    try {
      const res = await bulkCreateReportCards({ month, year });
      const { created, skipped } = res.data;
      const [sRes, rcRes] = await Promise.all([getStudents(), getReportCards({ month, year })]);
      setStudents(sRes.data.students || []);
      setCards(rcRes.data.reportCards || []);
      setSuccessMsg(created > 0
        ? `Created ${created} draft report card${created !== 1 ? 's' : ''} for ${month} ${year}. ${skipped > 0 ? `${skipped} already existed.` : ''}`
        : `All ${skipped} report cards already exist for ${month} ${year}.`);
    } catch {
      setError('Unable to generate report cards.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleOpenCard = async (student) => {
    const existing = cardMap[student.id];
    if (existing) {
      navigate(`/report-cards/${existing.id}/edit`);
      return;
    }
    setActionId(student.id);
    try {
      const res = await createReportCard({ studentId: student.id, month, year });
      navigate(`/report-cards/${res.data.reportCard.id}/edit`);
    } catch (err) {
      if (err?.response?.status === 409) {
        navigate(`/report-cards/${err.response.data.reportCard.id}/edit`);
      } else {
        setError('Unable to create report card.');
      }
    } finally {
      setActionId(null);
    }
  };

  const handleDownloadPdf = async (card) => {
    setActionId(card.id + '-pdf');
    try {
      const res = await downloadReportCardPdf(card.id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ReportCard_${card.studentName.replace(/\s+/g, '_')}_${card.month}_${card.year}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Unable to download PDF.');
    } finally {
      setActionId(null);
    }
  };

  const handleEmail = async (card) => {
    setActionId(card.id + '-email');
    setError('');
    setSuccessMsg('');
    try {
      const res = await emailReportCard(card.id);
      setCards((prev) => prev.map((c) => c.id === card.id ? { ...c, status: 'sent', sentAt: new Date().toISOString(), sentTo: res.data.sentTo } : c));
      setSuccessMsg(`Report card sent to ${res.data.sentTo} for ${card.studentName}.`);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to send email.');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (card) => {
    if (!window.confirm(`Delete report card for ${card.studentName}?`)) return;
    try {
      await deleteReportCard(card.id);
      setCards((prev) => prev.filter((c) => c.id !== card.id));
    } catch {
      setError('Unable to delete report card.');
    }
  };

  const sortedStudents = useMemo(() => {
    const boys = students.filter((s) => s.gender === 'male').sort((a, b) => a.name.localeCompare(b.name));
    const girls = students.filter((s) => s.gender === 'female').sort((a, b) => a.name.localeCompare(b.name));
    const other = students.filter((s) => !s.gender).sort((a, b) => a.name.localeCompare(b.name));
    return [...boys, ...girls, ...other];
  }, [students]);

  return (
    <div className="page">
      <div className="page-header students-page-header">
        <div>
          <h2>Report Cards</h2>
          <p className="page-subtitle">Generate, fill, and send monthly Quran class report cards.</p>
        </div>
        <button className="btn-primary btn-auto" onClick={handleBulkGenerate} disabled={bulkLoading}>
          {bulkLoading ? 'Generating…' : `Generate All — ${month} ${year}`}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMsg && <div className="alert alert-success" onClick={() => setSuccessMsg('')}>{successMsg}</div>}

      {/* Month selector */}
      <div className="att-controls" style={{ marginBottom: '1rem' }}>
        <select
          className="att-month-select"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          {validMonths.map(({ month: m, year: y }) => (
            <option key={`${m}|${y}`} value={`${m}|${y}`}>{m} {y}</option>
          ))}
        </select>
      </div>

      {/* Stats bar */}
      {!loading && (
        <div className="rc-stats-bar">
          <span><strong>{stats.total}</strong> students</span>
          <span className="rc-stat-dot">·</span>
          <span className="rc-stat-sent"><strong>{stats.sent}</strong> sent</span>
          <span className="rc-stat-dot">·</span>
          <span className="rc-stat-complete"><strong>{stats.complete}</strong> complete</span>
          <span className="rc-stat-dot">·</span>
          <span className="rc-stat-draft"><strong>{stats.draft}</strong> draft</span>
          <span className="rc-stat-dot">·</span>
          <span className="rc-stat-none"><strong>{stats.notStarted}</strong> not started</span>
        </div>
      )}

      <div className="panel">
        <div className="panel-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading-screen"><div className="spinner"></div></div>
          ) : students.length === 0 ? (
            <div className="info-block" style={{ margin: '1.25rem' }}>No students found. Add students first.</div>
          ) : (
            <table className="student-table rc-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Attendance</th>
                  <th>Progress</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((student) => {
                  const card = cardMap[student.id];
                  const att = card?.attendance || null;
                  const rate = att && att.totalDays > 0
                    ? ((att.present / att.totalDays) * 100).toFixed(0) + '%'
                    : null;

                  const progress = card?.progress || {};
                  const filledCount = Object.values(progress).filter((p) => p.rating).length;
                  const progLabel = card
                    ? filledCount === 4 ? 'Complete' : `${filledCount}/4`
                    : '—';

                  return (
                    <tr key={student.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
                          {student.name}
                          <GenderBadge gender={student.gender} />
                        </div>
                        {student.grade && <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>{student.grade}</div>}
                        <div className="rc-row-actions">
                          <button
                            className="btn-view-details"
                            onClick={() => handleOpenCard(student)}
                            disabled={actionId === student.id}
                          >
                            {actionId === student.id ? '…' : card ? 'Edit' : 'Start'}
                          </button>
                          {card && (
                            <>
                              <button
                                className="btn-view-details"
                                onClick={() => handleDownloadPdf(card)}
                                disabled={actionId === card.id + '-pdf'}
                              >
                                {actionId === card.id + '-pdf' ? '…' : 'PDF'}
                              </button>
                              <button
                                className="btn-view-details rc-btn-email"
                                onClick={() => handleEmail(card)}
                                disabled={actionId === card.id + '-email'}
                              >
                                {actionId === card.id + '-email' ? 'Sending…' : card.status === 'sent' ? 'Re-send' : 'Send'}
                              </button>
                              <button
                                className="btn-view-details rc-btn-delete"
                                onClick={() => handleDelete(card)}
                              >
                                Del
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.875rem', color: 'var(--gray-700)' }}>
                        {att ? (
                          <>
                            <span style={{ fontWeight: 600 }}>{att.present}/{att.totalDays}</span>
                            {rate && <span style={{ color: Number(rate) < 90 ? '#dc2626' : '#15803d', marginLeft: '0.35rem', fontSize: '0.8rem' }}>({rate})</span>}
                          </>
                        ) : <span style={{ color: 'var(--gray-400)' }}>—</span>}
                      </td>
                      <td style={{ fontSize: '0.875rem' }}>
                        {card ? (
                          <span style={{ color: filledCount === 4 ? '#15803d' : 'var(--gray-500)' }}>{progLabel}</span>
                        ) : <span style={{ color: 'var(--gray-400)' }}>—</span>}
                      </td>
                      <td>
                        {card ? <StatusBadge status={card.status} /> : <span className="rc-status-badge rc-status-none">Not Started</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
