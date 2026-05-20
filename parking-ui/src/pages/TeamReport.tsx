import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { useTranslation } from '../i18n';
import type { User, Team, Reservation } from '../types';

interface TeamUsage {
  teamId: number | null;
  teamName: string;
  members: UserUsage[];
  totalReservations: number;
}

interface UserUsage {
  user: User;
  totalReservations: number;
  activeReservations: number;
  cancelledReservations: number;
  monthlyLimit: number;
}

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

const persianMonthNames = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

export function TeamReport() {
  const { t } = useTranslation();
  const { isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [limits, setLimits] = useState<Record<number, number>>({});
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
        const [u, tData, r, l] = await Promise.all([
          api.users.getTeamMembers().catch(() => [] as User[]),
          api.teams.getAll().catch(() => [] as Team[]),
          api.reservations.getAll().catch(() => [] as Reservation[]),
          api.limits.getAll().catch(() => [] as { userId: number; monthlyLimit: number }[]),
        ]);
        setUsers(u as User[]);
        setTeams(tData as Team[]);
        setReservations(r as Reservation[]);
        const limitMap: Record<number, number> = {};
        (l as { userId: number; monthlyLimit: number }[]).forEach(lim => { limitMap[lim.userId] = lim.monthlyLimit; });
        setLimits(limitMap);
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

  const teamUsage = useMemo((): TeamUsage[] => {
    const userMap = new Map(users.map(u => [u.id, u]));
    const teamMap = new Map(teams.map(t => [t.id, t.name]));

    const grouped = new Map<number | null, { user: User; active: number; cancelled: number }[]>();

    for (const u of users) {
      const arr = grouped.get(u.teamId) || [];
      arr.push({ user: u, active: 0, cancelled: 0 });
      grouped.set(u.teamId, arr);
    }

    for (const r of filteredReservations) {
      const u = userMap.get(r.userId);
      if (!u) continue;
      const arr = grouped.get(u.teamId);
      if (!arr) continue;
      const entry = arr.find(e => e.user.id === r.userId);
      if (entry) {
        if (r.isCancelled) entry.cancelled++;
        else entry.active++;
      }
    }

    const result: TeamUsage[] = [];
    for (const [teamId, members] of grouped) {
      const teamName = teamId != null ? (teamMap.get(teamId) || `Team #${teamId}`) : 'No Team';
      const membersUsage = members.map(m => ({
        user: m.user,
        totalReservations: m.active,
        activeReservations: m.active,
        cancelledReservations: m.cancelled,
        monthlyLimit: limits[m.user.id] || 2,
      })).sort((a, b) => b.activeReservations - a.activeReservations);

      result.push({
        teamId,
        teamName,
        members: membersUsage,
        totalReservations: membersUsage.reduce((sum, m) => sum + m.totalReservations, 0),
      });
    }

    result.sort((a, b) => (a.teamName || '').localeCompare(b.teamName || ''));
    return result;
  }, [users, teams, filteredReservations, limits]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>📊</div>
        {t('report.loading')}
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>📊 {t('report.title')}</h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          {isSuperAdmin ? t('report.subtitle.all') : t('report.subtitle.team')}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'stretch' }}>
        <div style={{
          ...card, display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 16px', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 15 }}>📅</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('report.from')}</span>
            <select value={fromYear} onChange={e => setFromYear(Number(e.target.value))} style={selectStyle}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={fromMonth} onChange={e => setFromMonth(Number(e.target.value))} style={selectStyle}>
              {persianMonthNames.map((name, i) => <option key={i} value={i + 1}>{name}</option>)}
            </select>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 16, fontWeight: 300 }}>→</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('report.to')}</span>
            <select value={toYear} onChange={e => setToYear(Number(e.target.value))} style={selectStyle}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={toMonth} onChange={e => setToMonth(Number(e.target.value))} style={selectStyle}>
              {persianMonthNames.map((name, i) => <option key={i} value={i + 1}>{name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ ...card, flex: '1 1 140px' }}>
          <div style={statVal}>{teamUsage.reduce((s, t) => s + t.members.length, 0)}</div>
          <div style={statLabel}>{t('report.members')}</div>
        </div>
        <div style={{ ...card, flex: '1 1 140px' }}>
          <div style={{ ...statVal, color: '#38a169' }}>{filteredReservations.filter(r => !r.isCancelled).length}</div>
          <div style={statLabel}>{t('report.activeReservations')}</div>
        </div>
        <div style={{ ...card, flex: '1 1 140px' }}>
          <div style={{ ...statVal, color: '#f5576c' }}>{filteredReservations.filter(r => r.isCancelled).length}</div>
          <div style={statLabel}>{t('report.cancelled')}</div>
        </div>
        <div style={{ ...card, flex: '1 1 140px' }}>
          <div style={{ ...statVal, color: '#4a5568' }}>{filteredReservations.filter(r => !r.isCancelled).length}</div>
          <div style={statLabel}>{t('report.total')}</div>
        </div>
      </div>

      {teamUsage.map(tu => (
        <div key={tu.teamId ?? 'none'} style={teamSection}>
          <h3 style={sectionTitle}>
            <span style={{ fontSize: 20 }}>🏢</span> {tu.teamName}
            <span style={{
              fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
              background: 'var(--bg-subtle)', padding: '2px 10px', borderRadius: 6,
            }}>
              {tu.members.length} {t('report.membersCount')} · {tu.totalReservations} {t('report.reservationsCount')}
            </span>
          </h3>
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>{t('report.member')}</th>
                  <th style={th}>{t('admin.role')}</th>
                  <th style={th}>{t('report.active')}</th>
                  <th style={th}>{t('report.cancelled')}</th>
                  <th style={th}>{t('report.totalLabel')}</th>
                  <th style={th}>{t('reservations.monthlyLimit')}</th>
                  <th style={th}>{t('report.usage')}</th>
                </tr>
              </thead>
              <tbody>
                {tu.members.map(m => {
                  const pct = m.monthlyLimit > 0 ? Math.round((m.activeReservations / m.monthlyLimit) * 100) : 0;
                  const barColor = pct >= 90 ? '#e53e3e' : pct >= 70 ? '#d69e2e' : '#38a169';
                  return (
                    <tr key={m.user.id}>
                      <td style={td}>
                        <strong>{m.user.fullName}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8 }}>@{m.user.username}</span>
                      </td>
                      <td style={td}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: m.user.role === 'Admin' ? 'var(--warning-light)' : 'var(--bg-subtle)',
                          color: m.user.role === 'Admin' ? '#975a16' : 'var(--text-muted)',
                        }}>{m.user.role}</span>
                      </td>
                      <td style={td}><span style={{ color: '#38a169', fontWeight: 600 }}>{m.activeReservations}</span></td>
                      <td style={td}><span style={{ color: 'var(--text-muted)' }}>{m.cancelledReservations}</span></td>
                      <td style={td}><strong>{m.totalReservations}</strong></td>
                      <td style={td}>{m.monthlyLimit}</td>
                      <td style={{ ...td, minWidth: 120 }}>
                        <div style={barOuter}>
                          <div style={{ ...barInner, width: `${Math.min(pct, 100)}%`, background: barColor }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{pct}%</span>
                      </td>
                    </tr>
                  );
                })}
                {tu.members.length === 0 && (
                  <tr><td colSpan={7} style={emptyCell}>No members in this team</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {teamUsage.length === 0 && (
        <div style={emptyBox}>
          <span style={{ fontSize: 48 }}>📊</span>
          <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginTop: 12, fontSize: 16 }}>{t('report.noData')}</p>
        </div>
      )}
    </div>
  );
}

