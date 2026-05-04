import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createStudent, deleteStudent, getStudents, updateStudent } from '../services/api';

function formatDate(iso) {
  if (!iso) return '—';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

const EMPTY_FORM = {
  name: '', email: '', joinDate: '', rate: '', grade: '', address: '', notes: '', gender: '',
  parentName: '', parentPhone: '', parentEmail: '',
};

function GenderBadge({ gender }) {
  if (!gender) return null;
  return (
    <span className={`gender-badge gender-badge-${gender}`}>
      {gender === 'male' ? 'M' : 'F'}
    </span>
  );
}

function GenderRadio({ value, onChange }) {
  return (
    <div className="gender-radio-group">
      {[{ val: 'male', label: 'Male' }, { val: 'female', label: 'Female' }].map(({ val, label }) => (
        <label key={val} className={`gender-radio-label${value === val ? ' selected' : ''}`}>
          <input
            type="radio"
            name="gender"
            value={val}
            checked={value === val}
            onChange={() => onChange(val)}
          />
          {label}
        </label>
      ))}
      {value && (
        <button type="button" className="gender-radio-clear" onClick={() => onChange('')}>
          Clear
        </button>
      )}
    </div>
  );
}

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState('');

  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

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

  const openEdit = (student) => {
    setEditForm({
      name: student.name || '',
      email: student.email || '',
      joinDate: student.joinDate || '',
      rate: student.rate !== undefined ? String(student.rate) : '',
      grade: student.grade || '',
      address: student.address || '',
      notes: student.notes || '',
      gender: student.gender || '',
      parentName: student.parentName || '',
      parentPhone: student.parentPhone || '',
      parentEmail: student.parentEmail || '',
    });
    setEditError('');
    setEditing(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((c) => ({ ...c, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSaving(true);
    try {
      const res = await updateStudent(selected.id, editForm);
      const updated = res.data.student;
      setStudents((c) => c.map((s) => (s.id === updated.id ? updated : s)));
      setSelected(updated);
      setEditing(false);
    } catch (err) {
      setEditError(err?.response?.data?.error || 'Unable to update student.');
    } finally {
      setEditSaving(false);
    }
  };

  const closeAdd = () => { setShowAdd(false); setAddError(''); setForm(EMPTY_FORM); };
  const closeDetail = () => { setSelected(null); setEditing(false); setEditError(''); };

  return (
    <div className="page">
      <div className="page-header students-page-header">
        <div>
          <h2>Students</h2>
          <p className="page-subtitle">Manage your tutoring roster and student details.</p>
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
                  <th>Grade</th>
                  <th>Gender</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td style={{ fontWeight: 500 }}>{student.name}</td>
                    <td style={{ color: 'var(--gray-600)' }}>{student.grade || '—'}</td>
                    <td><GenderBadge gender={student.gender} /></td>
                    <td style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>{formatDate(student.joinDate)}</td>
                    <td className="td-action" style={{ width: 200 }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <Link
                          to={`/attendance/student/${student.id}`}
                          className="btn-view-details"
                          style={{ textDecoration: 'none' }}
                        >
                          Attendance
                        </Link>
                        <button className="btn-view-details" onClick={() => setSelected(student)}>
                          Details
                        </button>
                      </div>
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
            <form style={{ display: 'contents' }} onSubmit={handleSubmit}>
              <div className="overlay-body">
                {addError && <div className="alert alert-error">{addError}</div>}
                <div className="student-form">
                  <div className="form-row">
                    <label htmlFor="s-name">Name *</label>
                    <input id="s-name" name="name" value={form.name} onChange={handleChange} placeholder="Full name" required />
                  </div>
                  <div className="form-row">
                    <label htmlFor="s-email">Student Email *</label>
                    <input id="s-email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="student@example.com" required />
                  </div>
                  <div className="form-row">
                    <label>Gender</label>
                    <GenderRadio value={form.gender} onChange={(v) => setForm((c) => ({ ...c, gender: v }))} />
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
                  <div className="form-section-label">Parent / Guardian</div>
                  <div className="form-row">
                    <label htmlFor="s-parentName">Parent Name</label>
                    <input id="s-parentName" name="parentName" value={form.parentName} onChange={handleChange} placeholder="Parent full name" />
                  </div>
                  <div className="form-row">
                    <label htmlFor="s-parentPhone">Parent Phone</label>
                    <input id="s-parentPhone" name="parentPhone" type="tel" value={form.parentPhone} onChange={handleChange} placeholder="e.g. (555) 123-4567" />
                  </div>
                  <div className="form-row">
                    <label htmlFor="s-parentEmail">Parent Email</label>
                    <input id="s-parentEmail" name="parentEmail" type="email" value={form.parentEmail} onChange={handleChange} placeholder="parent@example.com" />
                  </div>
                  <div className="form-row">
                    <label htmlFor="s-notes">Notes</label>
                    <textarea id="s-notes" name="notes" value={form.notes} onChange={handleChange} placeholder="Optional billing notes" rows="2" />
                  </div>
                </div>
              </div>
              <div className="overlay-footer">
                <button type="button" className="btn-secondary" onClick={closeAdd}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Detail / Edit Overlay */}
      {selected && (
        <div className="overlay-backdrop" onClick={closeDetail}>
          <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {selected.name}
                <GenderBadge gender={selected.gender} />
              </h3>
              <button className="overlay-close" type="button" onClick={closeDetail}>×</button>
            </div>

            {editing ? (
              <form style={{ display: 'contents' }} onSubmit={handleEditSubmit}>
                <div className="overlay-body">
                  {editError && <div className="alert alert-error">{editError}</div>}
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
                      <GenderRadio value={editForm.gender} onChange={(v) => setEditForm((c) => ({ ...c, gender: v }))} />
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
                      <label>Hourly rate ($)</label>
                      <input name="rate" type="number" min="0" step="0.01" value={editForm.rate} onChange={handleEditChange} />
                    </div>
                    <div className="form-section-label">Parent / Guardian</div>
                    <div className="form-row">
                      <label>Parent Name</label>
                      <input name="parentName" value={editForm.parentName} onChange={handleEditChange} placeholder="Parent full name" />
                    </div>
                    <div className="form-row">
                      <label>Parent Phone</label>
                      <input name="parentPhone" type="tel" value={editForm.parentPhone} onChange={handleEditChange} placeholder="e.g. (555) 123-4567" />
                    </div>
                    <div className="form-row">
                      <label>Parent Email</label>
                      <input name="parentEmail" type="email" value={editForm.parentEmail} onChange={handleEditChange} placeholder="parent@example.com" />
                    </div>
                    <div className="form-row">
                      <label>Notes</label>
                      <textarea name="notes" value={editForm.notes} onChange={handleEditChange} rows="2" />
                    </div>
                  </div>
                </div>
                <div className="overlay-footer">
                  <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={editSaving}>
                    {editSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="overlay-body">
                  <dl className="detail-list">
                    <div className="detail-row">
                      <dt>Student Email</dt>
                      <dd>{selected.email}</dd>
                    </div>
                    <div className="detail-row">
                      <dt>Gender</dt>
                      <dd>{selected.gender ? (selected.gender === 'male' ? 'Male' : 'Female') : '—'}</dd>
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
                      <dt>Hourly Rate</dt>
                      <dd>${Number(selected.rate).toFixed(2)} / hr</dd>
                    </div>
                    {(selected.parentName || selected.parentPhone || selected.parentEmail) && (
                      <>
                        <div className="detail-section-divider">Parent / Guardian</div>
                        {selected.parentName && (
                          <div className="detail-row">
                            <dt>Parent Name</dt>
                            <dd>{selected.parentName}</dd>
                          </div>
                        )}
                        {selected.parentPhone && (
                          <div className="detail-row">
                            <dt>Parent Phone</dt>
                            <dd><a href={`tel:${selected.parentPhone}`}>{selected.parentPhone}</a></dd>
                          </div>
                        )}
                        {selected.parentEmail && (
                          <div className="detail-row">
                            <dt>Parent Email</dt>
                            <dd><a href={`mailto:${selected.parentEmail}`}>{selected.parentEmail}</a></dd>
                          </div>
                        )}
                      </>
                    )}
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
                  <div style={{ marginTop: '1rem' }}>
                    <Link
                      to={`/attendance/student/${selected.id}`}
                      className="btn-view-details"
                      style={{ textDecoration: 'none', display: 'inline-block' }}
                      onClick={closeDetail}
                    >
                      View Attendance History →
                    </Link>
                  </div>
                </div>
                <div className="overlay-footer">
                  <button type="button" className="btn-danger" onClick={() => handleDelete(selected.id)}>
                    Remove
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => openEdit(selected)}>
                    Edit
                  </button>
                  <button type="button" className="btn-primary" onClick={closeDetail}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
