namespace Parking.API.Models;

public class UserParkingLimit
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public int MonthlyLimit { get; set; } = 10;
}
