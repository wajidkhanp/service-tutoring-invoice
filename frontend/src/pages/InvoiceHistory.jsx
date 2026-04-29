import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { downloadInvoiceZip, emailInvoice, exportCsv, getInvoices } from '../services/api';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export default function InvoiceHistory() {
  const location = useLocation();
  const [month, setMonth] = useState(location.state?.month || MONTHS[new Date().getMonth()]);
  const [year, setYear] = useState(location.state?.year?.toString() || new Date().getFullYear().toString());
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [zipLoading, setZipLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [emailingId, setEmailingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const years = useMemo(() => [new Date().getFullYear(), new Date().getFullYear() - 1], []);

  const loadInvoices = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getInvoices({ month, year });
      setInvoices(res.data.invoices || []);
    } catch {
      setError('Unable to load invoices for the selected period.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, location.key]);

  const handleDownloadZip = async () => {
    setZipLoading(true);
    setError('');
    try {
      const res = await downloadInvoiceZip(year, month);
      const blob = new Blob([res.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoices_${month}_${year}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Unable to download ZIP. Please make sure invoices exist for this month.');
    } finally {
      setZipLoading(false);
    }
  };

  const handleExportCsv = async () => {
    setCsvLoading(true);
    setError('');
    try {
      const res = await exportCsv({ month, year });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoices_${month}_${year}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Unable to export CSV.');
    } finally {
      setCsvLoading(false);
    }
  };

  const handleSendEmail = async (invoice) => {
    setEmailingId(invoice.invoiceNumber);
    setError('');
    setSuccessMsg('');
    try {
      await emailInvoice(invoice.invoiceNumber);
      setSuccessMsg(`Email sent for Invoice #${invoice.invoiceNumber} — ${invoice.studentName}.`);
    } catch (err) {
      setError(err?.response?.data?.error || `Unable to send email for Invoice #${invoice.invoiceNumber}.`);
    } finally {
      setEmailingId(null);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Invoice History</h2>
        <p className="page-subtitle">Browse generated invoices by month and download ZIP archives.</p>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Filters</h3>
        </div>
        <div className="panel-body">
          <div className="invoice-grid">
            <div className="invoice-row">
              <label htmlFor="historyMonth">Month</label>
              <select id="historyMonth" value={month} onChange={(e) => setMonth(e.target.value)}>
                {MONTHS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="invoice-row">
              <label htmlFor="historyYear">Year</label>
              <select id="historyYear" value={year} onChange={(e) => setYear(e.target.value)}>
                {years.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="invoice-row" style={{ alignSelf: 'end' }}>
              <button className="btn-primary" type="button" onClick={loadInvoices} disabled={loading}>
                {loading ? 'Loading…' : 'Refresh'}
              </button>
            </div>
          </div>
          <div className="history-actions">
            <button className="btn-secondary btn-auto" type="button" onClick={handleDownloadZip} disabled={zipLoading}>
              {zipLoading ? 'Preparing ZIP…' : `Download ${month} ${year} ZIP`}
            </button>
            <button className="btn-secondary btn-auto" type="button" onClick={handleExportCsv} disabled={csvLoading}>
              {csvLoading ? 'Exporting…' : `Export ${month} ${year} CSV`}
            </button>
          </div>
          {successMsg && <div className="alert alert-success" style={{ marginTop: '1rem' }} onClick={() => setSuccessMsg('')}>{successMsg}</div>}
          {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div>}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Invoices</h3>
        </div>
        <div className="panel-body">
          {loading ? (
            <div className="loading-screen"><div className="spinner"></div></div>
          ) : invoices.length === 0 ? (
            <div className="info-block">No invoices found for {month} {year}.</div>
          ) : (
            <div className="invoice-list">
              {invoices.map((invoice) => (
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
    </div>
  );
}
