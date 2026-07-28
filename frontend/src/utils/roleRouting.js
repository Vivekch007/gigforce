const ROLE_DASHBOARD_MAP = {
  ADMIN: '/admin/dashboard',
  CONTRACTOR: '/contractor/dashboard',
  HIRING_MANAGER: '/manager/dashboard',
  VENDOR: '/vendor/dashboard',
  VENDOR_MANAGER: '/vendor/dashboard',
  FINANCE: '/finance/dashboard',
};

export function getDashboardPathForRole(role) {
  return ROLE_DASHBOARD_MAP[role] || '/login';
}
