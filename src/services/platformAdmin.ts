/**
 * Platform Admin Service
 *
 * This file re-exports the refactored platform services for backwards compatibility.
 * The actual implementation has been split into smaller, focused modules in ./platform/
 */

// Platform Admin CRUD
export {
  isPlatformAdmin,
  getPlatformAdminByEmail,
  getPlatformAdmin,
  createPlatformAdmin,
  markPasswordSet,
  updateLastLogin,
  seedPlatformAdmin,
  listPlatformAdmins,
  removePlatformAdmin,
  updatePlatformAdminPermissions,
} from './platform/platformAdmin';

export { getAuditLogs } from './platform/auditLog';

// Platform Metrics & Organization Management
export {
  getDefaultMetrics,
  getRevenueByRegion,
  getMetricsHistory,
  getOrgCoachesWithStats,
  getOrganizations,
  getOrganizationDetails,
  updateOrganizationDetails,
  deleteOrganization,
  callDeleteOrganization,
  pauseSubscription,
  cancelSubscription,
  reactivateSubscription,
} from './platform/platformMetrics';

export type { RevenueByRegionSnapshot, RevenueByRegionRow } from '@/types/platform';

// Platform Configuration (Feature Flags & Maintenance)
export {
  getPlatformConfig,
  subscribeToPlatformConfig,
  updateFeatureFlag,
  updateFeatureFlags,
  setMaintenanceMode,
  isFeatureEnabled,
} from './platform/platformConfig';
