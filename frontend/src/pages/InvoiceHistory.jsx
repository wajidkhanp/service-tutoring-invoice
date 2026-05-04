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
  const [allInvoices, setAllInvoices] = useState([]);
  const [monthCombos, setMonthCombos] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [zipLoading, setZipLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [emailingId, setEmailingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getInvoices()
      .then((res) => {
        const all = res.data.invoices || [];
        setAllInvoices(all);

        const seen = new Set();
        const combos = [];
        for (const inv of all) {
          const key = `${inv.month}|${inv.year}`;
          if (!seen.has(key)) {
            seen.add(key);
            combos.push({ month: inv.month, year: String(inv.year) });
          }
        }
        combos.sort((a, b) => {
          const yearDiff = Number(b.year) - Number(a.year);
          if (yearDiff !== 0) return yearDiff;
          return MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month);
        });
        setMonthCombos(combos);

        const stateMonth = location.state?.month;
        const stateYear = location.state?.year?.toString();
        if (stateMonth && stateYear && seen.has(`${stateMonth}|${stateYear}`)) {
          setSelectedPeriod(`${stateMonth}|${stateYear}`);
        } else if (combos.length > 0) {
          setSelectedPeriod(`${combos[0].month}|${combos[0].year}`);
        }
      })
      .catch(() => setError('Unable to load invoices.'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const [month, year] = selectedPeriod ? selectedPeriod.split('|') : ['', ''];

  const filteredInvoices = useMemo(() => {
    if (!selectedPeriod) return [];
    return allInvoices.filter(
      (inv) => inv.month === month && String(inv.year) === year
    );
  }, [allInvoices, selectedPeriod, month, year]);

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
          <h3>Period</h3>
        </div>
        <div className="panel-body">
          <div className="invoice-grid">
            <div className="invoice-row">
              <label htmlFor="historyPeriod">Billing Period</label>
              {loading ? (
                <select disabled><option>Loading…</option></select>
              ) : monthCombos.length === 0 ? (
                <select disabled><option>No invoices yet</option></select>
              ) : (
                <select
                  id="historyPeriod"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                >
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
              <button className="btn-secondary btn-auto" type="button" onClick={handleDownloadZip} disabled={zipLoading}>
                {zipLoading ? 'Preparing ZIP…' : `Download ${month} ${year} ZIP`}
              </button>
              <button className="btn-secondary btn-auto" type="button" onClick={handleExportCsv} disabled={csvLoading}>
                {csvLoading ? 'Exporting…' : `Export ${month} ${year} CSV`}
              </button>
            </div>
          )}
          {successMsg && <div className="alert alert-success" style={{ marginTop: '1rem' }} onClick={() => setSuccessMsg('')}>{successMsg}</div>}
          {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div>}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Invoices{selectedPeriod ? ` — ${month} ${year}` : ''}</h3>
        </div>
        <div className="panel-body">
          {loading ? (
            <div className="loading-screen"><div className="spinner"></div></div>
          ) : monthCombos.length === 0 ? (
            <div className="info-block">No invoices have been generated yet.</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="info-block">No invoices found for {month} {year}.</div>
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
    </div>
  );
}
