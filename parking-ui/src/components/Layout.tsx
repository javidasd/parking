import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { useTranslation } from '../i18n';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const { t, lang, setLang } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-page)' }}>
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <div style={styles.navBrand}>
            <div style={styles.brandWrap}>
              <span style={styles.brandIcon}>P</span>
            </div>
            <span style={styles.brandText}>ParkHub</span>
          </div>
          <div style={styles.navLinks}>
            <Link to="/" style={{ ...styles.link, ...(isActive('/') ? styles.linkActive : {}) }}>
              📅 {t('nav.calendar')}
              {isActive('/') && <div style={styles.linkDot} />}
            </Link>
            <Link to="/my-reservations" style={{ ...styles.link, ...(isActive('/my-reservations') ? styles.linkActive : {}) }}>
              📋 {t('nav.reservations')}
              {isActive('/my-reservations') && <div style={styles.linkDot} />}
            </Link>
            <Link to="/report" style={{ ...styles.link, ...(isActive('/report') ? styles.linkActive : {}) }}>
              📊 {t('nav.report')}
              {isActive('/report') && <div style={styles.linkDot} />}
            </Link>
            {isAdmin && (
              <Link to="/admin" style={{ ...styles.link, ...(isActive('/admin') ? styles.linkActive : {}) }}>
                ⚙️ {t('nav.admin')}
                {isActive('/admin') && <div style={styles.linkDot} />}
              </Link>
            )}
          </div>
          <div style={styles.navUser}>
            <button onClick={() => setIsDark(d => !d)} style={styles.themeBtn}>
              {isDark ? '☀️' : '🌙'}
            </button>
            <button onClick={() => setLang(lang === 'en' ? 'fa' : 'en')} style={styles.themeBtn}>
              {lang === 'en' ? 'FA' : 'EN'}
            </button>
            <div style={styles.userBadge}>
              <div style={styles.userAvatar}>{user?.fullName?.[0] ?? 'U'}</div>
              <div style={styles.userInfo}>
                <span style={styles.userName}>{user?.fullName}</span>
                <span style={styles.userRole}>{user?.role}</span>
              </div>
            </div>
            <button onClick={handleLogout} style={styles.logoutBtn}>🚪 {t('nav.logout')}</button>
          </div>
        </div>
      </nav>
      <main style={styles.main}>{children}</main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    background: 'var(--bg-nav)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid var(--border)',
    position: 'sticky', top: 0, zIndex: 100,
  },
  navInner: {
    maxWidth: 1280, margin: '0 auto', padding: '0 24px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    height: 64,
  },
  navBrand: { display: 'flex', alignItems: 'center', gap: 10 },
  brandWrap: {
    width: 34, height: 34, borderRadius: 8,
    background: '#4f6ef7',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, fontWeight: 800,
  },
  brandIcon: {},
  brandText: { fontSize: 18, fontWeight: 700, color: 'var(--text)' },
  navLinks: { display: 'flex', gap: 2 },
  link: {
    display: 'flex', alignItems: 'center', gap: 6, position: 'relative',
    color: 'var(--text-muted)', padding: '8px 14px', borderRadius: 8,
    fontSize: 13, fontWeight: 500,
    transition: 'all 0.2s',
  },
  linkActive: {
    background: 'var(--primary-light)', color: '#4f6ef7', fontWeight: 600,
  },
  linkDot: {
    position: 'absolute', bottom: 1, left: '50%',
    width: 5, height: 5, borderRadius: 3,
    background: '#4f6ef7',
    transform: 'translateX(-50%)',
  },
  navUser: { display: 'flex', alignItems: 'center', gap: 8 },
  themeBtn: {
    width: 34, height: 34, borderRadius: 8, fontSize: 12, fontWeight: 700,
    background: 'var(--bg-subtle)', border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
  },
  userBadge: { display: 'flex', alignItems: 'center', gap: 8 },
  userAvatar: {
    width: 32, height: 32, borderRadius: 8,
    background: '#4f6ef7',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700,
  },
  userInfo: { display: 'flex', flexDirection: 'column', gap: 1 },
  userName: { fontSize: 13, fontWeight: 600, color: 'var(--text)' },
  userRole: { fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 },
  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'transparent', border: '1px solid var(--border)',
    color: 'var(--text-secondary)', borderRadius: 8, padding: '6px 14px',
    cursor: 'pointer', fontSize: 13, fontWeight: 500,
  },
  main: { maxWidth: 1280, margin: '0 auto', padding: '24px 24px', width: '100%', flex: 1 },
};
