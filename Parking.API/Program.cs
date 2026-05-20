using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Parking.API.Data;
using Parking.API.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlite(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddScoped<AuthService>();
builder.Services.AddSingleton<IranHolidayService>();

var key = Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!);
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(key)
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    await SeedData(db);
}

app.Run();

static async Task SeedData(AppDbContext db)
{
    if (await db.Users.AnyAsync()) return;

    var salt = System.Security.Cryptography.RandomNumberGenerator.GetBytes(16);
    var hash = System.Security.Cryptography.Rfc2898DeriveBytes.Pbkdf2(
        System.Text.Encoding.UTF8.GetBytes("admin123"),
        salt, 100000, System.Security.Cryptography.HashAlgorithmName.SHA256, 32);
    var pwd = Convert.ToBase64String(salt) + ":" + Convert.ToBase64String(hash);

    var superAdmin = new Parking.API.Models.User
    {
        Username = "superadmin",
        PasswordHash = pwd,
        FullName = "Super Admin",
        Role = Parking.API.Enums.UserRole.SuperAdmin
    };
    db.Users.Add(superAdmin);
    await db.SaveChangesAsync();
}
