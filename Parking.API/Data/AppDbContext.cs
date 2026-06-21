using Microsoft.EntityFrameworkCore;
using Parking.API.Models;

namespace Parking.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<ParkingSpot> ParkingSpots => Set<ParkingSpot>();
    public DbSet<Reservation> Reservations => Set<Reservation>();
    public DbSet<UserParkingLimit> UserParkingLimits => Set<UserParkingLimit>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Username).IsUnique();
            e.HasOne(u => u.Team).WithMany(t => t.Users).HasForeignKey(u => u.TeamId);
            e.HasOne(u => u.ParkingLimit).WithOne(l => l.User).HasForeignKey<UserParkingLimit>(l => l.UserId);
            e.Property(u => u.Source).HasMaxLength(20).HasDefaultValue("Parking");
        });

        modelBuilder.Entity<Reservation>(e =>
        {
            e.HasOne(r => r.User).WithMany(u => u.Reservations).HasForeignKey(r => r.UserId);
            e.HasOne(r => r.ParkingSpot).WithMany(s => s.Reservations).HasForeignKey(r => r.ParkingSpotId);
            e.HasIndex(r => new { r.ParkingSpotId, r.PersianDate, r.IsCancelled });
        });

        modelBuilder.Entity<ParkingSpot>(e =>
        {
            e.HasOne(s => s.Team).WithMany(t => t.ParkingSpots).HasForeignKey(s => s.TeamId);
        });

        modelBuilder.Entity<Team>(e =>
        {
            e.HasIndex(t => t.Name).IsUnique();
        });
    }
}
