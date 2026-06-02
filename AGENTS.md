# Parking Management System

## Overview

Full-stack parking reservation system with a .NET 10 Web API backend and React 19 + TypeScript frontend (Vite 8).

```
parking/
  Parking.API/     -- ASP.NET Core Web API (C#, EF Core + SQLite/MySQL, JWT auth)
  parking-ui/      -- React 19 + TypeScript SPA (Vite, react-router-dom 7)
```

## Docker / CI

| File | Description |
|---|---|
| `Parking.API/Dockerfile` | Multi-stage .NET 10 build → aspnet:10.0 runtime, port 5000 |
| `parking-ui/Dockerfile` | Node 22 build → nginx:alpine static serve, port 80 |
| `parking-ui/nginx.conf` | Proxies `/api/` → `http://backend:5000`, SPA fallback |
| `docker-compose.yml` | Backend + frontend services (dev: SQLite) |
| `docker-compose.prd.yml` | Production overrides (MySQL, JWT secrets) — gitignored |
| `.github/workflows/ci.yml` | Builds & pushes both images to GHCR on push to `main` |

```bash
# Local build & run (SQLite)
docker compose up --build

# Production (pull pre-built images, use production env)
docker compose -f docker-compose.prd.yml up

# The nginx proxies /api/* to the backend container (hostname "backend")
```

**Default login:** `superadmin` / `admin123`

## Architecture

### Backend (Parking.API)

| Layer | Location | Description |
|---|---|---|
| Models | `Models/*.cs` | User, Team, ParkingSpot, Reservation, UserParkingLimit |
| DbContext | `Data/AppDbContext.cs` | EF Core fluent config with indexes |
| Controllers | `Controllers/*.cs` | Auth, Users, Teams, ParkingSpots, Reservations, UserParkingLimits |
| Services | `Services/AuthService.cs`, `Services/IranHolidayService.cs` | JWT auth, holiday validation |
| DTOs | `DTOs/AuthDtos.cs` | All request/response records |
| Entry | `Program.cs` | DI, middleware, CORS, seed (superadmin) |

### Frontend (parking-ui)

| Layer | Location | Description |
|---|---|---|
| Entry | `src/main.tsx`, `src/App.tsx` | BrowserRouter, AuthProvider, route definitions |
| Pages | `src/pages/` | Login, ParkingCalendar, MyReservations, AdminPanel |
| Components | `src/components/` | Layout, ProtectedRoute |
| Context | `src/context/AuthContext.tsx` | Auth state, login/logout, role helpers |
| API | `src/api.ts` | Fetch-based client with JWT, all endpoints |
| Types | `src/types.ts` | Shared TypeScript interfaces |

### Data Model

```
Team (1) ──< (N) User
Team (1) ──< (N) ParkingSpot
User (1) ──< (N) Reservation
ParkingSpot (1) ──< (N) Reservation
User (1) ── (1) UserParkingLimit (monthlyLimit, default 10)
```

### Auth

- JWT with HMAC-SHA256, 7-day expiry
- Claims: NameIdentifier (userId), Name, Role, TeamId
- Roles: `SuperAdmin` > `Admin` > `User`
- Frontend stores token in localStorage

## API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | None | Login |
| POST | `/api/auth/register` | None | Register |
| GET | `/api/parkingspots` | None | List spots (?teamId=) |
| GET | `/api/reservations/holidays` | None | Get holidays |
| GET | `/api/reservations` | Auth | List by date |
| GET | `/api/reservations/my` | Auth | My reservations |
| POST | `/api/reservations` | Auth | Create (validates holidays, limits, duplicates) |
| PUT | `/api/reservations/{id}/cancel` | Auth | Cancel (owner/Admin/SuperAdmin) |
| GET | `/api/limits/my` | Auth | My limit + usage |
| POST | `/api/parkingspots` | SA,Admin | Create spot |
| PUT/DELETE | `/api/parkingspots/{id}` | SA,Admin | Update/soft-delete |
| GET | `/api/limits` | SA,Admin | All limits |
| POST | `/api/limits` | SA,Admin | Set user limit |
| GET/POST/PUT/DELETE | `/api/users` | SuperAdmin | User CRUD |
| GET/POST/DELETE | `/api/teams` | SuperAdmin | Team CRUD |

## Known Issues & Areas for Improvement

1. **UsersController.Update bug** — `TeamId` is incorrectly required; returns 400 if absent
2. **Leap year validation** — `IsValidPersianDate` has a redundant/wrong remainder check in `ReservationsController.cs:169-173`
3. **Date comparison** — `MyReservations.tsx` `canCancel` compares Gregorian dates but reservations use Persian dates
4. **HashPassword duplication** — Same PBKDF2 logic in `AuthService.cs` and `UsersController.cs`
5. **No token expiry handling** — Frontend doesn't detect or handle expired tokens
6. **No pagination** — All lists load entire dataset at once
7. **No registration UI** — AuthController supports register but no frontend page exists
8. **Holiday dates** — Hardcoded Gregorian-to-Persian mapping may drift; 3-year window only
9. **Vite proxy** — `/api` -> `localhost:5000` is dev-only; needs production config
10. **No HTTPS** — Dev runs on HTTP only
11. **No refresh token mechanism** — 7-day token with no rotation
12. **MySQL migration** — Switched from SQLite to MySQL (`MySql.EntityFrameworkCore` 10.0.7). App auto-detects provider: SQLite if `Data Source=...`, MySQL if `Server=...`. The `migrate_to_mysql.py` script handles one-time data migration.
