using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
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
    private readonly HttpClient _httpClient;
    private readonly ILogger<AuthService> _logger;

    public AuthService(AppDbContext db, IConfiguration config, HttpClient httpClient, ILogger<AuthService> logger)
    {
        _db = db;
        _config = config;
        _httpClient = httpClient;
        _logger = logger;
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

    public async Task<SsoCallbackResponseDto?> SsoCallbackAsync(SsoCallbackRequestDto dto)
    {
        var heimdallBaseUrl = _config["Heimdall:BaseUrl"]!;
        var serviceId = _config["Heimdall:ServiceId"]!;

        var validateRequest = new { sso_token = dto.SsoToken, service_id = serviceId };
        var json = JsonSerializer.Serialize(validateRequest);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        _logger.LogInformation("SsoCallbackAsync: calling Heimdall validate-token for token suffix={Suffix}", 
            dto.SsoToken.Length > 10 ? dto.SsoToken[^10..] : dto.SsoToken);

        var response = await _httpClient.PostAsync($"{heimdallBaseUrl}/v1/sso/validate-token", content);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            _logger.LogWarning("Heimdall validate-token returned {Status}: {Body}", response.StatusCode, errorBody);
            return null;
        }

        var responseJson = await response.Content.ReadAsStringAsync();
        _logger.LogInformation("Heimdall response: {Json}", responseJson);

        using var doc = JsonDocument.Parse(responseJson);

        var root = doc.RootElement;
        if (!root.GetProperty("success").GetBoolean())
        {
            _logger.LogWarning("Heimdall validate-token returned success=false: {Json}", responseJson);
            return null;
        }

        var data = root.GetProperty("data");
        var phoneNumber = data.GetProperty("phoneNumber").GetString()!;
        var foodId = data.GetProperty("food_id").GetInt64();
        var firstName = data.TryGetProperty("firstName", out var fn) ? fn.GetString() : null;
        var lastName = data.TryGetProperty("lastName", out var ln) ? ln.GetString() : null;

        _logger.LogInformation("Heimdall parsed: phone={Phone}, foodId={FoodId}, first={First}, last={Last}", 
            phoneNumber, foodId, firstName, lastName);

        var existingUser = await _db.Users.Include(u => u.Team)
            .FirstOrDefaultAsync(u => u.Username == foodId.ToString());

        if (existingUser != null)
        {
            _logger.LogInformation("User found in DB, returning token for user={Username}", existingUser.Username);
            return new SsoCallbackResponseDto(
                GenerateToken(existingUser),
                existingUser.Username,
                existingUser.FullName,
                existingUser.Role.ToString(),
                existingUser.TeamId,
                false,
                null,
                null, null,
                false
            );
        }

        var displayName = dto.FullName;
        if (string.IsNullOrEmpty(displayName))
            displayName = $"{firstName} {lastName}".Trim();

        _logger.LogInformation("Creating new SSO user with foodId={FoodId}, name={Name}", 
            foodId, displayName);

        var newUser = new User
        {
            Username = foodId.ToString(),
            PasswordHash = "",
            FullName = displayName,
            Role = UserRole.User,
            TeamId = null,
            Source = "SSO"
        };

        _db.Users.Add(newUser);
        await _db.SaveChangesAsync();

        _db.UserParkingLimits.Add(new UserParkingLimit { UserId = newUser.Id, MonthlyLimit = 0 });
        await _db.SaveChangesAsync();

        return new SsoCallbackResponseDto(
            GenerateToken(newUser),
            newUser.Username,
            newUser.FullName,
            newUser.Role.ToString(),
            newUser.TeamId,
            false,
            null,
            null, null,
            true
        );
    }

    public async Task<bool> SetTeamAsync(int userId, int teamId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return false;

        user.TeamId = teamId;
        await _db.SaveChangesAsync();
        return true;
    }

    public string GetHeimdallBaseUrl() => _config["Heimdall:BaseUrl"] ?? "";
    public string GetHeimdallServiceId() => _config["Heimdall:ServiceId"] ?? "";

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
