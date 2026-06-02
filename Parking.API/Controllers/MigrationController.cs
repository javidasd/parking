using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Parking.API.Data;
using Parking.API.Models;

namespace Parking.API.Controllers;

[ApiController]
[Route("api/migrate")]
public class MigrationController : ControllerBase
{
    private readonly AppDbContext _db;

    public MigrationController(AppDbContext db)
    {
        _db = db;
    }

    [HttpPost("from-sqlite")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> FromSqlite(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded");

        var tmpPath = Path.GetTempFileName();
        await using (var stream = new FileStream(tmpPath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        try
        {
            return await MigrateFromPath(tmpPath);
        }
        finally
        {
            System.IO.File.Delete(tmpPath);
        }
    }

    private async Task<IActionResult> MigrateFromPath(string path)
    {
        var result = new Dictionary<string, int>();

        using var sl = new SqliteConnection($"Data Source={path}");
        await sl.OpenAsync();

        // Read all data from SQLite in order
        var teams = await QueryTableAsync(sl, "Teams");
        var users = await QueryTableAsync(sl, "Users");
        var spots = await QueryTableAsync(sl, "ParkingSpots");
        var reservations = await QueryTableAsync(sl, "Reservations");
        var limits = await QueryTableAsync(sl, "UserParkingLimits");

        // Clear existing MySQL data (reverse FK order)
        _db.UserParkingLimits.RemoveRange(_db.UserParkingLimits);
        _db.Reservations.RemoveRange(_db.Reservations);
        _db.ParkingSpots.RemoveRange(_db.ParkingSpots);
        _db.Users.RemoveRange(_db.Users);
        _db.Teams.RemoveRange(_db.Teams);
        await _db.SaveChangesAsync();

        // Reset auto-increment
        await ResetAutoIncrement("UserParkingLimits");
        await ResetAutoIncrement("Reservations");
        await ResetAutoIncrement("ParkingSpots");
        await ResetAutoIncrement("Users");
        await ResetAutoIncrement("Teams");

        // Insert Teams
        foreach (var row in teams)
        {
            _db.Teams.Add(new Team { Id = ToInt(row["Id"]), Name = (string)row["Name"] });
        }
        result["Teams"] = await _db.SaveChangesAsync();

        // Insert Users
        foreach (var row in users)
        {
            _db.Users.Add(new User
            {
                Id = ToInt(row["Id"]),
                Username = (string)row["Username"],
                PasswordHash = (string)row["PasswordHash"],
                FullName = (string)row["FullName"],
                Role = (Parking.API.Enums.UserRole)ToInt(row["Role"]),
                TeamId = ToNullableInt(row["TeamId"])
            });
        }
        result["Users"] = await _db.SaveChangesAsync();

        // Insert ParkingSpots
        foreach (var row in spots)
        {
            _db.ParkingSpots.Add(new ParkingSpot
            {
                Id = ToInt(row["Id"]),
                Name = (string)row["Name"],
                Location = (string)row["Location"],
                IsActive = (long)row["IsActive"] == 1,
                TeamId = ToNullableInt(row["TeamId"])
            });
        }
        result["ParkingSpots"] = await _db.SaveChangesAsync();

        // Insert Reservations
        foreach (var row in reservations)
        {
            _db.Reservations.Add(new Reservation
            {
                Id = ToInt(row["Id"]),
                UserId = ToInt(row["UserId"]),
                ParkingSpotId = ToInt(row["ParkingSpotId"]),
                PersianDate = (string)row["PersianDate"],
                CreatedAt = DateTime.Parse((string)row["CreatedAt"]),
                IsCancelled = (long)row["IsCancelled"] == 1
            });
        }
        result["Reservations"] = await _db.SaveChangesAsync();

        // Insert UserParkingLimits
        foreach (var row in limits)
        {
            _db.UserParkingLimits.Add(new UserParkingLimit
            {
                Id = ToInt(row["Id"]),
                UserId = ToInt(row["UserId"]),
                MonthlyLimit = ToInt(row["MonthlyLimit"])
            });
        }
        result["UserParkingLimits"] = await _db.SaveChangesAsync();

        return Ok(new { message = "Migration complete", rows = result });
    }

    private static int ToInt(object value) => Convert.ToInt32(value);

    private static int? ToNullableInt(object value)
    {
        if (value == DBNull.Value || value == null)
            return null;
        return Convert.ToInt32(value);
    }

    private async Task<List<Dictionary<string, object>>> QueryTableAsync(SqliteConnection conn, string table)
    {
        var result = new List<Dictionary<string, object>>();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = $"SELECT * FROM \"{table}\"";
        using var reader = await cmd.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            var row = new Dictionary<string, object>();
            for (int i = 0; i < reader.FieldCount; i++)
            {
                row[reader.GetName(i)] = reader.GetValue(i);
            }
            result.Add(row);
        }
        return result;
    }

    private async Task ResetAutoIncrement(string table)
    {
        var sql = $"ALTER TABLE `{table}` AUTO_INCREMENT = 1";
#pragma warning disable EF1002
        await _db.Database.ExecuteSqlRawAsync(sql);
#pragma warning restore EF1002
    }
}