const card: React.CSSProperties = {
  background: 'var(--bg-card)', padding: '14px 16px', borderRadius: 10,
  boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)',
};
const statVal: React.CSSProperties = { fontSize: 24, fontWeight: 700, color: 'var(--text)' };
const statLabel: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 };
const teamSection: React.CSSProperties = { marginBottom: 28 };
const sectionTitle: React.CSSProperties = {
  fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12,
  display: 'flex', alignItems: 'center', gap: 10,
};
const tableWrap: React.CSSProperties = {
  background: 'var(--bg-card)', borderRadius: 12,
  boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
  border: '1px solid var(--border)',
};
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const th: React.CSSProperties = {
  padding: '12px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
  textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em',
  borderBottom: '1px solid var(--border)', background: 'var(--bg-header)',
};
const td: React.CSSProperties = {
  padding: '12px 14px', fontSize: 13, color: 'var(--text)', borderBottom: '1px solid var(--border-light)',
  verticalAlign: 'middle',
};
const emptyCell: React.CSSProperties = {
  textAlign: 'center', padding: 32, fontSize: 13, color: 'var(--text-muted)',
};
const emptyBox: React.CSSProperties = {
  textAlign: 'center', padding: 60, color: 'var(--text-muted)',
  background: 'var(--bg-card)', borderRadius: 16,
  border: '1px solid var(--border)',
};
const barOuter: React.CSSProperties = {
  display: 'inline-block', width: 60, height: 6, borderRadius: 3,
  background: 'var(--bg-subtle)', overflow: 'hidden', verticalAlign: 'middle',
};
const barInner: React.CSSProperties = {
  height: '100%', borderRadius: 3, transition: 'width 0.4s ease',
};
const selectStyle: React.CSSProperties = {
  padding: '6px 8px', borderRadius: 6, border: '1.5px solid var(--border)',
  fontSize: 13, color: 'var(--text)', background: 'var(--bg-card)',
  cursor: 'pointer', outline: 'none',
};
