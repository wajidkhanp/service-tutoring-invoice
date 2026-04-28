import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getMe } from '../services/api';

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    getMe()
      .then(() => setStatus('ok'))
      .catch(() => setStatus('unauth'));
  }, []);

  if (status === 'loading') {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }
  if (status === 'unauth') return <Navigate to="/login" replace />;
  return children;
}
