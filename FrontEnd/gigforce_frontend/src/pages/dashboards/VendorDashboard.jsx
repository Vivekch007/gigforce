import DashboardPlaceholder from './DashboardPlaceholder';
import { useAuth } from '../../hooks/useAuth';

// Shared by both VENDOR and VENDOR_MANAGER roles (both route to /vendor/dashboard).
function VendorDashboard() {
  const { user } = useAuth();
  const title = user?.role === 'VENDOR_MANAGER' ? 'Vendor Manager Dashboard' : 'Vendor Dashboard';
  return <DashboardPlaceholder title={title} badgeVariant="bg-warning text-dark" />;
}

export default VendorDashboard;
