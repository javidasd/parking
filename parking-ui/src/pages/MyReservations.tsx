import { useState, useEffect } from 'react';
import { api } from '../api';
import type { Reservation } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';

export function MyReservations() {
  const { t } = useTranslation();
  const { isAdmin, isSuperAdmin } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [limit, setLimit] = useState<{ monthlyLimit: number; usedCount: number } | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [data, myLimit] = await Promise.all([
        isAdmin ? api.reservations.getAll() : api.reservations.getMy(),
        api.limits.getMy().catch(() => null),
      ]);
      setReservations(data || []);
      setLimit(myLimit);
    } catch { setReservations([]); }
  };

  const handleCancel = async (id: number) => {
    setMessage('');
    try {
      await api.reservations.cancel(id);
      setMessageType('success');
      setMessage(t('reservations.cancelledMsg'));
      loadData();
    } catch (err: unknown) {
      setMessageType('error');
      setMessage((err as Error).message || 'Failed to cancel');
    }
  };

  const canCancel = (dateStr: string) => {
    const now = new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d) >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
  };

  const active = reservations.filter(r => !r.isCancelled);
  const cancelled = reservations.filter(r => r.isCancelled);

  const usagePct = limit ? Math.round((limit.usedCount / limit.monthlyLimit) * 100) : 0;
  const barColor = usagePct >= 90 ? '#e53e3e' : usagePct >= 70 ? '#d69e2e' : '#38a169';

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            📋 {isAdmin ? t('reservations.allTitle') : t('reservations.myTitle')}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            {isAdmin ? t('reservations.allSubtitle') : t('reservations.mySubtitle')}
          </p>
        </div>
      </div>

      {!isAdmin && limit && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ ...s.card, borderLeft: '4px solid #4f6ef7' }}>
            <div style={s.statValue}>{limit.usedCount}</div>
            <div style={s.statLabel}>{t('reservations.reserved')}</div>
            <div style={{ ...s.bar, marginTop: 8 }}>
              <div style={{ ...s.barFill, width: `${usagePct}%`, background: barColor }} />
            </div>
          </div>
          <div style={{ ...s.card, borderLeft: '4px solid #38a169' }}>
            <div style={{ ...s.statValue, color: '#38a169' }}>{limit.monthlyLimit - limit.usedCount}</div>
            <div style={s.statLabel}>{t('reservations.remaining')}</div>
          </div>
          <div style={{ ...s.card, borderLeft: '4px solid #a0aec0' }}>
            <div style={{ ...s.statValue, color: '#4a5568' }}>{limit.monthlyLimit}</div>
            <div style={s.statLabel}>{t('reservations.monthlyLimit')}</div>
          </div>
        </div>
      )}

      {message && (
        <div style={{
          ...s.msg,
          background: 'var(--success-light)',
          color: messageType === 'success' ? 'var(--success)' : 'var(--danger)',
        }}>
          {messageType === 'success' ? '✓' : '✕'} {message}
        </div>
      )}

      {active.length > 0 && (
        <div style={s.section}>
          <h3 style={s.sectionTitle}>
            <span style={{ ...s.dot, background: '#38a169' }} />
            {t('reservations.active')}
            <span style={{ ...s.countBadge, background: '#f0fff4', color: '#38a169' }}>{active.length}</span>
          </h3>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {isAdmin && <th style={s.th}>{t('reservations.user')}</th>}
                  <th style={s.th}>{t('reservations.spot')}</th>
                  <th style={s.th}>{t('reservations.date')}</th>
                  <th style={s.th}>{t('reservations.status')}</th>
                  <th style={s.th}>{t('reservations.action')}</th>
                </tr>
              </thead>
              <tbody>
                {active.map(r => (
                  <tr key={r.id}>
                    {isAdmin && <td style={s.td}>{r.username}</td>}
                    <td style={s.td}><strong>{r.parkingSpotName}</strong></td>
                    <td style={s.td}>
                      <span style={s.dateBadge}>{r.persianDate}</span>
                    </td>
                    <td style={s.td}>
                      <span style={s.statusActive}>{t('reservations.activeLabel')}</span>
                    </td>
                    <td style={s.td}>
                      {isSuperAdmin || canCancel(r.persianDate) ? (
                        <button onClick={() => handleCancel(r.id)} style={s.cancelBtn}>{t('reservations.cancel')}</button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {cancelled.length > 0 && (
        <div style={s.section}>
          <h3 style={s.sectionTitle}>
            <span style={{ ...s.dot, background: 'var(--text-muted)' }} />
            {t('reservations.cancelled')}
            <span style={{ ...s.countBadge, background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>{cancelled.length}</span>
          </h3>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {isAdmin && <th style={s.th}>{t('reservations.user')}</th>}
                  <th style={s.th}>{t('reservations.spot')}</th>
                  <th style={s.th}>{t('reservations.date')}</th>
                  <th style={s.th}>{t('reservations.status')}</th>
                  <th style={s.th}></th>
                </tr>
              </thead>
              <tbody>
                {cancelled.map(r => (
                  <tr key={r.id} style={{ opacity: 0.55 }}>
                    {isAdmin && <td style={s.td}>{r.username}</td>}
                    <td style={s.td}>{r.parkingSpotName}</td>
                    <td style={s.td}>
                      <span style={s.dateBadge}>{r.persianDate}</span>
                    </td>
                    <td style={s.td}>
                      <span style={s.statusCancelled}>{t('reservations.cancelledLabel')}</span>
                    </td>
                    <td style={s.td}></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reservations.length === 0 && (
        <div style={s.empty}>
          <span style={{ fontSize: 48 }}>📋</span>
          <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginTop: 12, fontSize: 16 }}>{t('reservations.empty')}</p>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>{t('reservations.emptyHint')}</p>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--bg-card)', padding: '16px 20px', borderRadius: 12,
    boxShadow: 'var(--shadow-sm), var(--shadow-md)', border: '1px solid var(--border)',
    flex: '1 1 180px',
  },
  statValue: { fontSize: 26, fontWeight: 700, color: 'var(--text)' },
  statLabel: { fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 },
  bar: { width: '100%', height: 6, borderRadius: 3, background: 'var(--bg-subtle)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, transition: 'width 0.4s ease' },
  msg: {
    padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
    marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6,
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 12,
    display: 'flex', alignItems: 'center', gap: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4, display: 'inline-block' },
  countBadge: {
    fontSize: 12, fontWeight: 600, padding: '1px 8px', borderRadius: 6,
  },
  tableWrap: {
    background: 'var(--bg-card)', borderRadius: 12,
    boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
    border: '1px solid var(--border)',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
    textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border)', background: 'var(--bg-header)',
  },
  td: { padding: '14px 16px', fontSize: 13, color: 'var(--text)', borderBottom: '1px solid var(--border-light)' },
  dateBadge: {
    background: 'var(--primary-light)',
    color: 'var(--primary)', padding: '3px 8px',
    borderRadius: 6, fontSize: 12, fontWeight: 600,
  },
  statusActive: {
    padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
    background: 'var(--success-light)', color: 'var(--success)', display: 'inline-block',
  },
  statusCancelled: {
    padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
    background: 'var(--bg-subtle)', color: 'var(--text-muted)', display: 'inline-block',
  },
  cancelBtn: {
    background: 'var(--danger-light)',
    color: 'var(--danger)', border: '1px solid #fed7d7',
    borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600,
    cursor: 'pointer',
  },
  empty: {
    textAlign: 'center', padding: 60, color: 'var(--text-muted)',
    background: 'var(--bg-card)', borderRadius: 16,
    border: '1px solid var(--border)',
  },
};
