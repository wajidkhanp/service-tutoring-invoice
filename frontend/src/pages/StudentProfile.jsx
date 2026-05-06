import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays, TrendingUp, FileText, Sun,
  Phone, Mail, ChevronLeft,
} from 'lucide-react';
import { getStudents, createReportCard } from '../services/api';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatDate(iso) {
  if (!iso) return '—';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function GenderBadge({ gender }) {
  if (!gender) return null;
  return <span className={`gender-badge gender-badge-${gender}`}>{gender === 'male' ? 'Male' : 'Female'}</span>;
}

export default function StudentProfile() {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [rcLoading, setRcLoading] = useState(false);

  useEffect(() => {
    getStudents()
      .then((res) => {
        const found = (res.data.students || []).find((s) => s.id === studentId);
        setStudent(found || null);
      })
      .catch(() => setError('Unable to load student.'))
      .finally(() => setLoading(false));
  }, [studentId]);

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
      {/* Back link */}
      <Link to="/students" className="sp-back-link">
        <ChevronLeft size={15} />Students
      </Link>

      {/* Student header */}
      <div className="sp-hero">
        <div className="sp-avatar">{student.name.charAt(0).toUpperCase()}</div>
        <div className="sp-hero-info">
          <h2 className="sp-name">
            {student.name}
            <GenderBadge gender={student.gender} />
          </h2>
          {student.grade && <div className="sp-grade">{student.grade}</div>}
          {student.joinDate && (
            <div className="sp-joined">Joined {formatDate(student.joinDate)}</div>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Quick actions */}
      <div className="sp-actions-grid">
        <Link to={`/daily`} className="sp-action-card sp-action-daily">
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
        <button
          type="button"
          className="sp-action-card sp-action-report"
          onClick={openReportCard}
          disabled={rcLoading}
        >
          <FileText size={22} />
          <span className="sp-action-label">{rcLoading ? 'Opening…' : 'Report Card'}</span>
          <span className="sp-action-sub">This month's card</span>
        </button>
      </div>

      {/* Details panel */}
      <div className="panel sp-details-panel">
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
              <div className="detail-row">
                <dt>Address</dt>
                <dd>{student.address}</dd>
              </div>
            )}
            {student.notes && (
              <div className="detail-row">
                <dt>Notes</dt>
                <dd>{student.notes}</dd>
              </div>
            )}
            {(student.parentName || student.parentPhone || student.parentEmail) && (
              <>
                <div className="detail-section-divider">Parent / Guardian</div>
                {student.parentName && (
                  <div className="detail-row">
                    <dt>Name</dt>
                    <dd>{student.parentName}</dd>
                  </div>
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
      </div>
    </div>
  );
}
