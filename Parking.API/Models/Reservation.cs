namespace Parking.API.Models;

public class Reservation
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public int ParkingSpotId { get; set; }
    public ParkingSpot ParkingSpot { get; set; } = null!;
    public string PersianDate { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsCancelled { get; set; }
}
