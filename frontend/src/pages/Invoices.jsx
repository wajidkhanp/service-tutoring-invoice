import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createInvoice, downloadInvoiceZip, emailInvoice, exportCsv, generateAllInvoices, getInvoices, getStudents } from '../services/api';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const CURRENT_MONTH = MONTHS[new Date().getMonth()];
const CURRENT_YEAR = new Date().getFullYear().toString();
const YEAR_OPTIONS = [new Date().getFullYear(), new Date().getFullYear() - 1];

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getValidMonths(selectedYear) {
  const now = new Date();
  if (Number(selectedYear) < now.getFullYear()) return MONTHS;
  return MONTHS.slice(0, now.getMonth() + 1);
}

function clampMonth(month, selectedYear) {
  const valid = getValidMonths(selectedYear);
  return valid.includes(month) ? month : valid[valid.length - 1];
}

const EMPTY_INVOICE_FORM = {
  studentId: '', description: '', hours: '40', rate: '',
  dueDate: '', month: CURRENT_MONTH, year: CURRENT_YEAR, sendEmail: false,
};

export default function Invoices() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'history' ? 'history' : 'generate';

  const setTab = (t) => setSearchParams(t === 'generate' ? {} : { tab: t }, { replace: true });

  // Shared data
  const [students, setStudents] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [pageSuccess, setPageSuccess] = useState('');

  // Generate tab — overlays
  const [showCreate, setShowCreate] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState(EMPTY_INVOICE_FORM);
  const [createError, setCreateError] = useState('');
  const [saving, setSaving] = useState(false);

  const [showGenAll, setShowGenAll] = useState(false);
  const [bulkForm, setBulkForm] = useState({ month: CURRENT_MONTH, year: CURRENT_YEAR, sendEmail: false });
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState('');

  const [showZip, setShowZip] = useState(false);
  const [zipForm, setZipForm] = useState({ month: CURRENT_MONTH, year: CURRENT_YEAR });
  const [zipLoading, setZipLoading] = useState(false);
  const [zipError, setZipError] = useState('');

  // History tab
  const [monthCombos, setMonthCombos] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [histZipLoading, setHistZipLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [emailingId, setEmailingId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setPageError('');
    try {
      const [studentsRes, invoicesRes] = await Promise.all([getStudents(), getInvoices()]);
      setStudents(studentsRes.data.students || []);
      const all = invoicesRes.data.invoices || [];
      setAllInvoices(all);

      const seen = new Set();
      const combos = [];
      for (const inv of all) {
        const key = `${inv.month}|${inv.year}`;
        if (!seen.has(key)) { seen.add(key); combos.push({ month: inv.month, year: String(inv.year) }); }
      }
      combos.sort((a, b) => {
        const yd = Number(b.year) - Number(a.year);
        return yd !== 0 ? yd : MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month);
      });
      setMonthCombos(combos);
      if (combos.length > 0 && !selectedPeriod) {
        setSelectedPeriod(`${combos[0].month}|${combos[0].year}`);
      }
    } catch {
      setPageError('Unable to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === invoiceForm.studentId),
    [students, invoiceForm.studentId]
  );

  const amount = useMemo(() => {
    const hours = Number(invoiceForm.hours) || 0;
    const rate = Number(invoiceForm.rate || selectedStudent?.rate || 0) || 0;
    return hours * rate;
  }, [invoiceForm.hours, invoiceForm.rate, selectedStudent]);

  const [histMonth, histYear] = selectedPeriod ? selectedPeriod.split('|') : ['', ''];

  const filteredInvoices = useMemo(() => {
    if (!selectedPeriod) return [];
    return allInvoices.filter((inv) => inv.month === histMonth && String(inv.year) === histYear);
  }, [allInvoices, selectedPeriod, histMonth, histYear]);

  // ── Generate tab handlers ─────────────────────────────────

  const closeCreate = () => { setShowCreate(false); setCreateError(''); setInvoiceForm(EMPTY_INVOICE_FORM); };

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
      const inv = res.data.invoice;
      setAllInvoices((c) => [inv, ...c]);
      closeCreate();
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
        ? `Created ${summary.created} invoice${summary.created !== 1 ? 's' : ''} for ${bulkForm.month} ${bulkForm.year}.`
        : `All invoices already exist for ${bulkForm.month} ${bulkForm.year}.`;
      if (summary.emailed > 0) msg += ` ${summary.emailed} email${summary.emailed !== 1 ? 's' : ''} sent.`;
      setPageSuccess(msg);
      await loadData();
      const newPeriod = `${bulkForm.month}|${bulkForm.year}`;
      setSelectedPeriod(newPeriod);
      setTab('history');
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
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
      setShowZip(false);
    } catch {
      setZipError('No invoices found for that month, or the download failed.');
    } finally {
      setZipLoading(false);
    }
  };

  // ── History tab handlers ──────────────────────────────────

  const handleHistDownloadZip = async () => {
    setHistZipLoading(true);
    setPageError('');
    try {
      const res = await downloadInvoiceZip(histYear, histMonth);
      const blob = new Blob([res.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoices_${histMonth}_${histYear}.zip`;
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setPageError('Unable to download ZIP. Make sure invoices exist for this month.');
    } finally {
      setHistZipLoading(false);
    }
  };

  const handleExportCsv = async () => {
    setCsvLoading(true);
    setPageError('');
    try {
      const res = await exportCsv({ month: histMonth, year: histYear });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoices_${histMonth}_${histYear}.csv`;
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setPageError('Unable to export CSV.');
    } finally {
      setCsvLoading(false);
    }
  };

  const handleSendEmail = async (invoice) => {
    setEmailingId(invoice.invoiceNumber);
    setPageError('');
    setPageSuccess('');
    try {
      await emailInvoice(invoice.invoiceNumber);
      setPageSuccess(`Email sent for Invoice #${invoice.invoiceNumber} — ${invoice.studentName}.`);
    } catch (err) {
      setPageError(err?.response?.data?.error || `Unable to send email for Invoice #${invoice.invoiceNumber}.`);
    } finally {
      setEmailingId(null);
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

      {/* Tabs */}
      <div className="inv-tabs">
        <button
          className={`inv-tab${tab === 'generate' ? ' inv-tab-active' : ''}`}
          onClick={() => setTab('generate')}
        >
          Generate
        </button>
        <button
          className={`inv-tab${tab === 'history' ? ' inv-tab-active' : ''}`}
          onClick={() => setTab('history')}
        >
          History
        </button>
      </div>

      {/* ── Generate tab ───────────────────────────────────── */}
      {tab === 'generate' && (
        <>
          <div className="action-cards">
            <div className="action-card">
              <div className="action-card-icon">📄</div>
              <div className="action-card-title">Generate All Invoices</div>
              <p className="action-card-desc">
                Automatically create and save PDF invoices for every active student for a chosen month.
              </p>
              <button className="btn-primary btn-auto" onClick={() => setShowGenAll(true)}>
                Generate All
              </button>
            </div>
            <div className="action-card">
              <div className="action-card-icon">🗜️</div>
              <div className="action-card-title">Download ZIP Archive</div>
              <p className="action-card-desc">
                Bundle all invoice PDFs for a selected month into a single ZIP file for easy sharing.
              </p>
              <button className="btn-secondary btn-auto" onClick={() => setShowZip(true)}>
                Download ZIP
              </button>
            </div>
            <div className="action-card">
              <div className="action-card-icon">✏️</div>
              <div className="action-card-title">Create Single Invoice</div>
              <p className="action-card-desc">
                Manually create a one-off invoice for a specific student with custom hours and rate.
              </p>
              <button className="btn-secondary btn-auto" onClick={() => setShowCreate(true)}>
                Create Invoice
              </button>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header"><h3>Recent invoices</h3></div>
            <div className="panel-body">
              {loading ? (
                <div className="loading-screen"><div className="spinner"></div></div>
              ) : allInvoices.length === 0 ? (
                <div className="info-block">No invoices have been created yet.</div>
              ) : (
                <div className="invoice-list">
                  {allInvoices.slice(0, 5).map((invoice) => (
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
        </>
      )}

      {/* ── History tab ────────────────────────────────────── */}
      {tab === 'history' && (
        <>
          <div className="panel">
            <div className="panel-header"><h3>Billing Period</h3></div>
            <div className="panel-body">
              <div className="invoice-grid">
                <div className="invoice-row">
                  <label htmlFor="historyPeriod">Period</label>
                  {loading ? (
                    <select disabled><option>Loading…</option></select>
                  ) : monthCombos.length === 0 ? (
                    <select disabled><option>No invoices yet</option></select>
                  ) : (
                    <select id="historyPeriod" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
                      {monthCombos.map((c) => (
                        <option key={`${c.month}|${c.year}`} value={`${c.month}|${c.year}`}>
                          {c.month} {c.year}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              {selectedPeriod && (
                <div className="history-actions">
                  <button className="btn-secondary btn-auto" type="button" onClick={handleHistDownloadZip} disabled={histZipLoading}>
                    {histZipLoading ? 'Preparing…' : `ZIP — ${histMonth} ${histYear}`}
                  </button>
                  <button className="btn-secondary btn-auto" type="button" onClick={handleExportCsv} disabled={csvLoading}>
                    {csvLoading ? 'Exporting…' : `CSV — ${histMonth} ${histYear}`}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>Invoices{selectedPeriod ? ` — ${histMonth} ${histYear}` : ''}</h3>
            </div>
            <div className="panel-body">
              {loading ? (
                <div className="loading-screen"><div className="spinner"></div></div>
              ) : monthCombos.length === 0 ? (
                <div className="info-block">No invoices have been generated yet.</div>
              ) : filteredInvoices.length === 0 ? (
                <div className="info-block">No invoices found for {histMonth} {histYear}.</div>
              ) : (
                <div className="invoice-list">
                  {filteredInvoices.map((invoice) => (
                    <div key={invoice.id} className="invoice-card">
                      <div>
                        <h4>Invoice #{invoice.invoiceNumber}</h4>
                        <p className="invoice-meta">{invoice.studentName}</p>
                        <p className="invoice-meta">{invoice.description}</p>
                        <p className="invoice-meta">{invoice.month} {invoice.year}</p>
                      </div>
                      <div className="invoice-right">
                        <div className="invoice-amount">{formatCurrency(invoice.amount)}</div>
                        <div className="invoice-meta">{invoice.status}</div>
                        <div className="invoice-card-actions">
                          <a href={`/api/invoices/${invoice.invoiceNumber}/download`} className="btn-secondary btn-auto">Download</a>
                          <button
                            type="button"
                            className="btn-email btn-auto"
                            onClick={() => handleSendEmail(invoice)}
                            disabled={emailingId === invoice.invoiceNumber}
                          >
                            {emailingId === invoice.invoiceNumber ? 'Sending…' : 'Send Email'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Generate All overlay ──────────────────────────── */}
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
                Creates invoices for all active students for the selected month. Existing invoices will have their PDFs regenerated without duplicates.
              </p>
              <div className="form-row" style={{ marginTop: '1rem' }}>
                <label>Month</label>
                <select value={bulkForm.month} onChange={(e) => setBulkForm((c) => ({ ...c, month: e.target.value }))}>
                  {getValidMonths(bulkForm.year).map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Year</label>
                <select value={bulkForm.year} onChange={(e) => {
                  const y = e.target.value;
                  setBulkForm((c) => ({ ...c, year: y, month: clampMonth(c.month, y) }));
                }}>
                  {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <label className="checkbox-label" style={{ marginTop: '1rem' }}>
                <input type="checkbox" checked={bulkForm.sendEmail} onChange={(e) => setBulkForm((c) => ({ ...c, sendEmail: e.target.checked }))} />
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

      {/* ── Download ZIP overlay ─────────────────────────── */}
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
                Downloads all invoice PDFs for the selected month as a single ZIP archive.
              </p>
              <div className="form-row" style={{ marginTop: '1rem' }}>
                <label>Month</label>
                <select value={zipForm.month} onChange={(e) => setZipForm((c) => ({ ...c, month: e.target.value }))}>
                  {getValidMonths(zipForm.year).map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Year</label>
                <select value={zipForm.year} onChange={(e) => {
                  const y = e.target.value;
                  setZipForm((c) => ({ ...c, year: y, month: clampMonth(c.month, y) }));
                }}>
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

      {/* ── Create Invoice overlay ───────────────────────── */}
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
                  <select id="i-studentId" name="studentId" value={invoiceForm.studentId}
                    onChange={(e) => setInvoiceForm((c) => ({ ...c, studentId: e.target.value }))} required>
                    <option value="">Select a student</option>
                    {students.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.email}</option>)}
                  </select>
                </div>
                <div className="invoice-grid">
                  <div className="invoice-row">
                    <label htmlFor="i-month">Month</label>
                    <select id="i-month" name="month" value={invoiceForm.month}
                      onChange={(e) => setInvoiceForm((c) => ({ ...c, month: e.target.value }))} required>
                      {getValidMonths(invoiceForm.year).map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="invoice-row">
                    <label htmlFor="i-year">Year</label>
                    <select id="i-year" name="year" value={invoiceForm.year} onChange={(e) => {
                      const y = e.target.value;
                      setInvoiceForm((c) => ({ ...c, year: y, month: clampMonth(c.month, y) }));
                    }} required>
                      {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="invoice-row">
                    <label htmlFor="i-dueDate">Due date</label>
                    <input id="i-dueDate" name="dueDate" type="date" value={invoiceForm.dueDate}
                      onChange={(e) => setInvoiceForm((c) => ({ ...c, dueDate: e.target.value }))} />
                  </div>
                </div>
                <div className="invoice-row">
                  <label htmlFor="i-description">Description</label>
                  <textarea id="i-description" name="description" value={invoiceForm.description}
                    onChange={(e) => setInvoiceForm((c) => ({ ...c, description: e.target.value }))}
                    rows="3" placeholder="e.g. 4 weeks of tutoring, algebra and test prep" required />
                </div>
                <div className="invoice-grid">
                  <div className="invoice-row">
                    <label htmlFor="i-hours">Hours</label>
                    <input id="i-hours" name="hours" type="number" min="0.25" step="0.25" value={invoiceForm.hours}
                      onChange={(e) => setInvoiceForm((c) => ({ ...c, hours: e.target.value }))} required />
                  </div>
                  <div className="invoice-row">
                    <label htmlFor="i-rate">Hourly rate ($)</label>
                    <input id="i-rate" name="rate" type="number" min="0" step="0.01" value={invoiceForm.rate}
                      onChange={(e) => setInvoiceForm((c) => ({ ...c, rate: e.target.value }))}
                      placeholder={selectedStudent ? selectedStudent.rate : '0.00'} required />
                  </div>
                </div>
                <div className="invoice-summary">
                  <span>Total amount</span>
                  <strong>{formatCurrency(amount)}</strong>
                </div>
                <label className={`checkbox-label${!selectedStudent?.email ? ' checkbox-disabled' : ''}`} style={{ marginTop: '0.75rem' }}>
                  <input type="checkbox" checked={invoiceForm.sendEmail}
                    onChange={(e) => setInvoiceForm((c) => ({ ...c, sendEmail: e.target.checked }))}
                    disabled={!selectedStudent?.email} />
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
