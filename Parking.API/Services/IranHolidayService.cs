using System.Globalization;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Web;
using HtmlAgilityPack;

namespace Parking.API.Services;

public class IranHolidayService
{
    private readonly HashSet<string> _holidays;
    private static readonly HttpClient _client = new();
    private static readonly Dictionary<string, int> _monthMap = new()
    {
        {"فروردین", 1},
        {"اردیبهشت", 2},
        {"خرداد", 3},
        {"تیر", 4},
        {"اَمرداد", 5},
        {"مرداد", 5},
        {"شهریور", 6},
        {"مهر", 7},
        {"آبان", 8},
        {"آذر", 9},
        {"دی", 10},
        {"بهمن", 11},
        {"اسفند", 12},
    };

    public IranHolidayService()
    {
        _holidays = LoadHolidaysFromTimeIr();
    }

    public bool IsHoliday(string persianDate) => _holidays.Contains(persianDate);
    public List<string> GetHolidays() => _holidays.ToList();

    private static HashSet<string> LoadHolidaysFromTimeIr()
    {
        var holidays = new HashSet<string>();

        try
        {
            var url = "https://www.time.ir/event-year";
            var html = _client.GetStringAsync(url).GetAwaiter().GetResult();
            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            for (int i = 0; i < 12; i++)
            {
                var monthDiv = doc.DocumentNode.SelectSingleNode($"//div[@id='Month_{i}']");
                if (monthDiv == null) continue;

                var yearText = monthDiv.SelectSingleNode(".//p[contains(@class, 'year')]")
                    ?.InnerText.Trim();
                if (string.IsNullOrEmpty(yearText) || !int.TryParse(yearText, out int year))
                    continue;

                var eventItems = monthDiv.SelectNodes(".//div[contains(@class, 'EventListItem_root')]");
                if (eventItems == null) continue;

                foreach (var item in eventItems)
                {
                    var dateSpan = item.SelectSingleNode(".//span[contains(@class, 'date')]");
                    if (dateSpan == null) continue;

                    var classAttr = dateSpan.GetAttributeValue("class", "");
                    if (!classAttr.Contains("__holiday__")) continue;

                    var text = HttpUtility.HtmlDecode(dateSpan.InnerText.Trim());
                    var match = Regex.Match(text, @"(\d+)\s*([^\d\s]+)");
                    if (!match.Success) continue;

                    var day = int.Parse(match.Groups[1].Value);
                    var monthName = match.Groups[2].Value.Trim();

                    if (!_monthMap.TryGetValue(monthName, out int month)) continue;

                    holidays.Add($"{year:D4}-{month:D2}-{day:D2}");
                }
            }
        }
        catch
        {
            // Fallback to calculated holidays if time.ir is unreachable
            return LoadHolidaysFallback();
        }

        return holidays;
    }

    private static HashSet<string> LoadHolidaysFallback()
    {
        var holidays = new HashSet<string>();
        var pc = new PersianCalendar();
        var hc = new HijriCalendar { HijriAdjustment = -1 };
        var baseDate = new DateTime(2026, 3, 21);

        for (int year = 0; year < 3; year++)
        {
            var yearStart = baseDate.AddYears(year);
            var yearEnd = yearStart.AddYears(1);

            AddFixedHolidays(holidays, pc, yearStart, yearEnd);

            int hijriYear = hc.GetYear(yearStart);
            AddHijriHolidays(holidays, pc, hc, hijriYear, yearStart, yearEnd);
            AddHijriHolidays(holidays, pc, hc, hijriYear + 1, yearStart, yearEnd);
        }

        return holidays;
    }

    private static void AddFixedHolidays(HashSet<string> holidays, PersianCalendar pc,
        DateTime yearStart, DateTime yearEnd)
    {
        for (int i = 0; i < 4; i++)
            holidays.Add(FormatPersianDate(pc, yearStart.AddDays(i)));

        AddIfInRange(holidays, pc, new DateTime(yearStart.Year, 4, 1), yearStart, yearEnd);
        AddIfInRange(holidays, pc, yearStart.AddDays(12), yearStart, yearEnd);
        AddIfInRange(holidays, pc, new DateTime(yearStart.Year, 6, 4), yearStart, yearEnd);
        AddIfInRange(holidays, pc, new DateTime(yearStart.Year, 6, 5), yearStart, yearEnd);
        AddIfInRange(holidays, pc, new DateTime(yearEnd.Year, 2, 11), yearStart, yearEnd);
        AddIfInRange(holidays, pc, new DateTime(yearEnd.Year, 3, 20), yearStart, yearEnd);
    }

    private static void AddHijriHolidays(HashSet<string> holidays, PersianCalendar pc,
        HijriCalendar hc, int hijriYear, DateTime yearStart, DateTime yearEnd)
    {
        var hijriHolidays = new (int Month, int Day)[]
        {
            (1, 9), (1, 10), (2, 20), (2, 28), (2, 30), (3, 17),
            (7, 13), (8, 3), (8, 15), (9, 21), (10, 1), (10, 2),
            (10, 25), (12, 10), (12, 18),
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
