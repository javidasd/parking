import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import type { Reservation, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';
import { useIsMobile } from '../hooks/useMediaQuery';

interface PersianDate { year: number; month: number; day: number; }

function gregorianToPersian(gy: number, gm: number, gd: number): PersianDate {
  const formatter = new Intl.DateTimeFormat('en-CA-u-ca-persian', {
    timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric',
  });
  const parts = formatter.formatToParts(new Date(Date.UTC(gy, gm - 1, gd)));
  let year = 0, month = 0, day = 0;
  for (const part of parts) {
    if (part.type === 'year') year = Number(part.value);
    if (part.type === 'month') month = Number(part.value);
    if (part.type === 'day') day = Number(part.value);
  }
  return { year, month, day };
}

function persianToGregorian(py: number, pm: number, pd: number): { year: number; month: number; day: number } {
  const gy = py + 620;
  const startDate = new Date(Date.UTC(gy, 2, 1));
  for (let i = 0; i < 700; i++) {
    const date = new Date(startDate.getTime() + i * 86400000);
    const p = gregorianToPersian(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
    if (p.year === py && p.month === pm && p.day === pd) {
      return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
    }
  }
  return { year: 2025, month: 3, day: 21 };
}

function getDayName(persianDate: string, lang: 'en' | 'fa'): string {
  const [y, m, d] = persianDate.split('-').map(Number);
  const { year: gy, month: gm, day: gd } = persianToGregorian(y, m, d);
  const dow = new Date(Date.UTC(gy, gm - 1, gd)).getUTCDay();
  if (lang === 'en') {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dow];
  }
  return ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'][dow];
}

const persianMonthNames = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

export function MyReservations() {
  const { t, lang } = useTranslation();
  const { user: currentUser, isAdmin, isSuperAdmin } = useAuth();
  const isMobile = useIsMobile();
  const token = localStorage.getItem('token');
  const currentUserId = token ? Number(JSON.parse(atob(token.split('.')[1]))['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']) : 0;

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const iranMs = now.getTime() - now.getTimezoneOffset() * 60000 + 12600000;
  const iranNow = new Date(iranMs);
  const todayPersian = gregorianToPersian(iranNow.getUTCFullYear(), iranNow.getUTCMonth() + 1, iranNow.getUTCDate());

  const [fromMonth, setFromMonth] = useState(todayPersian.month);
  const [fromYear, setFromYear] = useState(todayPersian.year);
  const [toMonth, setToMonth] = useState(todayPersian.month);
  const [toYear, setToYear] = useState(todayPersian.year);

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = todayPersian.year - 5; y <= todayPersian.year + 5; y++) years.push(y);
    return years;
  }, [todayPersian.year]);

  const filterStart = `${fromYear}-${String(fromMonth).padStart(2, '0')}-01`;
  const filterEnd = `${toYear}-${String(toMonth).padStart(2, '0')}-31`;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [r, u] = await Promise.all([
          api.reservations.getAll().catch(() => [] as Reservation[]),
          api.users.getTeamMembers().catch(() => [] as User[]),
        ]);
        setReservations(r as Reservation[]);
        setUsers(u as User[]);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const filteredReservations = useMemo(() => {
    return reservations.filter(r => {
      if (r.persianDate < filterStart) return false;
      if (r.persianDate > filterEnd) return false;
      return true;
    });
  }, [reservations, filterStart, filterEnd]);

  const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

  const canCancel = (reservation: Reservation) => {
    if (isSuperAdmin || isAdmin) return true;
    if (reservation.userId !== currentUserId) return false;
    const [y, m, d] = reservation.persianDate.split('-').map(Number);
    const { year, month, day } = persianToGregorian(y, m, d);
    const reserveDate = new Date(year, month - 1, day);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return reserveDate >= sevenDaysFromNow;
  };

  const handleCancel = async (id: number) => {
    setMessage('');
    try {
      await api.reservations.cancel(id);
      setMessageType('success');
      setMessage(t('reservations.cancelledMsg'));
      setReservations(prev => prev.map(r => r.id === id ? { ...r, isCancelled: true } : r));
    } catch (err: unknown) {
      setMessageType('error');
      setMessage((err as Error).message || 'Failed to cancel');
    }
  };

  const active = useMemo(() => filteredReservations.filter(r => !r.isCancelled), [filteredReservations]);
  const cancelled = useMemo(() => filteredReservations.filter(r => r.isCancelled), [filteredReservations]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
        {t('report.loading')}
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isMobile ? 16 : 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            📋 {t('reservations.allTitle')}
          </h2>
          <p style={{ fontSize: isMobile ? 13 : 14, color: 'var(--text-muted)' }}>
            {t('reservations.allSubtitle')}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 16px', flexWrap: 'wrap',
          background: 'var(--bg-card)', borderRadius: 10,
          boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 15 }}>📅</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('report.from')}</span>
            <select value={fromYear} onChange={e => setFromYear(Number(e.target.value))} style={selectStyle}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={fromMonth} onChange={e => setFromMonth(Number(e.target.value))} style={selectStyle}>
              {persianMonthNames.map((name, i) => <option key={i} value={i + 1}>{name}</option>)}
            </select>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 16, fontWeight: 300 }}>→</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('report.to')}</span>
            <select value={toYear} onChange={e => setToYear(Number(e.target.value))} style={selectStyle}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={toMonth} onChange={e => setToMonth(Number(e.target.value))} style={selectStyle}>
              {persianMonthNames.map((name, i) => <option key={i} value={i + 1}>{name}</option>)}
            </select>
          </div>
        </div>
        <div style={{
          background: 'var(--bg-card)', padding: '10px 16px', borderRadius: 10,
          boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
            {t('report.total')}: <strong style={{ color: 'var(--text)' }}>{filteredReservations.length}</strong>
          </span>
        </div>
      </div>

      {message && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
          marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--success-light)',
          color: messageType === 'success' ? 'var(--success)' : 'var(--danger)',
        }}>
          {messageType === 'success' ? '✓' : '✕'} {message}
        </div>
      )}

      {active.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{
            fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: '#38a169', display: 'inline-block' }} />
            {t('reservations.active')}
            <span style={{
              fontSize: 12, fontWeight: 600, padding: '1px 8px', borderRadius: 6,
              background: '#f0fff4', color: '#38a169',
            }}>{active.length}</span>
          </h3>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 12,
            boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)',
            overflowX: 'auto',
          }} className="responsive-table">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr>
                  <th style={th}>{t('reservations.user')}</th>
                  <th style={th}>{t('reservations.spot')}</th>
                  <th style={th}>{t('reservations.date')}</th>
                  <th style={th}>{t('reservations.day')}</th>
                  <th style={th}>{t('reservations.status')}</th>
                  <th style={th}>{t('reservations.action')}</th>
                </tr>
              </thead>
              <tbody>
                {active.map(r => {
                  const u = userMap.get(r.userId);
                  return (
                    <tr key={r.id}>
                      <td style={td}>
                        <strong>{u?.fullName || r.username}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8 }}>@{r.username}</span>
                      </td>
                      <td style={td}>{r.parkingSpotName}</td>
                      <td style={td}>
                        <span style={{
                          background: 'var(--primary-light)', color: 'var(--primary)',
                          padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                        }}>
                          {r.persianDate.split('-').slice(1).join('/')}
                        </span>
                      </td>
                      <td style={td}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {getDayName(r.persianDate, lang)}
                        </span>
                      </td>
                      <td style={td}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                          background: 'var(--success-light)', color: 'var(--success)', display: 'inline-block',
                        }}>{t('reservations.activeLabel')}</span>
                      </td>
                      <td style={td}>
                        {canCancel(r) && (
                          <button onClick={() => handleCancel(r.id)} style={{
                            background: 'var(--danger-light)', color: 'var(--danger)',
                            border: '1px solid #fed7d7', borderRadius: 8,
                            padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          }}>
                            {t('reservations.cancel')}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {cancelled.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{
            fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--text-muted)', display: 'inline-block' }} />
            {t('reservations.cancelled')}
            <span style={{
              fontSize: 12, fontWeight: 600, padding: '1px 8px', borderRadius: 6,
              background: 'var(--bg-subtle)', color: 'var(--text-muted)',
            }}>{cancelled.length}</span>
          </h3>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 12,
            boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)',
            overflowX: 'auto',
          }} className="responsive-table">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr>
                  <th style={th}>{t('reservations.user')}</th>
                  <th style={th}>{t('reservations.spot')}</th>
                  <th style={th}>{t('reservations.date')}</th>
                  <th style={th}>{t('reservations.day')}</th>
                  <th style={th}>{t('reservations.status')}</th>
                </tr>
              </thead>
              <tbody>
                {cancelled.map(r => {
                  const u = userMap.get(r.userId);
                  return (
                    <tr key={r.id} style={{ opacity: 0.55 }}>
                      <td style={td}>
                        <strong>{u?.fullName || r.username}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8 }}>@{r.username}</span>
                      </td>
                      <td style={td}>{r.parkingSpotName}</td>
                      <td style={td}>
                        <span style={{
                          background: 'var(--primary-light)', color: 'var(--primary)',
                          padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                        }}>
                          {r.persianDate.split('-').slice(1).join('/')}
                        </span>
                      </td>
                      <td style={td}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {getDayName(r.persianDate, lang)}
                        </span>
                      </td>
                      <td style={td}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                          background: 'var(--bg-subtle)', color: 'var(--text-muted)', display: 'inline-block',
                        }}>{t('reservations.cancelledLabel')}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredReservations.length === 0 && (
        <div style={{
          textAlign: 'center', padding: 60, color: 'var(--text-muted)',
          background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 48 }}>📋</span>
          <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginTop: 12, fontSize: 16 }}>
            {t('reservations.empty')}
          </p>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  padding: '12px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
  textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em',
  borderBottom: '1px solid var(--border)', background: 'var(--bg-header)',
  whiteSpace: 'nowrap',
};
const td: React.CSSProperties = {
  padding: '12px 14px', fontSize: 13, color: 'var(--text)',
  borderBottom: '1px solid var(--border-light)', verticalAlign: 'middle',
};
const selectStyle: React.CSSProperties = {
  padding: '6px 8px', borderRadius: 6, border: '1.5px solid var(--border)',
  fontSize: 13, color: 'var(--text)', background: 'var(--bg-card)',
  cursor: 'pointer', outline: 'none',
};
