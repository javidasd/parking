using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Parking.API.Data;
using Parking.API.DTOs;
using Parking.API.Models;

namespace Parking.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ParkingSpotsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ParkingSpotsController(AppDbContext db) => _db = db;

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] int? teamId)
    {
        var query = _db.ParkingSpots.Include(s => s.Team).AsQueryable();

        if (User.Identity?.IsAuthenticated == true
            && !User.IsInRole("SuperAdmin")
            && !User.IsInRole("Admin"))
        {
            var tid = User.FindFirstValue("TeamId");
            if (int.TryParse(tid, out var t))
                query = query.Where(s => s.TeamId == t);
        }
        else if (teamId.HasValue)
        {
            query = query.Where(s => s.TeamId == teamId.Value);
        }

        var spots = await query
            .Select(s => new ParkingSpotDto(s.Id, s.Name, s.Location, s.IsActive, s.TeamId, s.Team!.Name))
            .ToListAsync();
        return Ok(spots);
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(int id)
    {
        var spot = await _db.ParkingSpots.Include(s => s.Team).FirstOrDefaultAsync(s => s.Id == id);
        if (spot == null) return NotFound();
        return Ok(new ParkingSpotDto(spot.Id, spot.Name, spot.Location, spot.IsActive, spot.TeamId, spot.Team?.Name));
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> Create(CreateParkingSpotDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await _db.Users.FindAsync(userId);

        int? teamId = dto.TeamId;
        if (!teamId.HasValue && user!.TeamId.HasValue && !User.IsInRole("SuperAdmin"))
            teamId = user.TeamId;

        var spot = new ParkingSpot
        {
            Name = dto.Name,
            Location = dto.Location,
            TeamId = teamId
        };
        _db.ParkingSpots.Add(spot);
        await _db.SaveChangesAsync();
        return Ok(new ParkingSpotDto(spot.Id, spot.Name, spot.Location, spot.IsActive, spot.TeamId, null));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> Update(int id, CreateParkingSpotDto dto)
    {
        var spot = await _db.ParkingSpots.FindAsync(id);
        if (spot == null) return NotFound();
        spot.Name = dto.Name;
        spot.Location = dto.Location;
        if (dto.TeamId.HasValue && User.IsInRole("SuperAdmin"))
            spot.TeamId = dto.TeamId;
        await _db.SaveChangesAsync();
        return Ok(new ParkingSpotDto(spot.Id, spot.Name, spot.Location, spot.IsActive, spot.TeamId, null));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var spot = await _db.ParkingSpots.FindAsync(id);
        if (spot == null) return NotFound();
        spot.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
