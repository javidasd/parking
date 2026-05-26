using System.Security.Claims;
using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Parking.API.Data;
using Parking.API.DTOs;
using Parking.API.Models;
using Parking.API.Services;

namespace Parking.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReservationsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IranHolidayService _holidays;

    public ReservationsController(AppDbContext db, IranHolidayService holidays)
    {
        _db = db;
        _holidays = holidays;
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? date)
    {
        var query = _db.Reservations
            .Include(r => r.User)
            .Include(r => r.ParkingSpot)
            .AsQueryable();

        if (!string.IsNullOrEmpty(date))
            query = query.Where(r => r.PersianDate == date);

        var reservations = await query
            .Select(r => new ReservationDto(
                r.Id, r.UserId, r.User.Username,
                r.ParkingSpotId, r.ParkingSpot.Name,
                r.PersianDate, r.CreatedAt, r.IsCancelled))
            .ToListAsync();

        return Ok(reservations);
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMy()
    {
        var userId = GetUserId();
        var reservations = await _db.Reservations
            .Include(r => r.ParkingSpot)
            .Where(r => r.UserId == userId)
            .Select(r => new ReservationDto(
                r.Id, r.UserId, r.User.Username,
                r.ParkingSpotId, r.ParkingSpot.Name,
                r.PersianDate, r.CreatedAt, r.IsCancelled))
            .ToListAsync();
        return Ok(reservations);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateReservationDto dto)
    {
        if (User.IsInRole("SuperAdmin"))
            return BadRequest("SuperAdmin cannot make reservations");

        var userId = GetUserId();

        if (!IsValidPersianDate(dto.PersianDate))
            return BadRequest("Invalid date format. Use YYYY-MM-DD.");

        if (_holidays.IsHoliday(dto.PersianDate))
            return BadRequest("Cannot reserve on holidays");

        var spot = await _db.ParkingSpots.FindAsync(dto.ParkingSpotId);
        if (spot == null || !spot.IsActive)
            return BadRequest("Parking spot not found or inactive");

        var limit = await _db.UserParkingLimits.FirstOrDefaultAsync(l => l.UserId == userId);
        if (limit != null)
        {
            var monthPrefix = dto.PersianDate[..7];
            var monthlyCount = await _db.Reservations
                .CountAsync(r => r.UserId == userId && r.PersianDate.StartsWith(monthPrefix) && !r.IsCancelled);
            if (monthlyCount >= limit.MonthlyLimit)
                return BadRequest($"Monthly limit of {limit.MonthlyLimit} reached");
        }

        var existing = await _db.Reservations
            .AnyAsync(r => r.ParkingSpotId == dto.ParkingSpotId && r.PersianDate == dto.PersianDate && !r.IsCancelled);
        if (existing)
            return BadRequest("Spot already reserved for this date");

        var userReservation = await _db.Reservations
            .AnyAsync(r => r.UserId == userId && r.PersianDate == dto.PersianDate && !r.IsCancelled);
        if (userReservation)
            return BadRequest("You already have a reservation on this date");

        var reservation = new Reservation
        {
            UserId = userId,
            ParkingSpotId = dto.ParkingSpotId,
            PersianDate = dto.PersianDate,
            CreatedAt = DateTime.UtcNow
        };

        _db.Reservations.Add(reservation);
        await _db.SaveChangesAsync();

        await _db.Entry(reservation).Reference(r => r.User).LoadAsync();
        await _db.Entry(reservation).Reference(r => r.ParkingSpot).LoadAsync();

        return Ok(new ReservationDto(
            reservation.Id, reservation.UserId, reservation.User.Username,
            reservation.ParkingSpotId, reservation.ParkingSpot.Name,
            reservation.PersianDate, reservation.CreatedAt, reservation.IsCancelled));
    }

    [HttpPut("{id}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        var userId = GetUserId();
        var reservation = await _db.Reservations.FindAsync(id);

        if (reservation == null) return NotFound();
        if (reservation.UserId != userId && !User.IsInRole("SuperAdmin") && !User.IsInRole("Admin"))
            return Forbid();

        var pc = new PersianCalendar();
        var today = DateTime.UtcNow.Date;
        var parts = reservation.PersianDate.Split('-');
        var resYear = int.Parse(parts[0]);
        var resMonth = int.Parse(parts[1]);
        var resDay = int.Parse(parts[2]);

        if (!User.IsInRole("SuperAdmin") && (
            resYear < pc.GetYear(today) ||
            (resYear == pc.GetYear(today) && resMonth < pc.GetMonth(today)) ||
            (resYear == pc.GetYear(today) && resMonth == pc.GetMonth(today) && resDay < pc.GetDayOfMonth(today))))
        {
            return BadRequest("Cannot cancel past reservations");
        }

        reservation.IsCancelled = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("holidays")]
    [AllowAnonymous]
    public IActionResult GetHolidays()
    {
        return Ok(_holidays.GetHolidays());
    }

    private static bool IsValidPersianDate(string date)
    {
        if (!System.Text.RegularExpressions.Regex.IsMatch(date, @"^\d{4}-\d{2}-\d{2}$"))
            return false;

        var parts = date.Split('-');
        var year = int.Parse(parts[0]);
        var month = int.Parse(parts[1]);
        var day = int.Parse(parts[2]);

        if (year < 1300 || year > 1500 || month < 1 || month > 12) return false;

        var maxDays = month <= 6 ? 31 : (month == 12 ? 29 : 30);

        if (year % 33 is 1 or 2 or 3 or 4 or 5 or 6 or 7 or 8 or 9 or 10 or 11 or 12 or 13 or 14 or 15 or 16 or 17 or 18 or 19 or 20 or 21 or 22 or 23 or 24 or 25 or 26 or 27 or 28 or 29 or 30 or 31 or 32)
        {
            if (year % 33 is 1 or 5 or 9 or 13 or 17 or 21 or 25 or 29)
                if (month == 12) maxDays = 30;
        }

        return day >= 1 && day <= maxDays;
    }
}
