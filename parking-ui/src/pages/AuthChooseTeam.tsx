import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import type { Team } from '../types';

export function AuthChooseTeam() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.teams.getAll()
      .then(setTeams)
      .catch(() => setError('Failed to load teams'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (teamId === '') return;

    setSaving(true);
    setError('');

    try {
      await api.auth.setTeam({ teamId: teamId as number });

      const stored = localStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        user.teamId = teamId;
        localStorage.setItem('user', JSON.stringify(user));
      }
      refreshUser();

      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={{ padding: 44 }}>
          <div style={styles.header}>
            <div style={styles.logoWrap}>
              <span style={styles.logoIcon}>P</span>
            </div>
            <h2 style={styles.title}>Select Your Team</h2>
            <p style={styles.subtitle}>Choose a team to continue</p>
          </div>
          <form onSubmit={handleSubmit} style={{ ...styles.form, gap: 16 }}>
            <div style={styles.field}>
              <label style={styles.label}>Team</label>
              <select
                value={teamId}
                onChange={e => setTeamId(e.target.value === '' ? '' : Number(e.target.value))}
                style={styles.input}
                required
              >
                <option value="">Select a team...</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            {error && <div style={styles.error}>{error}</div>}
            <button type="submit" style={styles.btn} disabled={saving || teamId === ''}>
              {saving ? 'Saving...' : 'Continue'}
            </button>
          </form>
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
  },
};
