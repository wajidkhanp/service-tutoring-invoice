import { useEffect, useState } from 'react';
import { createStudent, deleteStudent, getStudents } from '../services/api';

function formatDate(iso) {
  if (!iso) return '—';
  // Date-only strings (YYYY-MM-DD) parse as UTC in JS; append T00:00:00 to force local time
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

const EMPTY_FORM = { name: '', email: '', joinDate: '', rate: '', grade: '', address: '', notes: '' };

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState('');

  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getStudents();
        setStudents(res.data.students || []);
      } catch {
        setError('Unable to load students. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((c) => ({ ...c, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAddError('');
    setSaving(true);
    try {
      const res = await createStudent(form);
      setStudents((c) => [...c, res.data.student]);
      setForm(EMPTY_FORM);
      setShowAdd(false);
    } catch (err) {
      setAddError(err?.response?.data?.error || 'Unable to create student.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (studentId) => {
    if (!window.confirm('Remove this student? This cannot be undone.')) return;
    try {
      await deleteStudent(studentId);
      setStudents((c) => c.filter((s) => s.id !== studentId));
      setSelected(null);
    } catch {
      setError('Unable to delete student.');
    }
  };

  const closeAdd = () => {
    setShowAdd(false);
    setAddError('');
    setForm(EMPTY_FORM);
  };

  return (
    <div className="page">
      <div className="page-header students-page-header">
        <div>
          <h2>Students</h2>
          <p className="page-subtitle">Manage your tutoring roster and student billing details.</p>
        </div>
        <button className="btn-primary btn-auto" onClick={() => setShowAdd(true)}>+ Add Student</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="panel">
        <div className="panel-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading-screen"><div className="spinner"></div></div>
          ) : students.length === 0 ? (
            <div className="info-block" style={{ margin: '1.25rem' }}>
              No students yet. Click "+ Add Student" to get started.
            </div>
          ) : (
            <table className="student-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.name}</td>
                    <td className="td-action">
                      <button className="btn-view-details" onClick={() => setSelected(student)}>
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Student Overlay */}
      {showAdd && (
        <div className="overlay-backdrop" onClick={closeAdd}>
          <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-header">
              <h3>Add Student</h3>
              <button className="overlay-close" type="button" onClick={closeAdd}>×</button>
            </div>
            <div className="overlay-body">
              {addError && <div className="alert alert-error">{addError}</div>}
              <form id="add-student-form" className="student-form" onSubmit={handleSubmit}>
                <div className="form-row">
                  <label htmlFor="s-name">Name</label>
                  <input id="s-name" name="name" value={form.name} onChange={handleChange} placeholder="Student name" required />
                </div>
                <div className="form-row">
                  <label htmlFor="s-email">Email</label>
                  <input id="s-email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="name@example.com" required />
                </div>
                <div className="form-row">
                  <label htmlFor="s-joinDate">Join Date</label>
                  <input id="s-joinDate" name="joinDate" type="date" value={form.joinDate} onChange={handleChange} />
                </div>
                <div className="form-row">
                  <label htmlFor="s-grade">Grade</label>
                  <input id="s-grade" name="grade" value={form.grade} onChange={handleChange} placeholder="e.g. 7th Grade" />
                </div>
                <div className="form-row">
                  <label htmlFor="s-address">Address</label>
                  <input id="s-address" name="address" value={form.address} onChange={handleChange} placeholder="Student address" />
                </div>
                <div className="form-row">
                  <label htmlFor="s-rate">Hourly rate ($)</label>
                  <input id="s-rate" name="rate" type="number" min="0" step="0.01" value={form.rate} onChange={handleChange} placeholder="0.00" />
                </div>
                <div className="form-row">
                  <label htmlFor="s-notes">Notes</label>
                  <textarea id="s-notes" name="notes" value={form.notes} onChange={handleChange} placeholder="Optional billing notes" rows="3" />
                </div>
              </form>
            </div>
            <div className="overlay-footer">
              <button type="button" className="btn-secondary" onClick={closeAdd}>Cancel</button>
              <button type="submit" form="add-student-form" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Add Student'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Detail Overlay */}
      {selected && (
        <div className="overlay-backdrop" onClick={() => setSelected(null)}>
          <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-header">
              <h3>{selected.name}</h3>
              <button className="overlay-close" type="button" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="overlay-body">
              <dl className="detail-list">
                <div className="detail-row">
                  <dt>Email</dt>
                  <dd>{selected.email}</dd>
                </div>
                <div className="detail-row">
                  <dt>Join Date</dt>
                  <dd>{formatDate(selected.joinDate)}</dd>
                </div>
                {selected.grade && (
                  <div className="detail-row">
                    <dt>Grade</dt>
                    <dd>{selected.grade}</dd>
                  </div>
                )}
                {selected.address && (
                  <div className="detail-row">
                    <dt>Address</dt>
                    <dd>{selected.address}</dd>
                  </div>
                )}
                <div className="detail-row">
                  <dt>Rate</dt>
                  <dd>${Number(selected.rate).toFixed(2)} / hr</dd>
                </div>
                {selected.notes && (
                  <div className="detail-row">
                    <dt>Notes</dt>
                    <dd>{selected.notes}</dd>
                  </div>
                )}
                <div className="detail-row">
                  <dt>Added</dt>
                  <dd>{formatDate(selected.createdAt)}</dd>
                </div>
              </dl>
            </div>
            <div className="overlay-footer">
              <button type="button" className="btn-secondary" onClick={() => setSelected(null)}>Close</button>
              <button type="button" className="btn-danger" onClick={() => handleDelete(selected.id)}>
                Remove Student
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
