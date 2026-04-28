import { useEffect, useState } from 'react';
import { getAuditRecent } from '../services/api';

function timeAgo(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

const EVENT_ICON = {
  invoice_generated: '📄',
  invoice_bulk: '📦',
  invoice_emailed: '✉️',
  'student:create': '➕',
  'student:update': '✏️',
  'student:delete': '🗑️',
  login: '🔐',
};

export default function AuditFeed() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    getAuditRecent().then((res) => setEvents((res.data.events || []).slice(0, 15))).catch(() => setEvents([]));
  }, []);

  return (
    <div className="audit-feed">
      {events.length === 0 ? (
        <div className="info-block">No recent activity yet.</div>
      ) : (
        <div className="audit-list">
          {events.map((event) => (
            <div key={event.id} className="audit-item">
              <div className="audit-icon">{EVENT_ICON[event.event] || 'ℹ️'}</div>
              <div>
                <div className="audit-description">{event.description}</div>
                <div className="audit-meta">{event.user} · {timeAgo(event.timestamp)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
