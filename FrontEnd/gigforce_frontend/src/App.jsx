import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

import AdminDashboard from './pages/dashboards/AdminDashboard';
import ContractorDashboard from './pages/dashboards/ContractorDashboard';
import HiringManagerDashboard from './pages/dashboards/HiringManagerDashboard';
import VendorDashboard from './pages/dashboards/VendorDashboard';
import FinanceDashboard from './pages/dashboards/FinanceDashboard';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Role-protected dashboards */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['CONTRACTOR']} />}>
            <Route path="/contractor/dashboard" element={<ContractorDashboard />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['HIRING_MANAGER']} />}>
            <Route path="/hiring-manager/dashboard" element={<HiringManagerDashboard />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['VENDOR', 'VENDOR_MANAGER']} />}>
            <Route path="/vendor/dashboard" element={<VendorDashboard />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['FINANCE']} />}>
            <Route path="/finance/dashboard" element={<FinanceDashboard />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;