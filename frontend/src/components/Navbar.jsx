import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getMe, logout } from '../services/api';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getMe().then(res => setUser(res.data.user)).catch(() => {});
  }, []);

  const handleLogout = async () => {
    try { await logout(); } catch { /* ignore */ }
    setUser(null);
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-name">Noor Tutoring</span>
        <span className="brand-sub">Invoice Manager</span>
      </div>

      <div className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Dashboard</NavLink>
        <NavLink to="/students" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Students</NavLink>
        <NavLink to="/generate" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Generate</NavLink>
        <NavLink to="/history" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>History</NavLink>
        <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Settings</NavLink>
        <NavLink to="/help" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Help</NavLink>
      </div>

      {user && (
        <div className="navbar-user">
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <span className="user-last-login">{user.role}</span>
          </div>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      )}
    </nav>
  );
}
