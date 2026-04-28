import { useEffect, useMemo, useState } from 'react';
import { createInvoice, downloadInvoiceZip, generateAllInvoices, getInvoices, getStudents } from '../services/api';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const CURRENT_MONTH = MONTHS[new Date().getMonth()];
const CURRENT_YEAR = new Date().getFullYear().toString();
const YEAR_OPTIONS = [new Date().getFullYear(), new Date().getFullYear() + 1];

const EMPTY_INVOICE_FORM = {
  studentId: '',
  description: '',
  hours: '40',
  rate: '',
  dueDate: '',
  month: CURRENT_MONTH,
  year: CURRENT_YEAR,
  sendEmail: false,
};

export default function Generate() {
  const [students, setStudents] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [pageSuccess, setPageSuccess] = useState('');

  // Create Invoice overlay
  const [showCreate, setShowCreate] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState(EMPTY_INVOICE_FORM);
  const [createError, setCreateError] = useState('');
  const [saving, setSaving] = useState(false);

  // Generate All overlay
  const [showGenAll, setShowGenAll] = useState(false);
  const [bulkForm, setBulkForm] = useState({ month: CURRENT_MONTH, year: CURRENT_YEAR, sendEmail: false });
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState('');

  // Download ZIP overlay
  const [showZip, setShowZip] = useState(false);
  const [zipForm, setZipForm] = useState({ month: CURRENT_MONTH, year: CURRENT_YEAR });
  const [zipLoading, setZipLoading] = useState(false);
  const [zipError, setZipError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setPageError('');
      try {
        const [studentsRes, invoicesRes] = await Promise.all([getStudents(), getInvoices()]);
        setStudents(studentsRes.data.students || []);
        setInvoices(invoicesRes.data.invoices || []);
      } catch {
        setPageError('Unable to load data. Please refresh.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === invoiceForm.studentId),
    [students, invoiceForm.studentId]
  );

  const amount = useMemo(() => {
    const hours = Number(invoiceForm.hours) || 0;
    const rate = Number(invoiceForm.rate || selectedStudent?.rate || 0) || 0;
    return hours * rate;
  }, [invoiceForm.hours, invoiceForm.rate, selectedStudent]);

  const handleInvoiceChange = (e) => {
    const { name, value } = e.target;
    setInvoiceForm((c) => ({ ...c, [name]: value }));
  };

  const closeCreate = () => {
    setShowCreate(false);
    setCreateError('');
    setInvoiceForm(EMPTY_INVOICE_FORM);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');
    setSaving(true);
    try {
      const payload = {
        studentId: invoiceForm.studentId,
        studentName: selectedStudent?.name || '',
        description: invoiceForm.description,
        hours: invoiceForm.hours,
        rate: invoiceForm.rate || selectedStudent?.rate || 0,
        dueDate: invoiceForm.dueDate,
        month: invoiceForm.month,
        year: invoiceForm.year,
        sendEmail: invoiceForm.sendEmail && !!selectedStudent?.email,
      };
      const res = await createInvoice(payload);
      setInvoices((c) => [res.data.invoice, ...c]);
      closeCreate();
      const inv = res.data.invoice;
      let msg = `Invoice #${inv.invoiceNumber} created for ${inv.studentName}.`;
      if (res.data.emailSent) msg += ' Email sent.';
      else if (res.data.emailError) msg += ` Email failed: ${res.data.emailError}`;
      setPageSuccess(msg);
    } catch (err) {
      setCreateError(err?.response?.data?.error || 'Unable to create invoice.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAll = async () => {
    setBulkError('');
    setBulkLoading(true);
    try {
      const res = await generateAllInvoices({ month: bulkForm.month, year: bulkForm.year, sendEmail: bulkForm.sendEmail });
      const summary = res.data.summary;
      setShowGenAll(false);
      let msg = summary.created > 0
        ? `Created ${summary.created} invoice record${summary.created !== 1 ? 's' : ''} for ${bulkForm.month} ${bulkForm.year}.`
        : `All invoices already exist for ${bulkForm.month} ${bulkForm.year}.`;
      if (summary.emailed > 0) msg += ` ${summary.emailed} email${summary.emailed !== 1 ? 's' : ''} sent.`;
      if (summary.emailErrors?.length) msg += ` ${summary.emailErrors.length} email(s) failed.`;
      else msg += ' Use Download ZIP to get the PDFs.';
      setPageSuccess(msg);
      const inv = await getInvoices();
      setInvoices(inv.data.invoices || []);
    } catch (err) {
      setBulkError(err?.response?.data?.error || 'Unable to generate all invoices.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDownloadZip = async () => {
    setZipError('');
    setZipLoading(true);
    try {
      const res = await downloadInvoiceZip(zipForm.year, zipForm.month);
      const blob = new Blob([res.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoices_${zipForm.month}_${zipForm.year}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setShowZip(false);
    } catch {
      setZipError('No invoices found for that month, or the download failed.');
    } finally {
      setZipLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Invoices</h2>
        <p className="page-subtitle">Generate, manage, and download invoices for your students.</p>
      </div>

      {pageError && <div className="alert alert-error">{pageError}</div>}
      {pageSuccess && <div className="alert alert-success" onClick={() => setPageSuccess('')}>{pageSuccess}</div>}

      {/* Action cards */}
      <div className="action-cards">
        <div className="action-card">
          <div className="action-card-icon">📄</div>
          <div className="action-card-title">Generate All Invoices</div>
          <p className="action-card-desc">
            Automatically create and save PDF invoices for every active student for a chosen month. Students with existing invoices will have their PDFs regenerated.
          </p>
          <button className="btn-primary btn-auto" onClick={() => setShowGenAll(true)}>
            Generate All
          </button>
        </div>

        <div className="action-card">
          <div className="action-card-icon">🗜️</div>
          <div className="action-card-title">Download ZIP Archive</div>
          <p className="action-card-desc">
            Bundle all generated invoice PDFs for a selected month into a single ZIP file for easy sharing or record-keeping.
          </p>
          <button className="btn-secondary btn-auto" onClick={() => setShowZip(true)}>
            Download ZIP
          </button>
        </div>

        <div className="action-card">
          <div className="action-card-icon">✏️</div>
          <div className="action-card-title">Create Single Invoice</div>
          <p className="action-card-desc">
            Manually create a one-off invoice for a specific student with custom hours, hourly rate, and billing period.
          </p>
          <button className="btn-secondary btn-auto" onClick={() => setShowCreate(true)}>
            Create Invoice
          </button>
        </div>
      </div>

      {/* Recent invoices */}
      <div className="panel">
        <div className="panel-header">
          <h3>Recent invoices</h3>
        </div>
        <div className="panel-body">
          {loading ? (
            <div className="loading-screen"><div className="spinner"></div></div>
          ) : invoices.length === 0 ? (
            <div className="info-block">No invoices have been created yet.</div>
          ) : (
            <div className="invoice-list">
              {invoices.slice(0, 5).map((invoice) => (
                <div key={invoice.id} className="invoice-card">
                  <div>
                    <h4>Invoice #{invoice.invoiceNumber}</h4>
                    <p className="invoice-meta">{invoice.studentName}</p>
                    <p className="invoice-meta">{invoice.description}</p>
                    <p className="invoice-meta">Generated {formatDate(invoice.createdAt)}</p>
                  </div>
                  <div className="invoice-right">
                    <div className="invoice-amount">{formatCurrency(invoice.amount)}</div>
                    <div className="invoice-meta">{invoice.month} {invoice.year}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Generate All overlay */}
      {showGenAll && (
        <div className="overlay-backdrop" onClick={() => !bulkLoading && setShowGenAll(false)}>
          <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-header">
              <h3>Generate All Invoices</h3>
              <button className="overlay-close" type="button" onClick={() => setShowGenAll(false)} disabled={bulkLoading}>×</button>
            </div>
            <div className="overlay-body">
              {bulkError && <div className="alert alert-error">{bulkError}</div>}
              <p className="overlay-context">
                Creates invoices for all active students for the selected month. Students who already have an invoice will have their PDFs regenerated without creating duplicates.
              </p>
              <div className="form-row" style={{ marginTop: '1rem' }}>
                <label>Month</label>
                <select value={bulkForm.month} onChange={(e) => setBulkForm((c) => ({ ...c, month: e.target.value }))}>
                  {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Year</label>
                <select value={bulkForm.year} onChange={(e) => setBulkForm((c) => ({ ...c, year: e.target.value }))}>
                  {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <label className="checkbox-label" style={{ marginTop: '1rem' }}>
                <input
                  type="checkbox"
                  checked={bulkForm.sendEmail}
                  onChange={(e) => setBulkForm((c) => ({ ...c, sendEmail: e.target.checked }))}
                />
                <span>Send email to parents (students with email on file)</span>
              </label>
            </div>
            <div className="overlay-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowGenAll(false)} disabled={bulkLoading}>Cancel</button>
              <button type="button" className="btn-primary" onClick={handleGenerateAll} disabled={bulkLoading}>
                {bulkLoading ? 'Generating…' : `Generate ${bulkForm.month} ${bulkForm.year}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download ZIP overlay */}
      {showZip && (
        <div className="overlay-backdrop" onClick={() => !zipLoading && setShowZip(false)}>
          <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-header">
              <h3>Download ZIP Archive</h3>
              <button className="overlay-close" type="button" onClick={() => setShowZip(false)} disabled={zipLoading}>×</button>
            </div>
            <div className="overlay-body">
              {zipError && <div className="alert alert-error">{zipError}</div>}
              <p className="overlay-context">
                Downloads all invoice PDFs for the selected month as a single ZIP archive. Make sure invoices have been generated first.
              </p>
              <div className="form-row" style={{ marginTop: '1rem' }}>
                <label>Month</label>
                <select value={zipForm.month} onChange={(e) => setZipForm((c) => ({ ...c, month: e.target.value }))}>
                  {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Year</label>
                <select value={zipForm.year} onChange={(e) => setZipForm((c) => ({ ...c, year: e.target.value }))}>
                  {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="overlay-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowZip(false)} disabled={zipLoading}>Cancel</button>
              <button type="button" className="btn-primary" onClick={handleDownloadZip} disabled={zipLoading}>
                {zipLoading ? 'Preparing ZIP…' : `Download ${zipForm.month} ${zipForm.year}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice overlay */}
      {showCreate && (
        <div className="overlay-backdrop" onClick={() => !saving && closeCreate()}>
          <div className="overlay-card overlay-card-wide" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-header">
              <h3>Create Invoice</h3>
              <button className="overlay-close" type="button" onClick={closeCreate} disabled={saving}>×</button>
            </div>
            <div className="overlay-body">
              {createError && <div className="alert alert-error">{createError}</div>}
              <form id="create-invoice-form" className="invoice-form" onSubmit={handleCreateSubmit}>
                <div className="invoice-row">
                  <label htmlFor="i-studentId">Student</label>
                  <select id="i-studentId" name="studentId" value={invoiceForm.studentId} onChange={handleInvoiceChange} required>
                    <option value="">Select a student</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} — {s.email}</option>
                    ))}
                  </select>
                </div>
                <div className="invoice-grid">
                  <div className="invoice-row">
                    <label htmlFor="i-month">Month</label>
                    <select id="i-month" name="month" value={invoiceForm.month} onChange={handleInvoiceChange} required>
                      {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="invoice-row">
                    <label htmlFor="i-year">Year</label>
                    <select id="i-year" name="year" value={invoiceForm.year} onChange={handleInvoiceChange} required>
                      {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="invoice-row">
                    <label htmlFor="i-dueDate">Due date</label>
                    <input id="i-dueDate" name="dueDate" type="date" value={invoiceForm.dueDate} onChange={handleInvoiceChange} />
                  </div>
                </div>
                <div className="invoice-row">
                  <label htmlFor="i-description">Description</label>
                  <textarea
                    id="i-description"
                    name="description"
                    value={invoiceForm.description}
                    onChange={handleInvoiceChange}
                    rows="3"
                    placeholder="e.g. 4 weeks of tutoring, algebra and test prep"
                    required
                  />
                </div>
                <div className="invoice-grid">
                  <div className="invoice-row">
                    <label htmlFor="i-hours">Hours</label>
                    <input id="i-hours" name="hours" type="number" min="0.25" step="0.25" value={invoiceForm.hours} onChange={handleInvoiceChange} required />
                  </div>
                  <div className="invoice-row">
                    <label htmlFor="i-rate">Hourly rate ($)</label>
                    <input
                      id="i-rate"
                      name="rate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={invoiceForm.rate}
                      onChange={handleInvoiceChange}
                      placeholder={selectedStudent ? selectedStudent.rate : '0.00'}
                      required
                    />
                  </div>
                </div>
                <div className="invoice-summary">
                  <span>Total amount</span>
                  <strong>{formatCurrency(amount)}</strong>
                </div>
                <label className={`checkbox-label${!selectedStudent?.email ? ' checkbox-disabled' : ''}`} style={{ marginTop: '0.75rem' }}>
                  <input
                    type="checkbox"
                    checked={invoiceForm.sendEmail}
                    onChange={(e) => setInvoiceForm((c) => ({ ...c, sendEmail: e.target.checked }))}
                    disabled={!selectedStudent?.email}
                  />
                  <span>Send email to parent</span>
                  {!selectedStudent?.email && <span className="email-unavailable"> (no email on file)</span>}
                </label>
              </form>
            </div>
            <div className="overlay-footer">
              <button type="button" className="btn-secondary" onClick={closeCreate} disabled={saving}>Cancel</button>
              <button type="submit" form="create-invoice-form" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
