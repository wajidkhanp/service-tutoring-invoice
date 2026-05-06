import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getMe, logout } from '../services/api';
import {
  LayoutDashboard, Sun, Users, ClipboardList,
  Receipt, Settings, HelpCircle, LogOut,
} from 'lucide-react';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getMe().then(res => setUser(res.data.user)).catch(() => {});
  }, []);

  const handleLogout = async () => {
    try { await logout(); } catch { /* ignore */ }
    setUser(null);
    navigate('/login');
  };

  const closeMenu = () => setMenuOpen(false);

  const navLink = (to, icon, label, end = false) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
      onClick={closeMenu}
    >
      {icon}
      <span className="nav-label">{label}</span>
    </NavLink>
  );

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-name">Noor Tutoring</span>
        <span className="brand-sub">Invoice Manager</span>
      </div>

      {/* Desktop nav links — becomes absolute dropdown on mobile */}
      <div className={`navbar-links${menuOpen ? ' open' : ''}`}>
        {navLink('/', <LayoutDashboard size={15}/>, 'Dashboard', true)}
        {navLink('/daily', <Sun size={15}/>, 'Daily')}
        {navLink('/students', <Users size={15}/>, 'Students')}
        {navLink('/report-cards', <ClipboardList size={15}/>, 'Reports')}
        {navLink('/invoices', <Receipt size={15}/>, 'Invoices')}
        {navLink('/settings', <Settings size={15}/>, 'Settings')}
        {navLink('/help', <HelpCircle size={15}/>, 'Help')}

        {/* Logout section — only visible inside the mobile dropdown */}
        {user && (
          <div className="nav-menu-logout">
            <div className="nav-menu-user">
              <span className="nav-menu-user-name">{user.name}</span>
              <span className="nav-menu-user-role">{user.role}</span>
            </div>
            <button className="nav-menu-logout-btn" onClick={handleLogout}>
              <LogOut size={15}/>
              Log out
            </button>
          </div>
        )}
      </div>

      {/* Right side: user info + logout (desktop only) + hamburger */}
      <div className="navbar-right">
        {user && (
          <div className="navbar-user">
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-last-login">{user.role}</span>
            </div>
            <button className="btn-logout" onClick={handleLogout}>
              <LogOut size={14} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }}/>
              Logout
            </button>
          </div>
        )}
        <button className="hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          )}
        </button>
      </div>
    </nav>
  );
}
