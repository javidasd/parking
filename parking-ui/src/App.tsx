import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LangProvider } from './i18n';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { AuthCallback } from './pages/AuthCallback';
import { AuthChooseTeam } from './pages/AuthChooseTeam';
import { ParkingCalendar } from './pages/ParkingCalendar';
import { MyReservations } from './pages/MyReservations';
import { AdminPanel } from './pages/AdminPanel';
import { TeamReport } from './pages/TeamReport';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/choose-team" element={<AuthChooseTeam />} />
      <Route path="/" element={<ProtectedRoute><Layout><ParkingCalendar /></Layout></ProtectedRoute>} />
      <Route path="/my-reservations" element={<ProtectedRoute><Layout><MyReservations /></Layout></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute roles={['SuperAdmin', 'Admin']}><Layout><AdminPanel /></Layout></ProtectedRoute>} />
      <Route path="/report" element={<ProtectedRoute><Layout><TeamReport /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LangProvider>
          <AppRoutes />
        </LangProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
