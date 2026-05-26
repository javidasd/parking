import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { useTranslation } from '../i18n';
import { api } from '../api';
import { useIsMobile } from '../hooks/useMediaQuery';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const { t, lang, setLang } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [pwdMsg, setPwdMsg] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPwdMsg('');
    const form = new FormData(e.currentTarget);
    const pwd = form.get('password') as string;
    const confirm = form.get('confirm') as string;
    if (pwd !== confirm) { setPwdMsg('Passwords do not match'); return; }
    if (pwd.length < 4) { setPwdMsg('Password too short'); return; }
    try {
      const token = localStorage.getItem('token');
      if (!token) { setPwdMsg('Not authenticated'); return; }
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = parseInt(payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']);
      await api.users.update(userId, { password: pwd });
      setPwdMsg('Password changed');
      setTimeout(() => { setShowPwdForm(false); setPwdMsg(''); }, 1500);
    } catch { setPwdMsg('Failed to change password'); }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMenu = () => setMenuOpen(false);

  const isActive = (path: string) => location.pathname === path;

  const linkClass = (path: string) => ({
    ...styles.link,
    ...(isActive(path) ? styles.linkActive : {}),
    ...(isMobile ? { width: '100%' } : {}),
  });

  const navLinkItems = (
    <>
      <Link to="/" onClick={closeMenu} style={linkClass('/')}>
        📅 {t('nav.calendar')}
        {isActive('/') && <div style={styles.linkDot} />}
      </Link>
      <Link to="/my-reservations" onClick={closeMenu} style={linkClass('/my-reservations')}>
        📋 {t('nav.reservations')}
        {isActive('/my-reservations') && <div style={styles.linkDot} />}
      </Link>
      <Link to="/report" onClick={closeMenu} style={linkClass('/report')}>
        📊 {t('nav.report')}
        {isActive('/report') && <div style={styles.linkDot} />}
      </Link>
      {isAdmin && (
        <Link to="/admin" onClick={closeMenu} style={linkClass('/admin')}>
          ⚙️ {t('nav.admin')}
          {isActive('/admin') && <div style={styles.linkDot} />}
        </Link>
      )}
    </>
  );

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

          {isMobile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => setIsDark(d => !d)} style={styles.themeBtn}>
                {isDark ? '☀️' : '🌙'}
              </button>
              <div style={styles.userAvatar}>{user?.fullName?.[0] ?? 'U'}</div>
              <button onClick={() => setMenuOpen(!menuOpen)} style={{
                width: 36, height: 36, borderRadius: 8, fontSize: 18,
                background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {menuOpen ? '✕' : '☰'}
              </button>
            </div>
          ) : (
            <>
              <div style={styles.navLinks}>
                {navLinkItems}
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
                <button onClick={() => setShowPwdForm(!showPwdForm)} style={styles.themeBtn} title="Change password">🔑</button>
                <button onClick={handleLogout} style={styles.logoutBtn}>🚪 {t('nav.logout')}</button>
              </div>
            </>
          )}
        </div>

        {isMobile && menuOpen && (
          <div style={{
            borderTop: '1px solid var(--border)',
            padding: '8px 16px 12px',
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            {navLinkItems}
            <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
              <div style={styles.userAvatar}>{user?.fullName?.[0] ?? 'U'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{user?.fullName}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.role}</div>
              </div>
              <button onClick={() => setLang(lang === 'en' ? 'fa' : 'en')} style={styles.themeBtn}>
                {lang === 'en' ? 'FA' : 'EN'}
              </button>
              <button onClick={() => setShowPwdForm(!showPwdForm)} style={styles.themeBtn} title="Change password">🔑</button>
            </div>
            <button onClick={() => { handleLogout(); closeMenu(); }} style={{
              display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', borderRadius: 8, padding: '8px 14px',
              cursor: 'pointer', fontSize: 13, fontWeight: 500, width: '100%',
            }}>🚪 {t('nav.logout')}</button>
          </div>
        )}

        {showPwdForm && (
          <form onSubmit={handleChangePassword} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 24px', borderTop: '1px solid var(--border)',
            background: 'var(--bg-nav)', flexWrap: 'wrap',
          }}>
            <input name="password" type="password" placeholder="New password" required
              style={{ padding: '6px 12px', borderRadius: 6, border: '1.5px solid var(--border)',
                fontSize: 13, color: 'var(--text)', background: 'var(--bg-card)',
                width: isMobile ? '100%' : 180 }} />
            <input name="confirm" type="password" placeholder="Confirm password" required
              style={{ padding: '6px 12px', borderRadius: 6, border: '1.5px solid var(--border)',
                fontSize: 13, color: 'var(--text)', background: 'var(--bg-card)',
                width: isMobile ? '100%' : 180 }} />
            <button type="submit" style={{
              padding: '6px 16px', borderRadius: 6, border: 'none',
              background: '#4f6ef7', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              width: isMobile ? '100%' : 'auto',
            }}>Save</button>
            {pwdMsg && <span style={{ fontSize: 12, color: pwdMsg === 'Password changed' ? '#38a169' : '#e53e3e' }}>{pwdMsg}</span>}
          </form>
        )}
      </nav>
      <main style={{ ...styles.main, padding: isMobile ? '16px 12px' : '24px 24px', overflowX: 'hidden' }}>{children}</main>
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
