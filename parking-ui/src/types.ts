export interface User {
  id: number;
  username: string;
  fullName: string;
  role: 'SuperAdmin' | 'Admin' | 'User';
  teamId: number | null;
  teamName?: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  fullName: string;
  role: string;
  teamId: number | null;
}

export interface Team {
  id: number;
  name: string;
}

export interface ParkingSpot {
  id: number;
  name: string;
  location: string;
  isActive: boolean;
  teamId: number | null;
  teamName: string | null;
}

export interface Reservation {
  id: number;
  userId: number;
  username: string;
  parkingSpotId: number;
  parkingSpotName: string;
  persianDate: string;
  createdAt: string;
  isCancelled: boolean;
}

export interface ParkingLimit {
  id: number;
  userId: number;
  username: string;
  monthlyLimit: number;
}

export interface CreateReservation {
  parkingSpotId: number;
  persianDate: string;
}

export interface SetParkingLimit {
  userId: number;
  monthlyLimit: number;
}
