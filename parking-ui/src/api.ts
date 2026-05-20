const BASE_URL = '/api';

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  auth: {
    login: (data: { username: string; password: string }) =>
      request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    register: (data: { username: string; password: string; fullName: string; teamId?: number }) =>
      request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  },
  teams: {
    getAll: () => request('/teams'),
    create: (data: { name: string }) =>
      request('/teams', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request(`/teams/${id}`, { method: 'DELETE' }),
  },
  users: {
    getAll: () => request('/users'),
    getTeamMembers: () => request('/users/team-members'),
    create: (data: { username: string; password: string; fullName: string; role: string; teamId?: number; monthlyLimit?: number }) =>
      request('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: { fullName?: string; password?: string; role?: string; teamId?: number | null }) =>
      request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request(`/users/${id}`, { method: 'DELETE' }),
  },
  parkingSpots: {
    getAll: (teamId?: number) => request(`/parkingspots${teamId ? `?teamId=${teamId}` : ''}`),
    getById: (id: number) => request(`/parkingspots/${id}`),
    create: (data: { name: string; location: string; teamId?: number }) =>
      request('/parkingspots', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: { name: string; location: string; teamId?: number }) =>
      request(`/parkingspots/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request(`/parkingspots/${id}`, { method: 'DELETE' }),
  },
  reservations: {
    getAll: (date?: string) =>
      request(`/reservations${date ? `?date=${date}` : ''}`),
    getMy: () => request('/reservations/my'),
    create: (data: { parkingSpotId: number; persianDate: string }) =>
      request('/reservations', { method: 'POST', body: JSON.stringify(data) }),
    cancel: (id: number) =>
      request(`/reservations/${id}/cancel`, { method: 'PUT' }),
    getHolidays: () => request('/reservations/holidays'),
  },
  limits: {
    getAll: () => request('/limits'),
    getMy: () => request('/limits/my'),
    set: (data: { userId: number; monthlyLimit: number }) =>
      request('/limits', { method: 'POST', body: JSON.stringify(data) }),
  },
};
