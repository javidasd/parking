namespace Parking.API.DTOs;

public record LoginDto(string Username, string Password);
public record RegisterDto(string Username, string Password, string FullName, int? TeamId, int? MonthlyLimit);
public record AuthResponseDto(string Token, string Username, string FullName, string Role, int? TeamId);
public record UserDto(int Id, string Username, string FullName, string Role, int? TeamId, string? TeamName);
public record CreateUserDto(string Username, string Password, string FullName, string Role, int? TeamId, int? MonthlyLimit);
public record UpdateUserDto(string? Password, string? FullName, string? Role, int? TeamId);
public record TeamDto(int Id, string Name);
public record CreateTeamDto(string Name);
public record ParkingSpotDto(int Id, string Name, string Location, bool IsActive, int? TeamId, string? TeamName);
public record CreateParkingSpotDto(string Name, string Location, int? TeamId);
public record ReservationDto(int Id, int UserId, string Username, int ParkingSpotId, string ParkingSpotName, string PersianDate, DateTime CreatedAt, bool IsCancelled);
public record CreateReservationDto(int ParkingSpotId, string PersianDate);
public record UserParkingLimitDto(int Id, int UserId, string Username, int MonthlyLimit);
public record MyLimitDto(int MonthlyLimit, int UsedCount);
public record SetParkingLimitDto(int UserId, int MonthlyLimit);
