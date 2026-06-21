using Parking.API.Enums;

namespace Parking.API.Models;

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.User;
    public int? TeamId { get; set; }
    public Team? Team { get; set; }
    public string Source { get; set; } = "Parking";
    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
    public UserParkingLimit? ParkingLimit { get; set; }
}
