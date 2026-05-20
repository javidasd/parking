namespace Parking.API.Models;

public class ParkingSpot
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int? TeamId { get; set; }
    public Team? Team { get; set; }
    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
}
