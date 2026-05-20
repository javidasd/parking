import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

type Lang = 'en' | 'fa';

const dict: Record<string, Record<Lang, string>> = {
  // Nav
  'nav.calendar': { en: 'Calendar', fa: 'تقویم' },
  'nav.reservations': { en: 'Reservations', fa: 'رزروها' },
  'nav.report': { en: 'Report', fa: 'گزارش' },
  'nav.admin': { en: 'Admin', fa: 'مدیریت' },
  'nav.logout': { en: 'Logout', fa: 'خروج' },

  // Login
  'login.welcome': { en: 'Welcome Back', fa: 'خوش آمدید' },
  'login.subtitle': { en: 'Sign in to your parking account', fa: 'وارد حساب پارکینگ خود شوید' },
  'login.username': { en: 'Username', fa: 'نام کاربری' },
  'login.password': { en: 'Password', fa: 'رمز عبور' },
  'login.placeholder.username': { en: 'Enter your username', fa: 'نام کاربری خود را وارد کنید' },
  'login.placeholder.password': { en: 'Enter your password', fa: 'رمز عبور خود را وارد کنید' },
  'login.signin': { en: 'Sign In', fa: 'ورود' },
  'login.signing': { en: 'Signing in...', fa: 'در حال ورود...' },
  'login.error': { en: 'Invalid username or password', fa: 'نام کاربری یا رمز عبور اشتباه است' },
  'login.demo': { en: 'Demo', fa: 'دمو' },

  // Calendar
  'calendar.title': { en: 'Calendar', fa: 'تقویم' },
  'calendar.subtitle': { en: 'Select a day to reserve a parking spot', fa: 'یک روز را برای رزرو انتخاب کنید' },
  'calendar.holiday': { en: 'Holiday', fa: 'تعطیل' },
  'calendar.off': { en: 'Off', fa: 'تعطیل' },
  'calendar.left': { en: 'left', fa: 'تعداد' },
  'calendar.reserve': { en: 'Reserve for', fa: 'رزرو برای' },
  'calendar.selectSpot': { en: 'Select a spot...', fa: 'یک پارکینگ انتخاب کنید...' },
  'calendar.reserveBtn': { en: 'Reserve Now', fa: 'رزرو کن' },
  'calendar.success': { en: 'Reservation successful!', fa: 'رزرو با موفقیت انجام شد!' },
  'calendar.failed': { en: 'Reservation failed', fa: 'رزرو ناموفق بود' },
  'calendar.legend.today': { en: 'Today', fa: 'امروز' },
  'calendar.legend.weekend': { en: 'Weekend / Holiday', fa: 'آخر هفته / تعطیل' },
  'calendar.legend.partial': { en: 'Partial', fa: 'نیمه پر' },
  'calendar.legend.full': { en: 'Full', fa: 'پر' },
  'calendar.legend.reserved': { en: 'Reserved', fa: 'رزرو شده' },
  'calendar.legend.available': { en: 'Spots available', fa: 'محل خالی' },
  'calendar.prevMonth': { en: 'Previous month', fa: 'ماه قبل' },
  'calendar.nextMonth': { en: 'Next month', fa: 'ماه بعد' },
  'calendar.parkingSpot': { en: 'Parking Spot', fa: 'محل پارکینگ' },

  // Reservations
  'reservations.myTitle': { en: 'My Reservations', fa: 'رزروهای من' },
  'reservations.allTitle': { en: 'All Reservations', fa: 'همه رزروها' },
  'reservations.mySubtitle': { en: 'Manage your parking reservations', fa: 'مدیریت رزروهای پارکینگ شما' },
  'reservations.allSubtitle': { en: 'View all reservations across the system', fa: 'مشاهده همه رزروها در سیستم' },
  'reservations.active': { en: 'Active Reservations', fa: 'رزروهای فعال' },
  'reservations.cancelled': { en: 'Cancelled Reservations', fa: 'رزروهای لغو شده' },
  'reservations.reserved': { en: 'Reserved', fa: 'رزرو شده' },
  'reservations.remaining': { en: 'Remaining', fa: 'باقی مانده' },
  'reservations.monthlyLimit': { en: 'Monthly Limit', fa: 'سقف ماهانه' },
  'reservations.user': { en: 'User', fa: 'کاربر' },
  'reservations.spot': { en: 'Spot', fa: 'محل' },
  'reservations.date': { en: 'Date', fa: 'تاریخ' },
  'reservations.status': { en: 'Status', fa: 'وضعیت' },
  'reservations.action': { en: 'Action', fa: 'عملیات' },
  'reservations.cancel': { en: 'Cancel', fa: 'لغو' },
  'reservations.cancelledLabel': { en: 'Cancelled', fa: 'لغو شده' },
  'reservations.activeLabel': { en: 'Active', fa: 'فعال' },
  'reservations.empty': { en: 'No reservations yet', fa: 'هنوز رزروی ندارید' },
  'reservations.emptyHint': { en: 'Go to the calendar to reserve a parking spot', fa: 'برای رزرو به تقویم مراجعه کنید' },
  'reservations.cancelledMsg': { en: 'Reservation cancelled', fa: 'رزرو لغو شد' },

  // Admin
  'admin.title': { en: 'Admin Panel', fa: 'پنل مدیریت' },
  'admin.subtitle': { en: 'Manage parking spots, teams, users, and limits', fa: 'مدیریت پارکینگ‌ها، تیم‌ها، کاربران و محدودیت‌ها' },
  'admin.spots': { en: 'Spots', fa: 'پارکینگ‌ها' },
  'admin.teams': { en: 'Teams', fa: 'تیم‌ها' },
  'admin.users': { en: 'Users', fa: 'کاربران' },
  'admin.limits': { en: 'Limits', fa: 'محدودیت‌ها' },
  'admin.createSpot': { en: 'Create Spot', fa: 'ایجاد پارکینگ' },
  'admin.name': { en: 'Name', fa: 'نام' },
  'admin.location': { en: 'Location', fa: 'مکان' },
  'admin.existingSpots': { en: 'Existing Spots', fa: 'پارکینگ‌های موجود' },
  'admin.reservations': { en: 'Reservations', fa: 'رزروها' },
  'admin.delete': { en: 'Delete', fa: 'حذف' },
  'admin.createTeam': { en: 'Create Team', fa: 'ایجاد تیم' },
  'admin.existingTeams': { en: 'Existing Teams', fa: 'تیم‌های موجود' },
  'admin.createUser': { en: 'Create User', fa: 'ایجاد کاربر' },
  'admin.searchUsers': { en: 'Search by name or username...', fa: 'جستجو بر اساس نام یا نام کاربری...' },
  'admin.defaultLimit': { en: 'Default Limit', fa: 'محدودیت پیش‌فرض' },
  'admin.defaultLimitHint': { en: 'New users will get this monthly limit by default.', fa: 'کاربران جدید این محدودیت ماهانه را دریافت می‌کنند.' },
  'admin.saveDefault': { en: 'Save Default', fa: 'ذخیره پیش‌فرض' },
  'admin.setLimit': { en: 'Set User Limit', fa: 'تعیین محدودیت کاربر' },
  'admin.currentLimits': { en: 'Current Limits', fa: 'محدودیت‌های فعلی' },
  'admin.spotCreated': { en: 'Parking spot created', fa: 'پارکینگ ایجاد شد' },
  'admin.spotDeactivated': { en: 'Spot deactivated', fa: 'پارکینگ غیرفعال شد' },
  'admin.userCreated': { en: 'User created', fa: 'کاربر ایجاد شد' },
  'admin.userDeleted': { en: 'User deleted', fa: 'کاربر حذف شد' },
  'admin.userUpdated': { en: 'User updated', fa: 'کاربر به‌روز شد' },
  'admin.limitSet': { en: 'Limit set', fa: 'محدودیت تعیین شد' },
  'admin.teamCreated': { en: 'Team created', fa: 'تیم ایجاد شد' },
  'admin.teamDeleted': { en: 'Team deleted', fa: 'تیم حذف شد' },
  'admin.defaultLimitSet': { en: 'Default limit set to', fa: 'محدودیت پیش‌فرض设置为' },
  'admin.edit': { en: 'Edit', fa: 'ویرایش' },
  'admin.save': { en: 'Save', fa: 'ذخیره' },
  'admin.cancel': { en: 'Cancel', fa: 'انصراف' },
  'admin.members': { en: 'members', fa: 'عضو' },
  'admin.noTeam': { en: 'No team', fa: 'بدون تیم' },
  'admin.selectTeam': { en: 'Select team...', fa: 'انتخاب تیم...' },
  'admin.selectUser': { en: 'Select user...', fa: 'انتخاب کاربر...' },
  'admin.fullName': { en: 'Full name', fa: 'نام کامل' },
  'admin.password': { en: 'Password', fa: 'رمز عبور' },
  'admin.newPassword': { en: 'New password', fa: 'رمز جدید' },
  'admin.role': { en: 'Role', fa: 'نقش' },

  // Report
  'report.title': { en: 'Team Report', fa: 'گزارش تیم' },
  'report.subtitle.all': { en: 'Usage overview for all teams', fa: 'نمای کلی استفاده برای همه تیم‌ها' },
  'report.subtitle.team': { en: 'Usage overview for your team', fa: 'نمای کلی استفاده برای تیم شما' },
  'report.members': { en: 'Team Members', fa: 'اعضای تیم' },
  'report.activeReservations': { en: 'Active Reservations', fa: 'رزروهای فعال' },
  'report.cancelled': { en: 'Cancelled', fa: 'لغو شده' },
  'report.total': { en: 'Total Reservations', fa: 'کل رزروها' },
  'report.member': { en: 'Member', fa: 'عضو' },
  'report.active': { en: 'Active', fa: 'فعال' },
  'report.totalLabel': { en: 'Total', fa: 'مجموع' },
  'report.usage': { en: 'Usage', fa: 'میزان استفاده' },
  'report.noData': { en: 'No data available', fa: 'داده‌ای موجود نیست' },
  'report.loading': { en: 'Loading report...', fa: 'در حال بارگذاری گزارش...' },
  'report.membersCount': { en: 'members', fa: 'عضو' },
  'report.reservationsCount': { en: 'reservations', fa: 'رزرو' },
  'report.from': { en: 'From', fa: 'از' },
  'report.to': { en: 'To', fa: 'تا' },
  'nav.changePassword': { en: 'Change Password', fa: 'تغییر رمز عبور' },

  // General
  'general.month1': { en: 'Farvardin', fa: 'فروردین' },
  'general.month2': { en: 'Ordibehesht', fa: 'اردیبهشت' },
  'general.month3': { en: 'Khordad', fa: 'خرداد' },
  'general.month4': { en: 'Tir', fa: 'تیر' },
  'general.month5': { en: 'Mordad', fa: 'مرداد' },
  'general.month6': { en: 'Shahrivar', fa: 'شهریور' },
  'general.month7': { en: 'Mehr', fa: 'مهر' },
  'general.month8': { en: 'Aban', fa: 'آبان' },
  'general.month9': { en: 'Azar', fa: 'آذر' },
  'general.month10': { en: 'Dey', fa: 'دی' },
  'general.month11': { en: 'Bahman', fa: 'بهمن' },
  'general.month12': { en: 'Esfand', fa: 'اسفند' },
};

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

const LangContext = createContext<LangContextType | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem('lang') as Lang) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = useCallback((key: string): string => {
    return dict[key]?.[lang] ?? dict[key]?.en ?? key;
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, t, dir: lang === 'fa' ? 'rtl' : 'ltr' }}>
      {children}
    </LangContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useTranslation must be used within LangProvider');
  return ctx;
}

export type { Lang };
