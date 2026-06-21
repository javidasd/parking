import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export function AuthCallback() {
  const { refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ssoToken = searchParams.get('sso_token');
    if (!ssoToken) {
      setError('No SSO token received');
      setLoading(false);
      return;
    }

    const processedKey = `sso_processed_${ssoToken}`;
    if (sessionStorage.getItem(processedKey)) {
      return;
    }
    sessionStorage.setItem(processedKey, '1');

    const handleCallback = async () => {
      try {
        const result = await api.auth.ssoCallback({ ssoToken });

        if (!result.token) {
          setError('Authentication failed');
          return;
        }

        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result));
        refreshUser();

        navigate(result.needsTeam ? '/auth/choose-team' : '/', { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.card}>
          <div style={styles.loading}>Authenticating...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.card}>
          <div style={styles.error}>{error}</div>
          <button style={styles.btn} onClick={() => navigate('/login')}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
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
  btn: {
    width: '100%', padding: '11px',
    background: '#4f6ef7', color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4,
  },
  loading: {
    padding: 44, textAlign: 'center', color: '#a0aec0', fontSize: 14,
  },
  error: {
    color: '#e53e3e', fontSize: 13, fontWeight: 500, textAlign: 'center',
    background: '#fff5f5', padding: '10px 14px', borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
};
