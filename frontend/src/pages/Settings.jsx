import { useEffect, useRef, useState } from 'react';
import { deleteSignature, getSettings, updateSettings, uploadSignature } from '../services/api';

const FIELDS = [
  { name: 'organizationName', label: 'Organization Name', type: 'text' },
  { name: 'address',          label: 'Address',           type: 'text' },
  { name: 'phone',            label: 'Phone',             type: 'text' },
  { name: 'orgEmail',         label: 'Email',             type: 'email' },
  { name: 'ein',              label: 'EIN',               type: 'text' },
  { name: 'representative',   label: 'Representative',    type: 'text' },
];

const EMPTY = { organizationName: '', address: '', phone: '', orgEmail: '', ein: '', representative: '' };

export default function Settings() {
  const [saved, setSaved] = useState(EMPTY);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [sigPreview, setSigPreview] = useState(null);
  const [sigFile, setSigFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sigSaving, setSigSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const [sigCacheBust, setSigCacheBust] = useState(Date.now());

  useEffect(() => {
    getSettings()
      .then((res) => {
        const c = res.data.config;
        const values = {
          organizationName: c.organizationName || '',
          address: c.address || '',
          phone: c.phone || '',
          orgEmail: c.orgEmail || '',
          ein: c.ein || '',
          representative: c.representative || '',
        };
        setSaved(values);
        setForm(values);
        setHasSignature(res.data.hasSignature);
      })
      .catch(() => setError('Unable to load settings.'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((c) => ({ ...c, [name]: value }));
  };

  const handleEdit = () => {
    setForm(saved);
    setEditing(true);
    setSuccess('');
    setError('');
  };

  const handleCancel = () => {
    setForm(saved);
    setEditing(false);
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      await updateSettings(form);
      setSaved(form);
      setEditing(false);
      setSuccess('Settings saved.');
    } catch {
      setError('Unable to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSigFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setSigPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleUploadSignature = async () => {
    if (!sigFile) return;
    setSigSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('signature', sigFile);
      await uploadSignature(fd);
      setHasSignature(true);
      setSigPreview(null);
      setSigFile(null);
      setSigCacheBust(Date.now());
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSuccess('Signature uploaded.');
    } catch {
      setError('Unable to upload signature.');
    } finally {
      setSigSaving(false);
    }
  };

  const handleDeleteSignature = async () => {
    if (!window.confirm('Remove the signature from invoices?')) return;
    setSigSaving(true);
    try {
      await deleteSignature();
      setHasSignature(false);
      setSigPreview(null);
      setSigFile(null);
      setSigCacheBust(Date.now());
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSuccess('Signature removed.');
    } catch {
      setError('Unable to remove signature.');
    } finally {
      setSigSaving(false);
    }
  };

  if (loading) {
    return <div className="page"><div className="loading-screen"><div className="spinner"></div></div></div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Settings</h2>
        <p className="page-subtitle">Manage your organization details and invoice signature.</p>
      </div>

      {success && <div className="alert alert-success" onClick={() => setSuccess('')}>{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="settings-grid">
        <div className="panel">
          <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3>Organization Information</h3>
            {!editing && (
              <button type="button" className="btn-view-details" onClick={handleEdit}>Edit</button>
            )}
          </div>
          <div className="panel-body">
            {editing ? (
              <form onSubmit={handleSave} className="settings-form">
                <div className="form-row">
                  <label>Organization Name</label>
                  <input name="organizationName" value={form.organizationName} onChange={handleChange} />
                </div>
                <div className="form-row">
                  <label>Address</label>
                  <input name="address" value={form.address} onChange={handleChange} />
                </div>
                <div className="settings-form-row-2">
                  <div className="form-row">
                    <label>Phone</label>
                    <input name="phone" value={form.phone} onChange={handleChange} />
                  </div>
                  <div className="form-row">
                    <label>Email</label>
                    <input name="orgEmail" type="email" value={form.orgEmail} onChange={handleChange} />
                  </div>
                </div>
                <div className="settings-form-row-2">
                  <div className="form-row">
                    <label>EIN</label>
                    <input name="ein" value={form.ein} onChange={handleChange} />
                  </div>
                  <div className="form-row">
                    <label>Representative</label>
                    <input name="representative" value={form.representative} onChange={handleChange} />
                  </div>
                </div>
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem' }}>
                  <button type="submit" className="btn-primary btn-auto" disabled={saving}>
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button type="button" className="btn-secondary btn-auto" onClick={handleCancel} disabled={saving}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <dl className="detail-list detail-list-wide">
                {FIELDS.map(({ name, label }) => (
                  <div key={name} className="detail-row">
                    <dt>{label}</dt>
                    <dd>{saved[name] || <span style={{ color: 'var(--gray-400)' }}>—</span>}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><h3>Invoice Signature</h3></div>
          <div className="panel-body">
            <p className="overlay-context" style={{ marginBottom: '1rem' }}>
              Upload a PNG or JPEG signature image to appear on generated invoices. Recommended size: 300×100 px.
            </p>

            {(hasSignature && !sigPreview) && (
              <div className="sig-preview-block">
                <p className="sig-label">Current signature</p>
                <img
                  src={`/api/settings/signature?t=${sigCacheBust}`}
                  alt="Current signature"
                  className="sig-preview-img"
                />
                <button
                  type="button"
                  className="btn-danger btn-auto"
                  style={{ marginTop: '0.75rem' }}
                  onClick={handleDeleteSignature}
                  disabled={sigSaving}
                >
                  Remove Signature
                </button>
              </div>
            )}

            {sigPreview && (
              <div className="sig-preview-block">
                <p className="sig-label">Preview</p>
                <img src={sigPreview} alt="Signature preview" className="sig-preview-img" />
              </div>
            )}

            <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <label className="btn-secondary btn-auto" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                Choose File
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </label>
              {sigFile && (
                <button
                  type="button"
                  className="btn-primary btn-auto"
                  onClick={handleUploadSignature}
                  disabled={sigSaving}
                >
                  {sigSaving ? 'Uploading…' : 'Upload Signature'}
                </button>
              )}
            </div>
            {sigFile && <p className="sig-label" style={{ marginTop: '0.5rem' }}>{sigFile.name}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
