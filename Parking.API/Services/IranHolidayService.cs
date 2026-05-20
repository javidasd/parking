using System.Globalization;

namespace Parking.API.Services;

public class IranHolidayService
{
    private readonly HashSet<string> _holidays;

    public IranHolidayService()
    {
        _holidays = LoadHolidays();
    }

    public bool IsHoliday(string persianDate) => _holidays.Contains(persianDate);
    public List<string> GetHolidays() => _holidays.ToList();

    private static HashSet<string> LoadHolidays()
    {
        var holidays = new HashSet<string>();
        var pc = new PersianCalendar();
        var hc = new HijriCalendar();
        var baseDate = new DateTime(2026, 3, 21);

        for (int year = 0; year < 3; year++)
        {
            var yearStart = baseDate.AddYears(year);
            var yearEnd = yearStart.AddYears(1);

            // Fixed Persian holidays
            AddFixedHolidays(holidays, pc, yearStart, yearEnd);

            // Religious holidays from Hijri years that overlap this Persian year
            int hijriYear = hc.GetYear(yearStart);
            AddHijriHolidays(holidays, pc, hc, hijriYear, yearStart, yearEnd);
            AddHijriHolidays(holidays, pc, hc, hijriYear + 1, yearStart, yearEnd);
        }

        return holidays;
    }

    private static void AddFixedHolidays(HashSet<string> holidays, PersianCalendar pc,
        DateTime yearStart, DateTime yearEnd)
    {
        int py = pc.GetYear(yearStart);

        // Nowruz (1-4 Farvardin)
        for (int i = 0; i < 4; i++)
            holidays.Add(FormatPersianDate(pc, yearStart.AddDays(i)));

        // 12 Farvardin - Islamic Republic Day (April 1)
        AddIfInRange(holidays, pc, new DateTime(yearStart.Year, 4, 1), yearStart, yearEnd);

        // 13 Farvardin - Sizdah Bedar (April 2 = March 21 + 12)
        AddIfInRange(holidays, pc, yearStart.AddDays(12), yearStart, yearEnd);

        // 14 Khordad - Death of Imam Khomeini (June 4)
        AddIfInRange(holidays, pc, new DateTime(yearStart.Year, 6, 4), yearStart, yearEnd);

        // 15 Khordad - Uprising (June 5)
        AddIfInRange(holidays, pc, new DateTime(yearStart.Year, 6, 5), yearStart, yearEnd);

        // 22 Bahman - Revolution Day (Feb 11, in NEXT Gregorian year)
        AddIfInRange(holidays, pc, new DateTime(yearEnd.Year, 2, 11), yearStart, yearEnd);

        // 29 Esfand - Oil Nationalization Day (March 20, in NEXT Gregorian year)
        var oilDay = new DateTime(yearEnd.Year, 3, 20);
        AddIfInRange(holidays, pc, oilDay, yearStart, yearEnd);
    }

    private static void AddHijriHolidays(HashSet<string> holidays, PersianCalendar pc,
        HijriCalendar hc, int hijriYear, DateTime yearStart, DateTime yearEnd)
    {
        var hijriHolidays = new (int Month, int Day)[]
        {
            (1, 9),   // Tasua
            (1, 10),  // Ashura
            (2, 20),  // Arbaeen
            (2, 28),  // Demise of Prophet Muhammad
            (2, 30),  // Martyrdom of Imam Reza
            (3, 17),  // Birth of Prophet Muhammad & Imam Ja'far Sadiq
            (7, 13),  // Birth of Imam Ali
            (8, 3),   // Birth of Imam Hussein
            (8, 15),  // Birth of Imam Mahdi
            (9, 21),  // Martyrdom of Imam Ali
            (10, 1),  // Eid al-Fitr
            (10, 2),  // Eid al-Fitr (2nd day)
            (10, 25), // Martyrdom of Imam Ja'far Sadiq
            (12, 10), // Eid al-Adha
            (12, 18), // Eid al-Ghadir
        };

        foreach (var (month, day) in hijriHolidays)
        {
            try
            {
                var dt = hc.ToDateTime(hijriYear, month, day, 0, 0, 0, 0);
                if (dt >= yearStart && dt < yearEnd)
                    holidays.Add(FormatPersianDate(pc, dt));
            }
            catch (ArgumentOutOfRangeException)
            {
            }
        }
    }

    private static void AddIfInRange(HashSet<string> holidays, PersianCalendar pc,
        DateTime dt, DateTime yearStart, DateTime yearEnd)
    {
        if (dt >= yearStart && dt < yearEnd)
            holidays.Add(FormatPersianDate(pc, dt));
    }

    private static string FormatPersianDate(PersianCalendar pc, DateTime dt)
    {
        return $"{pc.GetYear(dt):0000}-{pc.GetMonth(dt):00}-{pc.GetDayOfMonth(dt):00}";
    }
}
