import { getMockUsersList } from './userService';
import { getOrganizations } from './organizationService';
import { getMockCatalogSkills } from './skillCatalogService';
import { getMockAuditLogs } from './auditLogService';

export async function getAdminDashboardMetrics() {
  const [users, orgs, skills, auditLogs] = await Promise.all([
    getMockUsersList(),
    getOrganizations().catch(() => []),
    getMockCatalogSkills().catch(() => []),
    getMockAuditLogs().catch(() => []),
  ]);

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'ACTIVE').length;
  const contractorsCount = users.filter(u => u.role === 'CONTRACTOR').length;
  const vendorsCount = users.filter(u => u.role === 'VENDOR' || u.role === 'VENDOR_MANAGER').length;
  const managersCount = users.filter(u => u.role === 'HIRING_MANAGER').length;
  const financeCount = users.filter(u => u.role === 'FINANCE' || u.role === 'FINANCE_MANAGER').length;
  const totalOrgs = orgs.length;
  const totalSkills = skills.length;

  // Recent timeline activity
  const recentLogs = auditLogs.map(l => ({
    id: l.id,
    title: l.action.replace('_', ' '),
    desc: l.entity + ` (${l.user})`,
    time: l.timestamp,
  }));

  // Health Cards metrics
  const healthMetrics = {
    onlineUsers: 4,
    apiStatus: 'HEALTHY',
    dbStatus: 'CONNECTED',
    activeSessions: 8,
  };

  return {
    totalUsers,
    activeUsers,
    contractorsCount,
    vendorsCount,
    managersCount,
    financeCount,
    totalOrgs,
    totalSkills,
    recentLogs,
    healthMetrics,
  };
}
