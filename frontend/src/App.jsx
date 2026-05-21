// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import AppShell from './components/Layout/AppShell';

// Pages
import LoginPage from './pages/Auth/LoginPage';
import Dashboard from './pages/Dashboard/Dashboard';
import HouseholdsPage from './pages/Households/HouseholdsPage';
import HouseholdDetail from './pages/Households/HouseholdDetail';
import FarmersPage from './pages/Farmers/FarmersPage';
import FarmerDetail from './pages/Farmers/FarmerDetail';
import LandPlantPage from './pages/LandPlant/LandPlantPage';
import VillageMapPage from './pages/Map/VillageMapPage';
import ApplicationsPage from './pages/Applications/ApplicationsPage';
import ApplicationDetail from './pages/Applications/ApplicationDetail';
import SHGPage from './pages/SHG/SHGPage';
import MaintenancePage from './pages/Maintenance/MaintenancePage';
import ReportsPage from './pages/Reports/ReportsPage';
import BulkPage from './pages/Bulk/BulkPage';
import NotificationsPage from './pages/Notifications/NotificationsPage';
import MandalDashboard from './pages/Mandal/MandalDashboard';
import DistrictDashboard from './pages/District/DistrictDashboard';
import StateDashboard from './pages/State/StateDashboard';
import SettingsPage from './pages/Settings/SettingsPage';

const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />

      <Route path="/" element={
        <ProtectedRoute>
          <AppShell />
        </ProtectedRoute>
      }>
        {/* Default redirect by role */}
        <Route index element={
          user?.role === 'mandal' ? <Navigate to="/mandal" /> :
          user?.role === 'district' ? <Navigate to="/district" /> :
          user?.role === 'state' ? <Navigate to="/state" /> :
          <Dashboard />
        } />

        {/* Sarpanch modules */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="households" element={<HouseholdsPage />} />
        <Route path="households/:id" element={<HouseholdDetail />} />
        <Route path="farmers" element={<FarmersPage />} />
        <Route path="farmers/:id" element={<FarmerDetail />} />
        <Route path="land" element={<LandPlantPage />} />
        <Route path="map" element={<VillageMapPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="applications/:id" element={<ApplicationDetail />} />
        <Route path="shg" element={<SHGPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="bulk" element={<BulkPage />} />
        <Route path="notifications" element={<NotificationsPage />} />

        {/* Mandal */}
        <Route path="mandal" element={
          <ProtectedRoute roles={['mandal', 'district', 'state', 'admin']}>
            <MandalDashboard />
          </ProtectedRoute>
        } />

        {/* District */}
        <Route path="district" element={
          <ProtectedRoute roles={['district', 'state', 'admin']}>
            <DistrictDashboard />
          </ProtectedRoute>
        } />

        {/* State */}
        <Route path="state" element={
          <ProtectedRoute roles={['state', 'admin']}>
            <StateDashboard />
          </ProtectedRoute>
        } />

        {/* Settings */}
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#162035',
            color: '#F0F4F8',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            fontSize: '0.83rem',
          },
          success: { iconTheme: { primary: '#40C584', secondary: '#162035' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#162035' } },
        }}
      />
      <AppRoutes />
    </BrowserRouter>
  );
}
