import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { useTranslation } from '../i18n';
import type { ParkingSpot, Reservation } from '../types';

function formatPersianDate(year: number, month: number, day: number): string {
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

const persianMonthNames = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const persianWeekDays = ['جمعه', 'پنجشنبه', 'چهارشنبه', 'سه‌شنبه', 'دوشنبه', 'یکشنبه', 'شنبه'];

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
  return { year: 2025, month: 3, day: 20 };
}

function getDaysInPersianMonth(year: number, month: number): number {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const firstOfNext = persianToGregorian(nextYear, nextMonth, 1);
  const lastOfCurrent = new Date(Date.UTC(firstOfNext.year, firstOfNext.month - 1, firstOfNext.day - 1));
  const p = gregorianToPersian(lastOfCurrent.getUTCFullYear(), lastOfCurrent.getUTCMonth() + 1, lastOfCurrent.getUTCDate());
  return p.day;
}

function getDayOfWeek(year: number, month: number): number {
  const { year: gy, month: gm, day: gd } = persianToGregorian(year, month, 1);
  const d = new Date(Date.UTC(gy, gm - 1, gd));
  const dayOfWeek = d.getUTCDay();
  return (dayOfWeek + 1) % 7;
}

export function ParkingCalendar() {
  const { t } = useTranslation();
  const { isAuthenticated, isSuperAdmin } = useAuth();
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const now = new Date();
  const iranMs = now.getTime() - now.getTimezoneOffset() * 60000 + 12600000;
  const iranNow = new Date(iranMs);
  const todayPersian = gregorianToPersian(iranNow.getUTCFullYear(), iranNow.getUTCMonth() + 1, iranNow.getUTCDate());
  const [currentYear, setCurrentYear] = useState(todayPersian.year);
  const [currentMonth, setCurrentMonth] = useState(todayPersian.month);
  const todayStr = formatPersianDate(todayPersian.year, todayPersian.month, todayPersian.day);

  useEffect(() => {
    api.parkingSpots.getAll().then(setSpots).catch(() => {});
    api.reservations.getHolidays().then(setHolidays).catch(() => {});
  }, []);

  const loadReservations = useCallback(async () => {
    const prefix = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
    try {
      const all = await api.reservations.getAll();
      setReservations((all || []).filter((r: Reservation) => r.persianDate.startsWith(prefix)));
    } catch { setReservations([]); }
  }, [currentYear, currentMonth]);

  useEffect(() => { loadReservations(); }, [loadReservations]);

  const daysInMonth = getDaysInPersianMonth(currentYear, currentMonth);
  const startDayOfWeek = getDayOfWeek(currentYear, currentMonth);
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  const totalSpots = spots.filter(s => s.isActive).length;

  const isHoliday = (day: number) => holidays.includes(formatPersianDate(currentYear, currentMonth, day));
  const isPast = (day: number) => {
    if (currentYear < todayPersian.year) return true;
    if (currentYear > todayPersian.year) return false;
    if (currentMonth < todayPersian.month) return true;
    if (currentMonth > todayPersian.month) return false;
    return day < todayPersian.day;
  };
  const canReserve = (day: number) => !isPast(day) && !isHoliday(day);
  const isToday = (day: number) => todayStr === formatPersianDate(currentYear, currentMonth, day);

  const getReservationsForDay = (day: number) => {
    const dateStr = formatPersianDate(currentYear, currentMonth, day);
    return reservations.filter(r => r.persianDate === dateStr && !r.isCancelled);
  };

  const handleReserve = async () => {
    if (!selectedDate || !selectedSpot) return;
    setMessage('');
    try {
      await api.reservations.create({ parkingSpotId: selectedSpot, persianDate: selectedDate });
      setMessageType('success');
      setMessage(t('calendar.success'));
      loadReservations();
    } catch (err: unknown) {
      setMessageType('error');
      setMessage((err as Error).message || t('calendar.failed'));
    }
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const handleNextMonth = () => {
    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  return (
    <div style={c.page}>
      <div style={c.header}>
        <div>
          <h2 style={c.title}>📅 {t('calendar.title')}</h2>
          <p style={c.headerSub}>{t('calendar.subtitle')}</p>
        </div>
        <div style={c.monthNav}>
          <button onClick={handlePrevMonth} style={c.navBtn} title={t('calendar.prevMonth')}>◀</button>
          <div style={c.monthLabel}>
            <span style={c.monthName}>{persianMonthNames[currentMonth - 1]}</span>
            <span style={c.monthYear}>{currentYear}</span>
          </div>
          <button onClick={handleNextMonth} style={c.navBtn} title={t('calendar.nextMonth')}>▶</button>
        </div>
      </div>

      <div style={c.calendarCard}>
        <div style={c.weekRow}>
          {persianWeekDays.map((d, idx) => (
            <div key={d} style={{ ...c.weekDay, ...(idx <= 1 ? { color: '#e53e3e' } : {}) }}>{d}</div>
          ))}
        </div>
        <div style={c.grid}>
          {Array.from({ length: Math.ceil(calendarDays.length / 7) }, (_, weekIdx) =>
            Array.from({ length: 7 }, (_, dayIdx) => {
              const day = calendarDays[weekIdx * 7 + (6 - dayIdx)];
              if (day == null) return <div key={dayIdx} style={c.cell} />;
              const dateStr = formatPersianDate(currentYear, currentMonth, day);
              const dayReservations = getReservationsForDay(day);
              const fillLevel = totalSpots > 0 ? dayReservations.length / totalSpots : 0;
              const full = fillLevel >= 1;
              const partial = fillLevel > 0 && !full;
              const holiday = isHoliday(day);
              const past = isPast(day);
              const today = isToday(day);
              const weekend = dayIdx === 0 || dayIdx === 1;
              const clickable = canReserve(day) && !weekend && !isSuperAdmin;

              return (
                <div
                  key={dayIdx}
                  onClick={() => { if (clickable) { setSelectedDate(dateStr); setSelectedSpot(null); setMessage(''); } }}
                  style={{
                    ...c.cell,
                    ...(holiday || weekend ? c.cellWeekend : {}),
                    ...(today ? c.cellToday : {}),
                    ...(past ? c.cellPast : {}),
                    ...(full ? c.cellFull : {}),
                    ...(partial && !full ? c.cellPartial : {}),
                    ...(clickable ? c.cellClickable : {}),
                    cursor: clickable ? 'pointer' : 'default',
                  }}
                >
                  <span style={{
                    ...c.dayNum,
                    ...(today ? c.dayNumToday : {}),
                    ...(full ? c.dayNumFull : {}),
                  }}>{day}</span>
                  <div style={c.cellContent}>
                    {dayReservations.length > 0 ? (
                      <div style={c.resList}>
                        {dayReservations.map((r, ri) => (
                          <div key={r.id} style={c.resItem}>
                            <span style={{ ...c.spotBadge }}>{r.parkingSpotName}</span>
                            <span style={c.userLabel}>{r.username}</span>
                          </div>
                        ))}
                      </div>
                    ) : clickable ? (
                      <span style={c.freeBadge}>{totalSpots - dayReservations.length} {t('calendar.left')}</span>
                    ) : null}
                    {holiday && <span style={c.holidayBadge}>{t('calendar.holiday')}</span>}
                    {weekend && !holiday && <span style={c.offBadge}>{t('calendar.off')}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedDate && !isSuperAdmin && (
        <div style={c.reserveCard}>
          <div style={c.reserveHeader}>
            <h3 style={c.reserveTitle}>{t('calendar.reserve')} <span style={c.reserveDate}>{selectedDate}</span></h3>
            <button onClick={() => { setSelectedDate(null); setMessage(''); }} style={c.closeBtn}>✕</button>
          </div>
          <div style={c.reserveBody}>
            <div style={c.reserveField}>
              <label style={c.reserveLabel}>{t('calendar.parkingSpot')}</label>
              <select
                value={selectedSpot ?? ''}
                onChange={e => setSelectedSpot(Number(e.target.value))}
                style={c.reserveSelect}
              >
                <option value="">{t('calendar.selectSpot')}</option>
                {spots.filter(s => s.isActive).map(s => {
                  const reserved = selectedDate ? reservations.find(r => r.parkingSpotId === s.id && r.persianDate === selectedDate && !r.isCancelled) : null;
                  return (
                    <option key={s.id} value={s.id} disabled={!!reserved}>
                      {s.name} — {s.location}{reserved ? ` (${reserved.username})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            <button onClick={handleReserve} style={c.reserveBtn} disabled={!selectedSpot || !isAuthenticated}>
              {t('calendar.reserveBtn')}
            </button>
          </div>
          {message && (
            <div style={{ ...c.message, background: 'var(--success-light)', color: 'var(--success)' }}>
              {messageType === 'success' ? '✓' : '✕'} {message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const c: Record<string, React.CSSProperties> = {
  page: { animation: 'fadeIn 0.3s ease-out' },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 4 },
  headerSub: { fontSize: 14, color: 'var(--text-muted)' },
  monthNav: { display: 'flex', alignItems: 'center', gap: 6 },
  monthLabel: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    minWidth: 140, padding: '6px 18px',
    background: 'var(--bg-subtle)',
    borderRadius: 12, border: '1px solid var(--border)',
  },
  monthName: { fontSize: 17, fontWeight: 700, color: 'var(--text)' },
  monthYear: { fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 },
  navBtn: {
    width: 38, height: 38, borderRadius: 10,
    border: '1px solid var(--border)', background: 'var(--bg-card)',
    color: 'var(--text-secondary)', fontSize: 22, fontWeight: 400,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', lineHeight: 1,
    boxShadow: 'var(--shadow-sm)',
  },
  calendarCard: {
    background: 'var(--bg-card)', borderRadius: 16,
    boxShadow: 'var(--shadow-md)',
    overflow: 'hidden', border: '1px solid var(--border)',
  },
  weekRow: {
    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
    borderBottom: '1px solid var(--border)',
  },
  weekDay: {
    padding: '12px 8px', fontSize: 12, fontWeight: 600,
    color: 'var(--text-secondary)', textAlign: 'center',
    background: 'var(--bg-header)',
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
  },
  cell: {
    minHeight: 88, padding: '8px 6px',
    borderBottom: '1px solid var(--border-light)',
    borderRight: '1px solid var(--border-light)',
    position: 'relative', transition: 'all 0.15s ease',
    display: 'flex', flexDirection: 'column',
    background: 'var(--bg-card)',
  },
  cellWeekend: { background: 'var(--bg-subtle)' },
  cellToday: { background: 'var(--primary-light)', boxShadow: 'inset 0 0 0 2px #4f6ef7' },
  cellPast: { opacity: 0.35 },
  cellFull: { background: 'var(--danger-light)' },
  cellPartial: { background: 'var(--warning-light)' },
  cellClickable: {},
  dayNum: { fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 2, textAlign: 'center' as any, width: '100%', display: 'block' },
  dayNumToday: { fontWeight: 700, fontSize: 14, color: '#4f6ef7' },
  dayNumFull: { color: '#fc8181' },
  cellContent: { display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2, flex: 1 },
  resList: { display: 'flex', flexDirection: 'column', gap: 2 },
  resItem: { display: 'flex', alignItems: 'center', gap: 3 },
  spotBadge: {
    color: '#fff', fontSize: 10, fontWeight: 700,
    padding: '2px 6px', borderRadius: 4, lineHeight: '16px',
    display: 'inline-block', whiteSpace: 'nowrap', background: '#4f6ef7',
  },
  userLabel: {
    color: 'var(--text-secondary)', fontSize: 10, fontWeight: 500,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 50,
  },
  freeBadge: { color: '#68d391', fontSize: 11, fontWeight: 600 },
  holidayBadge: { fontSize: 10, color: '#fc8181', fontWeight: 600 },
  offBadge: { fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 },
  reserveCard: {
    background: 'var(--bg-card)', padding: 24, borderRadius: 16, marginTop: 20,
    boxShadow: 'var(--shadow-md)',
    border: '1px solid var(--border)',
    animation: 'slideUp 0.25s ease-out',
  },
  reserveHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 18,
  },
  reserveTitle: { fontSize: 15, fontWeight: 600, color: 'var(--text)' },
  reserveDate: {
    background: 'var(--primary-light)',
    color: 'var(--primary)', fontWeight: 700,
    padding: '2px 10px', borderRadius: 6,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg-subtle)',
    color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  reserveBody: { display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' },
  reserveField: { flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 6 },
  reserveLabel: { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' },
  reserveSelect: {
    padding: '10px 14px', borderRadius: 10,
    border: '1.5px solid var(--border)', fontSize: 14, color: 'var(--text)',
    background: 'var(--bg-subtle)', width: '100%',
  },
  reserveBtn: {
    background: '#4f6ef7',
    color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px',
    fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  },
  message: {
    marginTop: 14, padding: '10px 14px', borderRadius: 8,
    fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
  },
  legend: {
    marginTop: 16, display: 'flex', gap: 20, fontSize: 12,
    color: 'var(--text-muted)', flexWrap: 'wrap',
    padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 12,
    border: '1px solid var(--border)',
  },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6 },
  legendBadge: {
    background: '#4f6ef7',
    color: '#fff', padding: '1px 5px', borderRadius: 3, fontSize: 10, fontWeight: 700,
  },
};
