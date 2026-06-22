import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';
import { useIsMobile } from '../hooks/useMediaQuery';
import { api } from '../api';

export function Login() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch {
      setError(t('login.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSsoLogin = async () => {
    setSsoLoading(true);
    setError('');
    try {
      const config = await api.auth.getHeimdallConfig();
      const callbackUrl = `${window.location.origin}/auth/callback`;
      const loginUrl = `${config.baseUrl}/Sso/Login?redirect_uri=${encodeURIComponent(callbackUrl)}&service_id=${config.serviceId}`;
      window.location.href = loginUrl;
    } catch {
      setError('Failed to load SSO configuration');
    } finally {
      setSsoLoading(false);
    }
  };

  const p = isMobile ? 20 : 44;

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={{ padding: p }}>
          <div style={styles.header}>
            <div style={styles.logoWrap}>
              <span style={styles.logoIcon}>P</span>
            </div>
            <h2 style={{ ...styles.title, fontSize: isMobile ? 20 : 22 }}>{t('login.welcome')}</h2>
            <p style={styles.subtitle}>{t('login.subtitle')}</p>
          </div>
          <form onSubmit={handleSubmit} style={{ ...styles.form, gap: isMobile ? 14 : 16 }}>
            <div style={styles.field}>
              <label style={styles.label}>{t('login.username')}</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={styles.input}
                placeholder={t('login.placeholder.username')}
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>{t('login.password')}</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={styles.input}
                placeholder={t('login.placeholder.password')}
                required
              />
            </div>
            {error && (
              <div style={styles.error}>
                <span>✕</span> {error}
              </div>
            )}
            <button type="submit" style={styles.btn} disabled={loading}>
              {loading ? t('login.signing') : t('login.signin')}
            </button>
          </form>
          <div style={styles.divider}>
            <span style={styles.dividerText}>or</span>
          </div>
          <button type="button" style={styles.ssoBtn} onClick={handleSsoLogin} disabled={ssoLoading}>
            {ssoLoading ? 'Connecting...' : 'Login by Snappfood'}
          </button>
          <p style={styles.hint}>
            {t('login.demo')}: <strong>superadmin</strong> / <strong>admin123</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    minHeight: '100vh', background: '#f0f2f5', padding: 16,
  },
  card: {
    background: '#fff', borderRadius: 16,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)', width: '100%', maxWidth: 420,
  },
  header: { textAlign: 'center' },
  logoWrap: {
    width: 48, height: 48, borderRadius: 12,
    background: '#4f6ef7',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px',
  },
  logoIcon: { color: '#fff', fontSize: 24, fontWeight: 700 },
  title: { fontWeight: 700, color: '#1a202c', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#a0aec0' },
  form: { display: 'flex', flexDirection: 'column' },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#4a5568' },
  input: {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1a202c',
    background: '#f7f8fc', boxSizing: 'border-box',
  },
  btn: {
    width: '100%', padding: '11px',
    background: '#4f6ef7', color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4,
  },
  error: {
    color: '#e53e3e', fontSize: 13, fontWeight: 500, textAlign: 'center',
    background: '#fff5f5', padding: '10px 14px', borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  hint: {
    marginTop: 20, fontSize: 13, color: '#a0aec0', textAlign: 'center',
    padding: '12px', background: '#f7f8fc', borderRadius: 8,
  },
  divider: {
    display: 'flex', alignItems: 'center', gap: 12,
    margin: '16px 0',
  },
  dividerText: {
    fontSize: 13, color: '#a0aec0', whiteSpace: 'nowrap',
  },
  ssoBtn: {
    width: '100%', padding: '11px',
    background: '#fff', color: '#e53e3e', border: '1.5px solid #e53e3e', borderRadius: 8,
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
};
