using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Parking.API.Data;
using Parking.API.DTOs;
using Parking.API.Models;

namespace Parking.API.Controllers;

[ApiController]
[Route("api/limits")]
public class UserParkingLimitsController : ControllerBase
{
    private readonly AppDbContext _db;

    public UserParkingLimitsController(AppDbContext db) => _db = db;

    [HttpGet]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> GetAll()
    {
        var limits = await _db.UserParkingLimits
            .Include(l => l.User)
            .Select(l => new UserParkingLimitDto(l.Id, l.UserId, l.User.Username, l.MonthlyLimit))
            .ToListAsync();
        return Ok(limits);
    }

    [HttpGet("my")]
    [Authorize]
    public async Task<IActionResult> GetMy()
    {
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        var limit = await _db.UserParkingLimits.FirstOrDefaultAsync(l => l.UserId == userId);
        if (limit == null)
            return Ok(new MyLimitDto(0, 0));

        var now = DateTime.UtcNow;
        var pc = new System.Globalization.PersianCalendar();
        var persianMonth = $"{pc.GetYear(now)}-{pc.GetMonth(now):D2}";
        var used = await _db.Reservations
            .CountAsync(r => r.UserId == userId && r.PersianDate.StartsWith(persianMonth) && !r.IsCancelled);

        return Ok(new MyLimitDto(limit.MonthlyLimit, used));
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> Set(SetParkingLimitDto dto)
    {
        var userExists = await _db.Users.AnyAsync(u => u.Id == dto.UserId);
        if (!userExists) return NotFound("User not found");

        var limit = await _db.UserParkingLimits.FirstOrDefaultAsync(l => l.UserId == dto.UserId);
        if (limit == null)
        {
            limit = new UserParkingLimit { UserId = dto.UserId, MonthlyLimit = dto.MonthlyLimit };
            _db.UserParkingLimits.Add(limit);
        }
        else
        {
            limit.MonthlyLimit = dto.MonthlyLimit;
        }

        await _db.SaveChangesAsync();
        return Ok(new UserParkingLimitDto(limit.Id, limit.UserId, "", limit.MonthlyLimit));
    }
}
