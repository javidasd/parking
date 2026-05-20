import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';

export function Login() {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoWrap}>
            <span style={styles.logoIcon}>P</span>
          </div>
          <h2 style={styles.title}>{t('login.welcome')}</h2>
          <p style={styles.subtitle}>{t('login.subtitle')}</p>
        </div>
        <form onSubmit={handleSubmit} style={styles.form}>
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
        <p style={styles.hint}>
          {t('login.demo')}: <strong>superadmin</strong> / <strong>admin123</strong>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    minHeight: '100vh', background: '#f0f2f5',
  },
  card: {
    background: '#fff', padding: 44, borderRadius: 16,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)', width: 420,
    animation: 'slideUp 0.4s ease-out',
  },
  header: { textAlign: 'center', marginBottom: 32 },
  logoWrap: {
    width: 48, height: 48, borderRadius: 12,
    background: '#4f6ef7',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px',
  },
  logoIcon: { color: '#fff', fontSize: 24, fontWeight: 700 },
  title: { fontSize: 22, fontWeight: 700, color: '#1a202c', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#a0aec0' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
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
};
