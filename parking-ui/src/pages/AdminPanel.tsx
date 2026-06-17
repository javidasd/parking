import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';
import { useIsMobile } from '../hooks/useMediaQuery';
import type { Team, User as UserType, ParkingSpot, ParkingLimit, Reservation } from '../types';

export function AdminPanel() {
  const { t } = useTranslation();
  const { isSuperAdmin } = useAuth();
  const isMobile = useIsMobile();
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [limits, setLimits] = useState<ParkingLimit[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [defaultLimit, setDefaultLimit] = useState(() => Number(localStorage.getItem('defaultLimit') || '2'));
  const [activeTab, setActiveTab] = useState<'spots' | 'teams' | 'users' | 'limits'>('spots');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [tData, u, s, l, r] = await Promise.all([
        api.teams.getAll().catch(() => []),
        api.users.getAll().catch(() => []),
        api.parkingSpots.getAll(),
        api.limits.getAll().catch(() => []),
        api.reservations.getAll().catch(() => []),
      ]);
      setTeams(tData as Team[] || []);
      setUsers(u as UserType[] || []);
      setSpots(s as ParkingSpot[] || []);
      setLimits(l as ParkingLimit[] || []);
      setReservations(r as Reservation[] || []);
    } catch { /* ignore */ }
  };

  const showMsg = (msg: string, isError = false) => {
    setMessageType(isError ? 'error' : 'success');
    setMessage(isError ? `Error: ${msg}` : msg);
    setTimeout(() => setMessage(''), 3500);
  };

  const handleCreateSpot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await api.parkingSpots.create({
        name: form.get('name') as string,
        location: form.get('location') as string,
        teamId: form.get('teamId') ? Number(form.get('teamId')) : undefined,
      });
      showMsg(t('admin.spotCreated'));
      loadData();
      (e.target as HTMLFormElement).reset();
    } catch (err: unknown) { showMsg((err as Error).message, true); }
  };

  const handleDeleteSpot = async (id: number) => {
    try { await api.parkingSpots.delete(id); showMsg(t('admin.spotDeactivated')); loadData(); }
    catch (err: unknown) { showMsg((err as Error).message, true); }
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await api.users.create({
        username: form.get('username') as string, password: form.get('password') as string,
        fullName: form.get('fullName') as string, role: form.get('role') as string,
        teamId: Number(form.get('teamId')),
        monthlyLimit: Number(form.get('monthlyLimit')),
      });
      showMsg(t('admin.userCreated'));
      loadData();
      (e.target as HTMLFormElement).reset();
    } catch (err: unknown) { showMsg((err as Error).message, true); }
  };

  const handleDeleteUser = async (id: number) => {
    try { await api.users.delete(id); showMsg(t('admin.userDeleted')); loadData(); }
    catch (err: unknown) { showMsg((err as Error).message, true); }
  };

  const handleUpdateUser = async (id: number, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const data: { fullName?: string; password?: string; role?: string; teamId: number } = {
        teamId: Number(form.get('teamId')),
      };
      const fullName = form.get('fullName') as string;
      const password = form.get('password') as string;
      const role = form.get('role') as string;
      if (fullName) data.fullName = fullName;
      if (password) data.password = password;
      if (role) data.role = role;
      await api.users.update(id, data);
      showMsg(t('admin.userUpdated'));
      setEditingUserId(null);
      loadData();
    } catch (err: unknown) { showMsg((err as Error).message, true); }
  };

  const handleSetLimit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await api.limits.set({ userId: Number(form.get('userId')), monthlyLimit: Number(form.get('monthlyLimit')) });
      showMsg(t('admin.limitSet'));
      loadData();
    } catch (err: unknown) { showMsg((err as Error).message, true); }
  };

  const handleSetDefaultLimit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const val = Number(form.get('defaultLimit'));
    localStorage.setItem('defaultLimit', String(val));
    setDefaultLimit(val);
    showMsg(`${t('admin.defaultLimitSet')} ${val}`);
  };

  const handleCreateTeam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await api.teams.create({ name: form.get('name') as string });
      showMsg(t('admin.teamCreated'));
      loadData();
      (e.target as HTMLFormElement).reset();
    } catch (err: unknown) { showMsg((err as Error).message, true); }
  };

  const handleDeleteTeam = async (id: number) => {
    try { await api.teams.delete(id); showMsg(t('admin.teamDeleted')); loadData(); }
    catch (err: unknown) { showMsg((err as Error).message, true); }
  };

  const tabs = [
    { id: 'spots' as const, label: t('admin.spots'), icon: '🅿️', admin: false },
    { id: 'teams' as const, label: t('admin.teams'), icon: '🏢', admin: true },
    { id: 'users' as const, label: t('admin.users'), icon: '👥', admin: true },
    { id: 'limits' as const, label: t('admin.limits'), icon: '📊', admin: false },
  ].filter(tab => !tab.admin || isSuperAdmin);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ marginBottom: isMobile ? 16 : 24 }}>
        <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>⚙️ {t('admin.title')}</h2>
        <p style={{ fontSize: isMobile ? 13 : 14, color: 'var(--text-muted)' }}>{t('admin.subtitle')}</p>
      </div>

      {message && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
          marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6,
          background: messageType === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
          color: messageType === 'success' ? 'var(--success)' : 'var(--danger)',
        }}>
          {messageType === 'success' ? '✓' : '✕'} {message}
        </div>
      )}

      <div style={{
        display: 'flex', gap: 4, marginBottom: isMobile ? 16 : 24,
        background: 'var(--bg-subtle)',
        padding: 4, borderRadius: 12,
        border: '1px solid var(--border)',
        flexWrap: isMobile ? 'wrap' : 'nowrap',
        width: '100%',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: isMobile ? '8px 14px' : '8px 16px',
              borderRadius: 8, fontSize: isMobile ? 13 : 13, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              flex: isMobile ? '1 1 calc(50% - 4px)' : undefined,
              justifyContent: isMobile ? 'center' : undefined,
              background: activeTab === tab.id ? '#4f6ef7' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s',
            }}
          >{tab.icon} {tab.label}</button>
        ))}
      </div>

      {activeTab === 'spots' && (
        <div style={{ display: 'flex', gap: isMobile ? 12 : 20, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ ...card, flex: isMobile ? undefined : '1 1 300px', background: 'var(--bg-card)', padding: isMobile ? 16 : 24 }}>
              <h3 style={{ ...sectionTitle, fontSize: isMobile ? 15 : 16 }}>🆕 {t('admin.createSpot')}</h3>
              <form onSubmit={handleCreateSpot} style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              <input name="name" placeholder={t('admin.name')} required style={inputS} />
              <input name="location" placeholder={t('admin.location')} required style={inputS} />
{isSuperAdmin && (
    <select name="teamId" style={inputS}>
      <option value="">{t('admin.noTeam')}</option>
      {teams.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
    </select>
  )}
              <button type="submit" style={{ ...btnS, width: isMobile ? '100%' : undefined }}>{t('admin.createSpot')}</button>
            </form>
          </div>
          <div style={{ ...card, flex: isMobile ? undefined : '2 1 400px', background: 'var(--bg-card)', padding: isMobile ? 16 : 24 }}>
            <h3 style={{ ...sectionTitle, fontSize: isMobile ? 15 : 16 }}>📋 {t('admin.existingSpots')}</h3>
             <div style={tableWrap} className="responsive-table">
               <table style={table}>
                 <thead>
                    <tr>
                      <th style={th}>{t('admin.name')}</th>
                      <th style={th}>{t('admin.location')}</th>
                      <th style={th}>{t('admin.teams')}</th>
                      <th style={th}></th>
                    </tr>
                  </thead>
                 <tbody>
                   {spots.filter(s => s.isActive).map(s => {
                     const spotReservations = reservations.filter(r => r.parkingSpotId === s.id && !r.isCancelled);
                     return (
                        <tr key={s.id}>
                          <td style={td}><strong>{s.name}</strong></td>
                          <td style={td}>{s.location}</td>
                          <td style={td}>{s.teamName || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                          <td style={td}>
                            <button onClick={() => handleDeleteSpot(s.id)} style={delBtn}>{t('admin.delete')}</button>
                          </td>
                       </tr>
                     );
                   })}
                   {spots.filter(s => s.isActive).length === 0 && (
                     <tr><td colSpan={6} style={emptyCell}>No active spots</td></tr>
                   )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'teams' && isSuperAdmin && (
        <div style={{ display: 'flex', gap: isMobile ? 12 : 20, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
          <div style={{ ...card, flex: isMobile ? undefined : '1 1 320px', background: 'var(--bg-card)', padding: isMobile ? 16 : 24 }}>
            <h3 style={{ ...sectionTitle, fontSize: isMobile ? 15 : 16 }}>🆕 {t('admin.createTeam')}</h3>
            <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input name="name" placeholder={t('admin.teams')} required style={inputS} />
              <button type="submit" style={{ ...btnS, width: isMobile ? '100%' : undefined }}>{t('admin.createTeam')}</button>
            </form>
          </div>
          <div style={{ ...card, flex: isMobile ? undefined : '1 1 400px', background: 'var(--bg-card)', padding: isMobile ? 16 : 24 }}>
            <h3 style={{ ...sectionTitle, fontSize: isMobile ? 15 : 16 }}>🏢 {t('admin.existingTeams')}</h3>
            <div style={tableWrap} className="responsive-table">
              <table style={table}>
                 <thead><tr><th style={th}>{t('admin.name')}</th><th style={th}>{t('admin.spots')}</th><th style={th}></th></tr></thead>
                 <tbody>
                   {teams.map(tm => (
                     <tr key={tm.id}>
                       <td style={td}><strong>{tm.name}</strong></td>
                       <td style={td}>{spots.filter(s => s.teamId === tm.id && s.isActive).length}</td>
                       <td style={td}><button onClick={() => handleDeleteTeam(tm.id)} style={delBtn}>{t('admin.delete')}</button></td>
                     </tr>
                   ))}
                   {teams.length === 0 && <tr><td colSpan={3} style={emptyCell}>No teams</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

       {activeTab === 'users' && isSuperAdmin && (
         <div style={{ display: 'flex', gap: isMobile ? 12 : 20, flexWrap: isMobile ? 'nowrap' : 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
           <div style={{ ...card, flex: isMobile ? undefined : '1 1 320px', alignSelf: isMobile ? 'stretch' : 'flex-start', background: 'var(--bg-card)', padding: isMobile ? 16 : 24 }}>
            <h3 style={{ ...sectionTitle, fontSize: isMobile ? 15 : 16 }}>👤 {t('admin.createUser')}</h3>
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input name="username" placeholder={t('login.username')} required style={inputS} />
              <input name="password" placeholder={t('admin.password')} required style={inputS} />
              <input name="fullName" placeholder={t('admin.fullName')} required style={inputS} />
              <select name="role" required style={inputS}>
                <option value="User">{t('admin.users')}</option>
                <option value="Admin">{t('nav.admin')}</option>
              </select>
              <select name="teamId" required style={inputS}>
                <option value="">{t('admin.selectTeam')}</option>
                {teams.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
              </select>
              <input name="monthlyLimit" type="number" placeholder={t('reservations.monthlyLimit')} defaultValue={defaultLimit} min={1} style={inputS} />
              <button type="submit" style={{ ...btnS, width: isMobile ? '100%' : undefined }}>{t('admin.createUser')}</button>
            </form>
          </div>
           <div style={{ ...card, flex: isMobile ? undefined : '2 1 500px', alignSelf: isMobile ? 'stretch' : 'auto', background: 'var(--bg-card)', padding: isMobile ? 16 : 24 }}>
            <h3 style={{ ...sectionTitle, fontSize: isMobile ? 15 : 16 }}>📋 {t('admin.users')}</h3>
            <input
              placeholder={t('admin.searchUsers')}
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              style={{ ...inputS, marginBottom: 12 }}
            />
             <div style={{ maxHeight: isMobile ? undefined : 400, overflowY: isMobile ? undefined : 'auto', overflowX: isMobile ? 'auto' : 'hidden' }}>
               <div className="responsive-table">
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>{t('admin.fullName')}</th>
                      <th style={th}>{t('login.username')}</th>
                      <th style={th}>{t('admin.role')}</th>
                      <th style={th}>{t('admin.teams')}</th>
                      <th style={th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter(u => u.role !== 'SuperAdmin')
                      .filter(u =>
                        !userSearch ||
                        u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.username.toLowerCase().includes(userSearch.toLowerCase())
                      )
                      .map(u => (
                        editingUserId === u.id ? (
                          <tr key={u.id} style={{ background: 'var(--bg-subtle)' }}>
                            <td style={td} colSpan={5}>
                              <form onSubmit={(e) => handleUpdateUser(u.id, e)} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
                                <input name="fullName" defaultValue={u.fullName} placeholder={t('admin.fullName')} style={{ ...inputS, width: isMobile ? '100%' : 140 }} />
                                <input name="password" placeholder={t('admin.newPassword')} type="password" style={{ ...inputS, width: isMobile ? '100%' : 140 }} />
                                <select name="role" defaultValue={u.role} style={{ ...inputS, width: isMobile ? '100%' : 100 }}>
                                  <option value="User">{t('admin.users')}</option>
                                  <option value="Admin">{t('nav.admin')}</option>
                                </select>
                                <select name="teamId" defaultValue={u.teamId ?? ''} required style={{ ...inputS, width: isMobile ? '100%' : 120 }}>
                                  <option value="">{t('admin.selectTeam')}</option>
                                  {teams.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
                                </select>
                                <div style={{ display: 'flex', gap: 8, width: isMobile ? '100%' : 'auto' }}>
                                  <button type="submit" style={{ ...btnS, flex: isMobile ? 1 : undefined }}>{t('admin.save')}</button>
                                  <button type="button" onClick={() => setEditingUserId(null)} style={{ ...btnS, background: '#a0aec0', flex: isMobile ? 1 : undefined }}>{t('admin.cancel')}</button>
                                </div>
                              </form>
                            </td>
                          </tr>
                        ) : (
                          <tr key={u.id}>
                            <td style={td}>{u.fullName}</td>
                            <td style={td}>
                              <code style={{ background: 'var(--bg-subtle)', padding: '2px 8px', borderRadius: 4, fontSize: 12, color: 'var(--text)' }}>{u.username}</code>
                            </td>
                            <td style={td}>
                              <span style={{
                                padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                                background: u.role === 'Admin' ? 'var(--warning-light)' : 'var(--bg-subtle)',
                                color: u.role === 'Admin' ? '#975a16' : 'var(--text-secondary)',
                              }}>{u.role}</span>
                            </td>
                            <td style={td}>{u.teamName || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                            <td style={td}>
                              <button onClick={() => setEditingUserId(u.id)} style={editBtn}>{t('admin.edit')}</button>
                              <button onClick={() => handleDeleteUser(u.id)} style={delBtn}>{t('admin.delete')}</button>
                            </td>
                          </tr>
                        )
                      ))}
                    {users.filter(u => u.role !== 'SuperAdmin').filter(u =>
                      !userSearch || u.fullName.toLowerCase().includes(userSearch.toLowerCase()) || u.username.toLowerCase().includes(userSearch.toLowerCase())
                    ).length === 0 && <tr><td colSpan={5} style={emptyCell}>No users found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'limits' && (
        <div style={{ display: 'flex', gap: isMobile ? 12 : 20, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
          <div style={{ ...card, flex: isMobile ? undefined : '1 1 300px', background: 'var(--bg-card)', padding: isMobile ? 16 : 24 }}>
            <h3 style={{ ...sectionTitle, fontSize: isMobile ? 15 : 16 }}>⚙️ {t('admin.defaultLimit')}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              {t('admin.defaultLimitHint')}
            </p>
            <form onSubmit={handleSetDefaultLimit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input name="defaultLimit" type="number" defaultValue={defaultLimit} min={1} style={inputS} />
              <button type="submit" style={{ ...btnS, width: isMobile ? '100%' : undefined }}>{t('admin.saveDefault')}</button>
            </form>
          </div>
          <div style={{ ...card, flex: isMobile ? undefined : '1 1 300px', background: 'var(--bg-card)', padding: isMobile ? 16 : 24 }}>
            <h3 style={{ ...sectionTitle, fontSize: isMobile ? 15 : 16 }}>🎯 {t('admin.setLimit')}</h3>
            <form onSubmit={handleSetLimit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <select name="userId" required style={inputS}>
                <option value="">{t('admin.selectUser')}</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.username})</option>)}
              </select>
              <input name="monthlyLimit" type="number" placeholder={t('reservations.monthlyLimit')} min={1} style={inputS} />
              <button type="submit" style={{ ...btnS, width: isMobile ? '100%' : undefined }}>{t('admin.setLimit')}</button>
            </form>
          </div>
          <div style={{ ...card, flex: isMobile ? undefined : '2 1 400px', background: 'var(--bg-card)', padding: isMobile ? 16 : 24 }}>
            <h3 style={{ ...sectionTitle, fontSize: isMobile ? 15 : 16 }}>📊 {t('admin.currentLimits')}</h3>
            <div style={tableWrap} className="responsive-table">
              <table style={table}>
                <thead><tr><th style={th}>{t('admin.users')}</th><th style={th}>{t('reservations.monthlyLimit')}</th></tr></thead>
                <tbody>
                  {limits.map(l => {
                    const user = users.find(u => u.id === l.userId);
                    return (
                      <tr key={l.userId}>
                        <td style={td}>{user?.fullName || `User #${l.userId}`}</td>
                        <td style={td}>
                          <span style={{
                            padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                            background: 'var(--primary-light)',
                            color: 'var(--primary)',
                          }}>{l.monthlyLimit}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {limits.length === 0 && <tr><td colSpan={2} style={emptyCell}>No limits set</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const card: React.CSSProperties = {
  background: 'var(--bg-card)', padding: 24, borderRadius: 16, flex: '1 1 320px',
  boxShadow: 'var(--shadow-sm), var(--shadow-md)',
  border: '1px solid var(--border)',
};
const sectionTitle: React.CSSProperties = {
  fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 16,
};
const inputS: React.CSSProperties = {
  padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)',
  fontSize: 14, color: 'var(--text)', background: 'var(--bg-subtle)',
  width: '100%', boxSizing: 'border-box',
};
const btnS: React.CSSProperties = {
  background: '#4f6ef7',
  color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px',
  fontSize: 14, fontWeight: 600, cursor: 'pointer',
};
const delBtn: React.CSSProperties = {
  background: 'var(--danger-light)',
  color: 'var(--danger)', border: '1px solid #fed7d7',
  borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
};
const editBtn: React.CSSProperties = {
  background: 'var(--primary-light)',
  color: 'var(--primary)', border: '1px solid #d4daff',
  borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  marginRight: 6,
};
const tableWrap: React.CSSProperties = {
  border: '1px solid var(--border)', borderRadius: 10,
};
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const th: React.CSSProperties = {
  padding: '10px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
  textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em',
  borderBottom: '1px solid var(--border)', background: 'var(--bg-header)',
};
const td: React.CSSProperties = {
  padding: '12px', fontSize: 13, color: 'var(--text)', borderBottom: '1px solid var(--border-light)',
};
const emptyCell: React.CSSProperties = {
  textAlign: 'center', padding: 32, fontSize: 13, color: 'var(--text-muted)',
};
const statusActive: React.CSSProperties = {
  padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
  background: 'var(--success-light)', color: 'var(--success)', display: 'inline-block',
};
const resBadge: React.CSSProperties = {
  background: 'var(--primary-light)',
  color: 'var(--primary)', padding: '2px 8px', borderRadius: 4,
  fontSize: 11, fontWeight: 500, marginRight: 4, whiteSpace: 'nowrap',
  display: 'inline-block', marginBottom: 2,
};
