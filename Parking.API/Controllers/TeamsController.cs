using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Parking.API.Data;
using Parking.API.DTOs;
using Parking.API.Models;


namespace Parking.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdmin")]
public class TeamsController : ControllerBase
{
    private readonly AppDbContext _db;

    public TeamsController(AppDbContext db) => _db = db;

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var teams = await _db.Teams.Select(t => new TeamDto(t.Id, t.Name)).ToListAsync();
        return Ok(teams);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateTeamDto dto)
    {
        if (await _db.Teams.AnyAsync(t => t.Name == dto.Name))
            return BadRequest("Team already exists");

        var team = new Team { Name = dto.Name };
        _db.Teams.Add(team);
        await _db.SaveChangesAsync();
        return Ok(new TeamDto(team.Id, team.Name));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var team = await _db.Teams.FindAsync(id);
        if (team == null) return NotFound();

        var users = await _db.Users.Where(u => u.TeamId == id).ToListAsync();
        foreach (var u in users) u.TeamId = null;

        var spots = await _db.ParkingSpots.Where(s => s.TeamId == id).ToListAsync();
        foreach (var s in spots) s.TeamId = null;

        _db.Teams.Remove(team);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
