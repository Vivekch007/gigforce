import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';



// Contractor Workspace Components
import ContractorLayout from './layouts/ContractorLayout';
import Dashboard from './pages/contractor/Dashboard';
import Profile from './pages/contractor/Profile';
import Assignments from './pages/contractor/Assignments';
import Timesheets from './pages/contractor/Timesheets';
import Absences from './pages/contractor/Absences';
import Payments from './pages/contractor/Payments';
import Notifications from './pages/contractor/Notifications';

// Hiring Manager Workspace Components
import HiringManagerLayout from './layouts/HiringManagerLayout';
import ManagerDashboard from './pages/manager/Dashboard';
import CreateRequisition from './pages/manager/CreateRequisition';
import MyRequisitions from './pages/manager/MyRequisitions';
import VendorSubmissions from './pages/manager/VendorSubmissions';
import Interviews from './pages/manager/Interviews';
import ManagerAssignments from './pages/manager/Assignments';
import TimesheetApprovals from './pages/manager/TimesheetApprovals';
import LeaveApprovals from './pages/manager/LeaveApprovals';
import InvoiceCreation from './pages/manager/InvoiceCreation';
import ManagerReports from './pages/manager/Reports';
import ManagerNotifications from './pages/manager/Notifications';
import ManagerProfile from './pages/manager/Profile';

// Vendor Workspace Components
import VendorLayout from './layouts/VendorLayout';
import VendorDashboardPage from './pages/vendor/Dashboard';
import OpenRequisitions from './pages/vendor/OpenRequisitions';
import CandidateDatabase from './pages/vendor/CandidateDatabase';
import MySubmissions from './pages/vendor/MySubmissions';
import VendorInterviews from './pages/vendor/Interviews';
import VendorAssignments from './pages/vendor/Assignments';
import VendorAmendments from './pages/vendor/Amendments';
import VendorTimesheets from './pages/vendor/Timesheets';
import PurchaseOrders from './pages/vendor/PurchaseOrders';
import VendorReports from './pages/vendor/Reports';
import VendorNotifications from './pages/vendor/Notifications';
import VendorProfile from './pages/vendor/Profile';

// Finance Workspace Components
import FinanceLayout from './layouts/FinanceLayout';
import FinanceDashboardPage from './pages/finance/Dashboard';
import FinancePurchaseOrders from './pages/finance/PurchaseOrders';
import FinanceInvoices from './pages/finance/Invoices';
import FinancePayments from './pages/finance/Payments';
import FinanceReports from './pages/finance/Reports';
import FinanceNotifications from './pages/finance/Notifications';
import FinanceProfile from './pages/finance/Profile';

// Admin Workspace Components
import AdminLayout from './layouts/AdminLayout';
import AdminDashboardPage from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';

import AdminOrganizations from './pages/admin/Organizations';
import AdminSkillCatalog from './pages/admin/SkillCatalog';
import AdminAuditLogs from './pages/admin/AuditLogs';
import AdminSystemSettings from './pages/admin/SystemSettings';
import AdminNotifications from './pages/admin/Notifications';
import AdminProfile from './pages/admin/Profile';
import { ToastProvider } from './context/ToastContext';
import { ConfirmationProvider } from './context/ConfirmationContext';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <ConfirmationProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Contractor Role Routes (Nested inside ContractorLayout) */}
          <Route element={<ProtectedRoute allowedRoles={['CONTRACTOR']} />}>
            <Route element={<ContractorLayout />}>
              <Route path="/contractor/dashboard" element={<Dashboard />} />
              <Route path="/contractor/profile" element={<Profile />} />
              <Route path="/contractor/assignments" element={<Assignments />} />
              <Route path="/contractor/timesheets" element={<Timesheets />} />
              <Route path="/contractor/absences" element={<Absences />} />
              <Route path="/contractor/payments" element={<Payments />} />
              <Route path="/contractor/notifications" element={<Notifications />} />
            </Route>
          </Route>

          {/* Hiring Manager Role Routes (Nested inside HiringManagerLayout) */}
          <Route element={<ProtectedRoute allowedRoles={['HIRING_MANAGER']} />}>
            <Route element={<HiringManagerLayout />}>
              <Route path="/manager/dashboard" element={<ManagerDashboard />} />
              <Route path="/manager/create-requisition" element={<CreateRequisition />} />
              <Route path="/manager/requisitions" element={<MyRequisitions />} />
              <Route path="/manager/vendor-submissions" element={<VendorSubmissions />} />
              <Route path="/manager/interviews" element={<Interviews />} />
              <Route path="/manager/assignments" element={<ManagerAssignments />} />
              <Route path="/manager/timesheet-approvals" element={<TimesheetApprovals />} />
              <Route path="/manager/leave-approvals" element={<LeaveApprovals />} />
              <Route path="/manager/invoice-creation" element={<InvoiceCreation />} />
              <Route path="/manager/reports" element={<ManagerReports />} />
              <Route path="/manager/notifications" element={<ManagerNotifications />} />
              <Route path="/manager/profile" element={<ManagerProfile />} />
            </Route>
          </Route>

          {/* Vendor Workspace Routes */}
          <Route element={<ProtectedRoute allowedRoles={['VENDOR', 'VENDOR_MANAGER']} />}>
            <Route element={<VendorLayout />}>
              <Route path="/vendor/dashboard" element={<VendorDashboardPage />} />
              <Route path="/vendor/requisitions" element={<OpenRequisitions />} />
              <Route path="/vendor/candidates" element={<CandidateDatabase />} />
              <Route path="/vendor/submissions" element={<MySubmissions />} />
              <Route path="/vendor/interviews" element={<VendorInterviews />} />
              <Route path="/vendor/assignments" element={<VendorAssignments />} />
              <Route path="/vendor/amendments" element={<VendorAmendments />} />
              <Route path="/vendor/timesheets" element={<VendorTimesheets />} />
              <Route path="/vendor/purchase-orders" element={<PurchaseOrders />} />
              <Route path="/vendor/reports" element={<VendorReports />} />
              <Route path="/vendor/notifications" element={<VendorNotifications />} />
              <Route path="/vendor/profile" element={<VendorProfile />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['FINANCE']} />}>
            <Route element={<FinanceLayout />}>
              <Route path="/finance/dashboard" element={<FinanceDashboardPage />} />
              <Route path="/finance/purchase-orders" element={<FinancePurchaseOrders />} />
              <Route path="/finance/invoices" element={<FinanceInvoices />} />
              <Route path="/finance/payments" element={<FinancePayments />} />
              <Route path="/finance/reports" element={<FinanceReports />} />
              <Route path="/finance/notifications" element={<FinanceNotifications />} />
              <Route path="/finance/profile" element={<FinanceProfile />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/organizations" element={<AdminOrganizations />} />
              <Route path="/admin/skills" element={<AdminSkillCatalog />} />
              <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
              <Route path="/admin/system-settings" element={<AdminSystemSettings />} />
              <Route path="/admin/notifications" element={<AdminNotifications />} />
              <Route path="/admin/profile" element={<AdminProfile />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
          </ConfirmationProvider>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;