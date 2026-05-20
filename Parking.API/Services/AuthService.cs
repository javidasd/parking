using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Parking.API.Data;
using Parking.API.DTOs;
using Parking.API.Enums;
using Parking.API.Models;

namespace Parking.API.Services;

public class AuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<AuthResponseDto?> LoginAsync(LoginDto dto)
    {
        var user = await _db.Users.Include(u => u.Team).FirstOrDefaultAsync(u => u.Username == dto.Username);
        if (user == null || !VerifyPassword(dto.Password, user.PasswordHash))
            return null;

        return new AuthResponseDto(
            GenerateToken(user),
            user.Username,
            user.FullName,
            user.Role.ToString(),
            user.TeamId
        );
    }

    public async Task<AuthResponseDto?> RegisterAsync(RegisterDto dto)
    {
        if (await _db.Users.AnyAsync(u => u.Username == dto.Username))
            return null;

        var user = new User
        {
            Username = dto.Username,
            PasswordHash = HashPassword(dto.Password),
            FullName = dto.FullName,
            Role = UserRole.User,
            TeamId = dto.TeamId
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        _db.UserParkingLimits.Add(new UserParkingLimit { UserId = user.Id, MonthlyLimit = dto.MonthlyLimit ?? 2 });
        await _db.SaveChangesAsync();

        return new AuthResponseDto(
            GenerateToken(user),
            user.Username,
            user.FullName,
            user.Role.ToString(),
            user.TeamId
        );
    }

    public string GenerateToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("TeamId", user.TeamId?.ToString() ?? ""),
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(
            Encoding.UTF8.GetBytes(password),
            salt,
            100000,
            HashAlgorithmName.SHA256,
            32
        );
        return Convert.ToBase64String(salt) + ":" + Convert.ToBase64String(hash);
    }

    private static bool VerifyPassword(string password, string stored)
    {
        var parts = stored.Split(':');
        if (parts.Length != 2) return false;
        var salt = Convert.FromBase64String(parts[0]);
        var hash = Convert.FromBase64String(parts[1]);
        var computed = Rfc2898DeriveBytes.Pbkdf2(
            Encoding.UTF8.GetBytes(password),
            salt,
            100000,
            HashAlgorithmName.SHA256,
            32
        );
        return CryptographicOperations.FixedTimeEquals(hash, computed);
    }
}
