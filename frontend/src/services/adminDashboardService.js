import { getUsers } from './userService';
import { getSkills } from './skillCatalogService';
import { getAllAuditLogs } from './auditLogService';
import { getAssignments } from './assignmentService';
import { getRequisitions } from './requisitionService';

export async function getAdminDashboardMetrics() {
  const [usersPage, skills, auditLogs, activeAssignments, openRequisitions] = await Promise.all([
    getUsers({ size: 1000 }),
    getSkills().catch(() => []),
    getAllAuditLogs().catch(() => []),
    getAssignments({ status: 'ACTIVE', size: 1 }).catch(() => ({ totalElements: 0 })),
    getRequisitions({ status: 'OPEN', size: 1 }).catch(() => ({ totalElements: 0 })),
  ]);

  const users = usersPage.content || [];

  const totalUsers = usersPage.totalElements ?? users.length;
  const activeUsers = users.filter((u) => u.status === 'ACTIVE').length;
  const contractorsCount = users.filter((u) => u.role === 'CONTRACTOR').length;
  const vendorsCount = users.filter((u) => u.role === 'VENDOR' || u.role === 'VENDOR_MANAGER').length;
  const managersCount = users.filter((u) => u.role === 'HIRING_MANAGER').length;
  const financeCount = users.filter((u) => u.role === 'FINANCE').length;
  const totalSkills = skills.length;

  // No dedicated "Organization" entity exists on the backend - orgUnitId is a
  // free-text field on User, so distinct values are the closest real proxy
  // for "how many org units are represented in the system".
  const totalOrgUnits = new Set(users.map((u) => u.orgUnitId).filter(Boolean)).size;

  const filteredLogs = auditLogs.filter(log => log.action !== 'TIMESHEET_SUBMITTED');
  const sortedLogs = [...filteredLogs].sort(
    (a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt)
  );
  const recentLogs = sortedLogs.slice(0, 8).map((log) => ({
    id: log.id,
    title: (log.action || '').replaceAll('_', ' '),
    desc: log.description || log.entityType || '',
    time: log.timestamp || log.createdAt,
  }));

  return {
    totalUsers,
    activeUsers,
    contractorsCount,
    vendorsCount,
    managersCount,
    financeCount,
    totalOrgUnits,
    totalSkills,
    recentLogs,
    healthMetrics: {
      activeAssignments: activeAssignments.totalElements ?? 0,
      openRequisitions: openRequisitions.totalElements ?? 0,
    },
  };
}
