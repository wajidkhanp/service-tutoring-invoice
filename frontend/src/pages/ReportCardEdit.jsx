import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getReportCard, updateReportCard, downloadReportCardPdf, emailReportCard, deleteReportCard } from '../services/api';

const CATS = [
  { key: 'newLesson', label: 'New Lesson', desc: 'New pages memorized this month' },
  { key: 'sabqi', label: 'Sabqi', desc: 'Recent lesson review' },
  { key: 'manzil', label: 'Manzil', desc: 'Long-term review (full cycle)' },
  { key: 'akhlaq', label: 'Akhlaq', desc: 'Character & behavior' },
  { key: 'fluency', label: 'Fluency / Nazra', desc: 'Recitation quality' },
];
const RATINGS = ['Excellent', 'Good', 'Needs Improvement'];

const EMPTY_PROGRESS = Object.fromEntries(CATS.map((c) => [c.key, { rating: '', notes: '' }]));

export default function ReportCardEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form state
  const [teacherName, setTeacherName] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [attendance, setAttendance] = useState({ totalDays: 0, present: 0, absent: 0, tardy: 0 });
  const [progress, setProgress] = useState(EMPTY_PROGRESS);
  const [stars, setStars] = useState(0);
  const [achievements, setAchievements] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    setLoading(true);
    getReportCard(id)
      .then((res) => {
        const rc = res.data.reportCard;
        setCard(rc);
        setTeacherName(rc.teacherName || '');
        setClassLevel(rc.classLevel || '');
        setAttendance(rc.attendance || { totalDays: 0, present: 0, absent: 0, tardy: 0 });
        setProgress(rc.progress || EMPTY_PROGRESS);
        setStars(rc.stars || 0);
        setAchievements(rc.achievements || '');
        setRemarks(rc.remarks || '');
      })
      .catch(() => setError('Unable to load report card.'))
      .finally(() => setLoading(false));
  }, [id]);

  const buildPayload = (status) => ({
    teacherName, classLevel, attendance, progress, stars, achievements, remarks, status,
  });

  const handleSave = async (status = 'draft') => {
    setSaving(true);
    setError('');
    try {
      const res = await updateReportCard(id, buildPayload(status));
      setCard(res.data.reportCard);
      setSuccessMsg(status === 'complete' ? 'Marked as complete.' : 'Draft saved.');
    } catch {
      setError('Unable to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    // Save first
    try { await updateReportCard(id, buildPayload(card?.status || 'draft')); } catch { /* proceed */ }
    setPdfLoading(true);
    setError('');
    try {
      const res = await downloadReportCardPdf(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ReportCard_${(card?.studentName || '').replace(/\s+/g, '_')}_${card?.month}_${card?.year}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      // Mark complete
      const saved = await updateReportCard(id, buildPayload('complete'));
      setCard(saved.data.reportCard);
      setSuccessMsg('PDF downloaded and report card marked complete.');
    } catch {
      setError('Unable to generate PDF.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSendEmail = async () => {
    try { await updateReportCard(id, buildPayload('complete')); } catch { /* proceed */ }
    setEmailLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await emailReportCard(id);
      const updated = await updateReportCard(id, buildPayload('sent'));
      setCard(updated.data.reportCard);
      setSuccessMsg(`Report card sent to ${res.data.sentTo}.`);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to send email.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this report card? This cannot be undone.')) return;
    try {
      await deleteReportCard(id);
      navigate('/report-cards');
    } catch {
      setError('Unable to delete.');
    }
  };

  const attRate = attendance.totalDays > 0
    ? ((attendance.present / attendance.totalDays) * 100).toFixed(1) + '%'
    : 'N/A';

  const setRating = (key, rating) =>
    setProgress((p) => ({ ...p, [key]: { ...p[key], rating } }));

  const setNotes = (key, notes) =>
    setProgress((p) => ({ ...p, [key]: { ...p[key], notes } }));

  const setAttField = (field, val) =>
    setAttendance((a) => ({ ...a, [field]: Math.max(0, Number(val) || 0) }));

  if (loading) return <div className="page"><div className="loading-screen"><div className="spinner"></div></div></div>;
  if (!card && !loading) return (
    <div className="page">
      <Link to="/report-cards" className="sa-back-link">← Back to Report Cards</Link>
      <div className="alert alert-error" style={{ marginTop: '1rem' }}>Report card not found.</div>
    </div>
  );

  const statusColors = { sent: '#15803d', complete: '#0d9488', draft: '#6b7280' };

  return (
    <div className="page">
      <Link to="/report-cards" className="sa-back-link">← Back to Report Cards</Link>

      {/* Header */}
      <div className="rc-edit-header">
        <div>
          <h2>{card.studentName}</h2>
          <div style={{ fontSize: '0.9rem', color: 'var(--gray-500)', marginTop: '0.2rem' }}>
            {card.month} {card.year}
            {card.status && (
              <span style={{ marginLeft: '0.75rem', fontWeight: 600, color: statusColors[card.status] || '#6b7280', textTransform: 'capitalize' }}>
                · {card.status}
              </span>
            )}
            {card.sentAt && <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--gray-400)' }}>· Sent to {card.sentTo}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn-secondary btn-auto" onClick={() => handleSave('draft')} disabled={saving}>
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button className="btn-secondary btn-auto" onClick={() => handleSave('complete')} disabled={saving}>
            Mark Complete
          </button>
          <button className="btn-primary btn-auto" onClick={handleDownloadPdf} disabled={pdfLoading}>
            {pdfLoading ? 'Generating…' : 'Download PDF'}
          </button>
          <button className="btn-email btn-auto" onClick={handleSendEmail} disabled={emailLoading}>
            {emailLoading ? 'Sending…' : card.status === 'sent' ? 'Re-send Email' : 'Send to Parent'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMsg && <div className="alert alert-success" onClick={() => setSuccessMsg('')}>{successMsg}</div>}

      {/* Header info */}
      <div className="panel">
        <div className="panel-header"><h3>Report Card Info</h3></div>
        <div className="panel-body">
          <div className="rc-info-grid">
            <div className="form-row">
              <label>Teacher Name</label>
              <input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Teacher name" />
            </div>
            <div className="form-row">
              <label>Class Level</label>
              <input value={classLevel} onChange={(e) => setClassLevel(e.target.value)} placeholder="e.g. Hifz Year 1" />
            </div>
          </div>
        </div>
      </div>

      {/* Attendance */}
      <div className="panel">
        <div className="panel-header">
          <h3>Attendance Summary</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Auto-filled · adjust if needed</span>
        </div>
        <div className="panel-body">
          <div className="rc-att-grid">
            {[
              { label: 'Total Days', field: 'totalDays' },
              { label: 'Present', field: 'present' },
              { label: 'Absent', field: 'absent' },
              { label: 'Tardy', field: 'tardy' },
            ].map(({ label, field }) => (
              <div key={field} className="rc-att-cell">
                <label className="rc-att-label">{label}</label>
                <input
                  type="number"
                  min="0"
                  className="rc-att-input"
                  value={attendance[field] || 0}
                  onChange={(e) => setAttField(field, e.target.value)}
                />
              </div>
            ))}
            <div className="rc-att-cell">
              <label className="rc-att-label">Attendance Rate</label>
              <div className="rc-att-rate" style={{ color: attendance.totalDays > 0 && attendance.present / attendance.totalDays < 0.9 ? '#dc2626' : '#15803d' }}>
                {attRate}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="panel">
        <div className="panel-header"><h3>Progress Summary</h3></div>
        <div className="panel-body" style={{ padding: 0 }}>
          {/* Desktop table */}
          <div className="rc-progress-wrap">
            <table className="rc-progress-table">
              <thead>
                <tr>
                  <th className="rc-cat-th">Category</th>
                  {RATINGS.map((r) => <th key={r} className="rc-rating-th">{r}</th>)}
                  <th className="rc-notes-th">Teacher Notes</th>
                </tr>
              </thead>
              <tbody>
                {CATS.map((cat, i) => {
                  const catData = progress[cat.key] || { rating: '', notes: '' };
                  return (
                    <tr key={cat.key} className={i % 2 === 0 ? '' : 'rc-row-alt'}>
                      <td className="rc-cat-td">
                        <div style={{ fontWeight: 500 }}>{cat.label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{cat.desc}</div>
                      </td>
                      {RATINGS.map((r) => (
                        <td key={r} className="rc-rating-td">
                          <button
                            type="button"
                            className={`rc-rating-btn${catData.rating === r ? ' rc-rating-selected' : ''}`}
                            onClick={() => setRating(cat.key, catData.rating === r ? '' : r)}
                          >
                            {catData.rating === r ? '✓' : ''}
                          </button>
                        </td>
                      ))}
                      <td className="rc-notes-td">
                        <input
                          type="text"
                          className="rc-notes-input"
                          placeholder="Optional note…"
                          value={catData.notes || ''}
                          onChange={(e) => setNotes(cat.key, e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile stacked cards */}
          <div className="rc-prog-mobile">
            {CATS.map((cat) => {
              const catData = progress[cat.key] || { rating: '', notes: '' };
              return (
                <div key={cat.key} className="rc-prog-card">
                  <div className="rc-prog-card-title">{cat.label}</div>
                  <div className="rc-prog-card-desc">{cat.desc}</div>
                  <div className="rc-prog-pills">
                    {RATINGS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={`rc-prog-pill${catData.rating === r ? ' rc-prog-pill-sel' : ''}`}
                        onClick={() => setRating(cat.key, catData.rating === r ? '' : r)}
                      >
                        {catData.rating === r ? `✓ ${r}` : r}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    className="rc-notes-input"
                    placeholder="Teacher note (optional)…"
                    value={catData.notes || ''}
                    onChange={(e) => setNotes(cat.key, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stars & Achievements */}
      <div className="panel">
        <div className="panel-header"><h3>Stars & Achievements</h3></div>
        <div className="panel-body">
          <div className="rc-stars-row">
            <label style={{ fontWeight: 600, marginRight: '0.75rem' }}>Stars Earned</label>
            <button type="button" className="rc-star-btn" onClick={() => setStars((s) => Math.max(0, s - 1))}>−</button>
            <span className="rc-star-count">{stars}</span>
            <button type="button" className="rc-star-btn" onClick={() => setStars((s) => Math.min(20, s + 1))}>+</button>
            <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginLeft: '0.5rem' }}>/ 20</span>
          </div>
          <div className="form-row" style={{ marginTop: '1rem' }}>
            <label>Special Achievements</label>
            <input
              value={achievements}
              onChange={(e) => setAchievements(e.target.value)}
              placeholder="e.g. Memorized Surah Al-Mulk this month"
            />
          </div>
        </div>
      </div>

      {/* Teacher Remarks */}
      <div className="panel">
        <div className="panel-header"><h3>Teacher Remarks</h3></div>
        <div className="panel-body">
          <textarea
            className="rc-remarks"
            rows="4"
            placeholder="Write your remarks for the parent…"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="rc-edit-footer">
        <button type="button" className="btn-danger btn-auto" onClick={handleDelete}>Delete</button>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn-secondary btn-auto" onClick={() => handleSave('draft')} disabled={saving}>
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button className="btn-secondary btn-auto" onClick={() => handleSave('complete')} disabled={saving}>
            Mark Complete
          </button>
          <button className="btn-primary btn-auto" onClick={handleDownloadPdf} disabled={pdfLoading}>
            {pdfLoading ? 'Generating…' : 'Download PDF'}
          </button>
          <button className="btn-email btn-auto" onClick={handleSendEmail} disabled={emailLoading}>
            {emailLoading ? 'Sending…' : card.status === 'sent' ? 'Re-send Email' : 'Send to Parent'}
          </button>
        </div>
      </div>
    </div>
  );
}
