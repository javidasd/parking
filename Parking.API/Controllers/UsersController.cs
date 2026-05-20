using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Parking.API.Data;
using Parking.API.DTOs;
using Parking.API.Enums;
using Parking.API.Models;
using Parking.API.Services;

namespace Parking.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AuthService _auth;

    public UsersController(AppDbContext db, AuthService auth)
    {
        _db = db;
        _auth = auth;
    }

    [HttpGet]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetAll()
    {
        var users = await _db.Users.Include(u => u.Team)
            .Select(u => new UserDto(u.Id, u.Username, u.FullName, u.Role.ToString(), u.TeamId, u.Team!.Name))
            .ToListAsync();
        return Ok(users);
    }

    [HttpGet("team-members")]
    [Authorize]
    public async Task<IActionResult> GetTeamMembers()
    {
        var currentUserId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        var currentUser = await _db.Users.FindAsync(currentUserId);

        if (currentUser == null) return Unauthorized();

        IQueryable<User> query = _db.Users.Include(u => u.Team);

        if (User.IsInRole("SuperAdmin"))
        {
            var all = await query
                .Select(u => new UserDto(u.Id, u.Username, u.FullName, u.Role.ToString(), u.TeamId, u.Team != null ? u.Team.Name : null))
                .ToListAsync();
            return Ok(all);
        }

        var members = await query
            .Where(u => u.TeamId == currentUser.TeamId)
            .Select(u => new UserDto(u.Id, u.Username, u.FullName, u.Role.ToString(), u.TeamId, u.Team != null ? u.Team.Name : null))
            .ToListAsync();
        return Ok(members);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Create(CreateUserDto dto)
    {
        if (await _db.Users.AnyAsync(u => u.Username == dto.Username))
            return BadRequest("Username already exists");

        if (!Enum.TryParse<UserRole>(dto.Role, out var role))
            return BadRequest("Invalid role");

        if (dto.TeamId.HasValue && !await _db.Teams.AnyAsync(t => t.Id == dto.TeamId.Value))
            return BadRequest("Team not found");

        if (!dto.TeamId.HasValue)
            return BadRequest("Team is required");

        var user = new User
        {
            Username = dto.Username,
            PasswordHash = HashPassword(dto.Password),
            FullName = dto.FullName,
            Role = role,
            TeamId = dto.TeamId
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        _db.UserParkingLimits.Add(new UserParkingLimit { UserId = user.Id, MonthlyLimit = dto.MonthlyLimit ?? 2 });
        await _db.SaveChangesAsync();

        return Ok(new UserDto(user.Id, user.Username, user.FullName, user.Role.ToString(), user.TeamId, null));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Delete(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Update(int id, UpdateUserDto dto)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        if (dto.FullName != null) user.FullName = dto.FullName;
        if (dto.Password != null) user.PasswordHash = HashPassword(dto.Password);
        if (dto.Role != null)
        {
            if (!Enum.TryParse<UserRole>(dto.Role, out var role))
                return BadRequest("Invalid role");
            user.Role = role;
        }
        if (!dto.TeamId.HasValue)
            return BadRequest("Team is required");
        if (!await _db.Teams.AnyAsync(t => t.Id == dto.TeamId.Value))
            return BadRequest("Team not found");
        user.TeamId = dto.TeamId;

        await _db.SaveChangesAsync();
        return Ok(new UserDto(user.Id, user.Username, user.FullName, user.Role.ToString(), user.TeamId, null));
    }

    private static string HashPassword(string password)
    {
        var salt = System.Security.Cryptography.RandomNumberGenerator.GetBytes(16);
        var hash = System.Security.Cryptography.Rfc2898DeriveBytes.Pbkdf2(
            System.Text.Encoding.UTF8.GetBytes(password),
            salt,
            100000,
            System.Security.Cryptography.HashAlgorithmName.SHA256,
            32
        );
        return Convert.ToBase64String(salt) + ":" + Convert.ToBase64String(hash);
    }
}
