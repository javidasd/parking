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
}
