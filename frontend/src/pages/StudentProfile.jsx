import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays, TrendingUp, FileText, Sun,
  Phone, Mail, Trash2, Pencil, X, Check,
} from 'lucide-react';
import { getStudents, createReportCard, deleteStudent, updateStudent } from '../services/api';
import GenderBadge from '../components/GenderBadge';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const EMPTY_FORM = {
  name: '', email: '', gender: '', joinDate: '', grade: '',
  address: '', rate: '', notes: '',
  parentName: '', parentPhone: '', parentEmail: '',
};

function formatDate(iso) {
  if (!iso) return '—';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function GenderRadio({ value, onChange }) {
  return (
    <div className="gender-radio-group">
      {[{ val: 'male', label: 'Male' }, { val: 'female', label: 'Female' }].map(({ val, label }) => (
        <label key={val} className={`gender-radio-label${value === val ? ' selected' : ''}`}>
          <input type="radio" name="sp-gender" value={val} checked={value === val} onChange={() => onChange(val)} />
          {label}
        </label>
      ))}
      {value && (
        <button type="button" className="gender-radio-clear" onClick={() => onChange('')}>Clear</button>
      )}
    </div>
  );
}

export default function StudentProfile() {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [rcLoading, setRcLoading] = useState(false);
  const [deleting, setDeleting]   = useState(false);

  const [editing, setEditing]     = useState(false);
  const [editForm, setEditForm]   = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    getStudents()
      .then((res) => {
        const found = (res.data.students || []).find((s) => s.id === studentId);
        setStudent(found || null);
      })
      .catch(() => setError('Unable to load student.'))
      .finally(() => setLoading(false));
  }, [studentId]);

  const openEdit = () => {
    setEditForm({
      name:        student.name        || '',
      email:       student.email       || '',
      gender:      student.gender      || '',
      joinDate:    student.joinDate    || '',
      grade:       student.grade       || '',
      address:     student.address     || '',
      rate:        student.rate !== undefined ? String(student.rate) : '',
      notes:       student.notes       || '',
      parentName:  student.parentName  || '',
      parentPhone: student.parentPhone || '',
      parentEmail: student.parentEmail || '',
    });
    setEditError('');
    setEditing(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((f) => ({ ...f, [name]: value }));
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setEditError('');
    try {
      const res = await updateStudent(studentId, editForm);
      setStudent(res.data.student);
      setEditing(false);
    } catch (err) {
      setEditError(err?.response?.data?.error || 'Unable to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Remove ${student.name}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteStudent(studentId);
      navigate('/students');
    } catch {
      setError('Unable to remove student. Please try again.');
      setDeleting(false);
    }
  };

  const openReportCard = async () => {
    if (rcLoading) return;
    setRcLoading(true);
    const now = new Date();
    try {
      const res = await createReportCard({
        studentId,
        month: MONTHS[now.getMonth()],
        year: String(now.getFullYear()),
      });
      navigate(`/report-cards/${res.data.reportCard.id}/edit`);
    } catch (err) {
      if (err?.response?.status === 409) {
        navigate(`/report-cards/${err.response.data.reportCard.id}/edit`);
      } else {
        setError('Unable to open report card.');
        setRcLoading(false);
      }
    }
  };

  if (loading) return <div className="page"><div className="loading-screen"><div className="spinner" /></div></div>;

  if (!student) {
    return (
      <div className="page">
        <div className="info-block">Student not found. <Link to="/students">Back to Students</Link></div>
      </div>
    );
  }

  return (
    <div className="page">
      <nav className="page-breadcrumb">
        <Link to="/students">Students</Link>
        <span className="bc-sep">›</span>
        <span className="bc-current">{student.name}</span>
      </nav>

      {/* Student header */}
      <div className="sp-hero">
        <div className="sp-avatar">{student.name.charAt(0).toUpperCase()}</div>
        <div className="sp-hero-info">
          <h2 className="sp-name">
            {student.name}
            <GenderBadge gender={student.gender} />
          </h2>
          {student.grade && <div className="sp-grade">{student.grade}</div>}
          {student.joinDate && <div className="sp-joined">Joined {formatDate(student.joinDate)}</div>}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Quick actions */}
      <div className="sp-actions-grid">
        <Link to="/daily" className="sp-action-card sp-action-daily">
          <Sun size={22} />
          <span className="sp-action-label">Daily Class</span>
          <span className="sp-action-sub">Attendance &amp; progress</span>
        </Link>
        <Link to={`/attendance/student/${studentId}`} className="sp-action-card sp-action-attendance">
          <CalendarDays size={22} />
          <span className="sp-action-label">Attendance History</span>
          <span className="sp-action-sub">Full year view</span>
        </Link>
        <Link to={`/students/${studentId}/progress`} className="sp-action-card sp-action-progress">
          <TrendingUp size={22} />
          <span className="sp-action-label">Progress Graphs</span>
          <span className="sp-action-sub">Lines, Sabqi, Manzil</span>
        </Link>
        <button type="button" className="sp-action-card sp-action-report" onClick={openReportCard} disabled={rcLoading}>
          <FileText size={22} />
          <span className="sp-action-label">{rcLoading ? 'Opening…' : 'Report Card'}</span>
          <span className="sp-action-sub">This month's card</span>
        </button>
      </div>

      {/* Details panel */}
      <div className="panel sp-details-panel">
        {/* Panel header with Edit + Delete */}
        <div className="sp-panel-header">
          <span className="sp-panel-title">Details</span>
          <div className="sp-panel-actions">
            {!editing && (
              <button type="button" className="sp-icon-btn sp-edit-btn" onClick={openEdit} title="Edit student">
                <Pencil size={14} />
              </button>
            )}
            <button
              type="button"
              className="sp-icon-btn sp-trash-btn"
              onClick={handleDelete}
              disabled={deleting}
              title="Remove student"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {editing ? (
          <form onSubmit={handleEditSave}>
            <div className="panel-body">
              {editError && <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>{editError}</div>}
              <div className="student-form">
                <div className="form-row">
                  <label>Name *</label>
                  <input name="name" value={editForm.name} onChange={handleEditChange} required />
                </div>
                <div className="form-row">
                  <label>Student Email *</label>
                  <input name="email" type="email" value={editForm.email} onChange={handleEditChange} required />
                </div>
                <div className="form-row">
                  <label>Gender</label>
                  <GenderRadio value={editForm.gender} onChange={(v) => setEditForm((f) => ({ ...f, gender: v }))} />
                </div>
                <div className="form-row">
                  <label>Join Date</label>
                  <input name="joinDate" type="date" value={editForm.joinDate} onChange={handleEditChange} />
                </div>
                <div className="form-row">
                  <label>Grade</label>
                  <input name="grade" value={editForm.grade} onChange={handleEditChange} placeholder="e.g. 7th Grade" />
                </div>
                <div className="form-row">
                  <label>Address</label>
                  <input name="address" value={editForm.address} onChange={handleEditChange} />
                </div>
                <div className="form-row">
                  <label>Hourly Rate ($)</label>
                  <input name="rate" type="number" min="0" step="0.01" value={editForm.rate} onChange={handleEditChange} />
                </div>
                <div className="form-section-label">Parent / Guardian</div>
                <div className="form-row">
                  <label>Parent Name</label>
                  <input name="parentName" value={editForm.parentName} onChange={handleEditChange} />
                </div>
                <div className="form-row">
                  <label>Parent Phone</label>
                  <input name="parentPhone" type="tel" value={editForm.parentPhone} onChange={handleEditChange} />
                </div>
                <div className="form-row">
                  <label>Parent Email</label>
                  <input name="parentEmail" type="email" value={editForm.parentEmail} onChange={handleEditChange} />
                </div>
                <div className="form-row">
                  <label>Notes</label>
                  <textarea name="notes" value={editForm.notes} onChange={handleEditChange} rows="2" />
                </div>
              </div>
            </div>
            <div className="sp-edit-footer">
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)} disabled={saving}>
                <X size={14} />Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                <Check size={14} />{saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="panel-body">
            <dl className="detail-list">
              {student.email && (
                <div className="detail-row">
                  <dt>Email</dt>
                  <dd><a href={`mailto:${student.email}`}>{student.email}</a></dd>
                </div>
              )}
              {student.rate && (
                <div className="detail-row">
                  <dt>Rate</dt>
                  <dd>${Number(student.rate).toFixed(2)} / hr</dd>
                </div>
              )}
              {student.address && (
                <div className="detail-row"><dt>Address</dt><dd>{student.address}</dd></div>
              )}
              {student.notes && (
                <div className="detail-row"><dt>Notes</dt><dd>{student.notes}</dd></div>
              )}
              {(student.parentName || student.parentPhone || student.parentEmail) && (
                <>
                  <div className="detail-section-divider">Parent / Guardian</div>
                  {student.parentName && (
                    <div className="detail-row"><dt>Name</dt><dd>{student.parentName}</dd></div>
                  )}
                  {student.parentPhone && (
                    <div className="detail-row">
                      <dt>Phone</dt>
                      <dd>
                        <a href={`tel:${student.parentPhone}`} className="sp-contact-link">
                          <Phone size={13} />{student.parentPhone}
                        </a>
                      </dd>
                    </div>
                  )}
                  {student.parentEmail && (
                    <div className="detail-row">
                      <dt>Email</dt>
                      <dd>
                        <a href={`mailto:${student.parentEmail}`} className="sp-contact-link">
                          <Mail size={13} />{student.parentEmail}
                        </a>
                      </dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
