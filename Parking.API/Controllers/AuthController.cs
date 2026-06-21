using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Parking.API.DTOs;
using Parking.API.Services;

namespace Parking.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _auth;

    public AuthController(AuthService auth) => _auth = auth;

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var result = await _auth.LoginAsync(dto);
        if (result == null) return Unauthorized("Invalid credentials");
        return Ok(result);
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        var result = await _auth.RegisterAsync(dto);
        if (result == null) return BadRequest("Username already exists");
        return Ok(result);
    }

    [HttpPost("sso-callback")]
    public async Task<IActionResult> SsoCallback(SsoCallbackRequestDto dto)
    {
        var result = await _auth.SsoCallbackAsync(dto);
        if (result == null) return Unauthorized("Invalid or expired SSO token");
        return Ok(result);
    }

    [HttpPut("team")]
    [Authorize]
    public async Task<IActionResult> SetTeam(SetTeamDto dto)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var ok = await _auth.SetTeamAsync(userId, dto.TeamId);
        if (!ok) return NotFound("User not found");
        return NoContent();
    }
}
