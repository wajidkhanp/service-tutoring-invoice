import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStudents, getInvoices } from '../services/api';
import AuditFeed from '../components/AuditFeed';

export default function Dashboard() {
  const [studentCount, setStudentCount] = useState(null);
  const [invoiceCount, setInvoiceCount] = useState(null);

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  useEffect(() => {
    const now = new Date();
    const currentMonth = now.toLocaleString('en-US', { month: 'long' });
    const currentYear = String(now.getFullYear());

    getStudents()
      .then((res) => setStudentCount(res.data.students?.length || 0))
      .catch(() => setStudentCount(0));

    getInvoices({ month: currentMonth, year: currentYear })
      .then((res) => setInvoiceCount((res.data.invoices || []).length))
      .catch(() => setInvoiceCount(0));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p className="page-subtitle">Welcome back. Here is a summary of your tutoring invoices.</p>
        <p className="dashboard-date"><strong>{formattedDate}</strong></p>
      </div>

      <div className="stats-row stats-row-two">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-body">
            <div className="stat-value">{studentCount === null ? '—' : studentCount}</div>
            <div className="stat-label">Active Students</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📄</div>
          <div className="stat-body">
            <div className="stat-value">{invoiceCount === null ? '—' : invoiceCount}</div>
            <div className="stat-label">Invoices — {today.toLocaleString('en-US', { month: 'long' })} {today.getFullYear()}</div>
          </div>
        </div>
      </div>

      <div className="dashboard-panels">
        <div className="panel">
          <div className="panel-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="panel-body dashboard-actions">
            <Link to="/generate" className="btn-primary">Generate Invoice</Link>
            <Link to="/history" className="btn-secondary">View Invoice History</Link>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Recent Activity</h3>
          </div>
          <div className="panel-body">
            <AuditFeed />
          </div>
        </div>
      </div>
    </div>
  );
}
