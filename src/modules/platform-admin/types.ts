/**
 * Platform Admin Module Types
 *
 * Story 13.2: Build Tenant List and Search Interface
 *
 * Type definitions for platform admin tenant management features.
 */

/**
 * Tenant with aggregated user count for list display
 */
export interface TenantWithUserCount {
  id: string;
  name: string;
  subdomain: string;
  status: "active" | "suspended";
  created_at: Date;
  user_count: number;
}

/**
 * Options for querying/filtering tenants
 */
export interface GetTenantsOptions {
  /** Search term (matches name or subdomain) */
  search?: string;
  /** Filter by status */
  status?: "active" | "suspended" | "all";
  /** Field to sort by */
  sortBy?: "name" | "created_at" | "user_count";
  /** Sort direction */
  sortOrder?: "asc" | "desc";
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  pageSize?: number;
}

/**
 * Paginated result set for tenant queries
 */
export interface PaginatedTenantsResult {
  tenants: TenantWithUserCount[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * User within a tenant for detail display
 * Story 13.3: Build Tenant Detail View (AC: 4)
 * Story 13.6: Added clerk_user_id for impersonation support (AC: 1, 8)
 */
export interface TenantUser {
  id: string;
  email: string;
  role: "owner" | "admin" | "editor" | "finance" | "author";
  is_active: boolean;
  created_at: Date;
  clerk_user_id: string | null; // Required for impersonation - null for portal users
}

/**
 * Usage metrics for a tenant
 * Story 13.3: Build Tenant Detail View (AC: 5)
 */
export interface TenantUsageMetrics {
  contactCount: number;
  titleCount: number;
  salesCount: number;
  statementCount: number;
}

/**
 * Activity log entry for tenant detail view
 * Story 13.3: Build Tenant Detail View (AC: 6)
 */
export interface TenantActivityLog {
  id: string;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  user_email: string | null;
  created_at: Date;
}

/**
 * Full tenant detail including users, metrics, and activity
 * Story 13.3: Build Tenant Detail View (AC: 1-7)
 * Story 13.4: Extended with suspension fields
 */
export interface TenantDetail extends TenantWithUserCount {
  timezone: string;
  fiscal_year_start: string | null;
  statement_frequency: string;
  royalty_period_type: string;
  users: TenantUser[];
  metrics: TenantUsageMetrics;
  activity: TenantActivityLog[];
  last_activity_at: Date | null;
  // Suspension fields (Story 13.4)
  suspended_at: Date | null;
  suspended_reason: string | null;
  suspended_by_admin_email: string | null;
}

/**
 * Input for suspending a tenant
 * Story 13.4: Implement Tenant Suspension and Reactivation (AC: 1)
 */
export interface SuspendTenantInput {
  reason: string; // Min 10 chars
}

/**
 * Tenant suspension status info
 * Story 13.4: Implement Tenant Suspension and Reactivation
 */
export interface TenantSuspensionInfo {
  status: "active" | "suspended";
  suspended_at: Date | null;
  suspended_reason: string | null;
  suspended_by_admin_email: string | null;
}

/**
 * Platform-wide tenant metrics
 * Story 13.5: Build Platform Analytics Dashboard (AC: 2)
 *
 * Note: "activeLastThirtyDays" = tenants with user record updates in last 30 days.
 * This is a proxy for activity based on users.updated_at timestamps.
 */
export interface PlatformTenantMetrics {
  total: number;
  /** Tenants with user activity (updated_at) in last 30 days */
  activeLastThirtyDays: number;
  newThisMonth: number;
  suspended: number;
}

/**
 * Data point for tenant growth trend chart
 * Story 13.5: Build Platform Analytics Dashboard (AC: 2)
 */
export interface TenantGrowthDataPoint {
  month: string; // "2025-01"
  count: number;
}

/**
 * Platform-wide user metrics with role breakdown
 * Story 13.5: Build Platform Analytics Dashboard (AC: 3)
 */
export interface PlatformUserMetrics {
  total: number;
  activeLastThirtyDays: number;
  byRole: {
    owner: number;
    admin: number;
    editor: number;
    finance: number;
    author: number;
  };
}

/**
 * Platform-wide usage metrics
 * Story 13.5: Build Platform Analytics Dashboard (AC: 4)
 */
export interface PlatformUsageMetrics {
  totalTitles: number;
  salesThisMonth: number;
  statementsThisMonth: number;
}

/**
 * Platform system health status
 * Story 13.5: Build Platform Analytics Dashboard (AC: 5)
 */
export interface PlatformHealthStatus {
  database: {
    status: "healthy" | "degraded" | "error";
    responseTimeMs: number;
  };
  inngest: { status: "healthy" | "unknown"; dashboardUrl: string };
  email: { status: "healthy" | "unknown"; dashboardUrl: string };
}

/**
 * Combined platform dashboard data
 * Story 13.5: Build Platform Analytics Dashboard (AC: 1-5)
 * Note: generatedAt is ISO string for safe client serialization
 */
export interface PlatformDashboardData {
  tenantMetrics: PlatformTenantMetrics;
  tenantGrowthTrend: TenantGrowthDataPoint[];
  userMetrics: PlatformUserMetrics;
  usageMetrics: PlatformUsageMetrics;
  health: PlatformHealthStatus;
  generatedAt: string; // ISO string for serialization safety
}

/**
 * Input for starting user impersonation
 * Story 13.6: Implement Tenant Impersonation for Support (AC: 1, 6)
 */
export interface StartImpersonationInput {
  userId: string; // Database user ID (looked up to get clerk_user_id)
  reason: string; // Required, min 10 chars
}

/**
 * Impersonation session status
 * Story 13.6: Implement Tenant Impersonation for Support (AC: 2)
 */
export interface ImpersonationStatus {
  isImpersonating: boolean;
  impersonatedUserId?: string;
  impersonatedEmail?: string;
  impersonatorClerkId?: string;
  tenantName?: string;
}

/**
 * Database health metrics
 * Story 13.7: Build System Health and Job Monitoring (AC: 2)
 */
export interface DatabaseMetrics {
  connectionPoolStatus: "healthy" | "degraded" | "error";
  activeConnections: number;
  idleConnections: number;
  databaseSizeMb: number;
  responseTimeMs: number;
}

/**
 * Inngest background job metrics
 * Story 13.7: Build System Health and Job Monitoring (AC: 3)
 */
export interface InngestJobMetrics {
  queuedCount: number | null;
  runningCount: number | null;
  recentFailures: Array<{
    id: string;
    functionName: string;
    error: string;
    failedAt: Date;
  }>;
  successRateLast24h: number | null;
  dashboardUrl: string;
  status: "healthy" | "degraded" | "error" | "unknown";
}

/**
 * Email service metrics
 * Story 13.7: Build System Health and Job Monitoring (AC: 5)
 */
export interface EmailMetrics {
  sentLast24h: number | null;
  deliveredLast24h: number | null;
  failedLast24h: number | null;
  dashboardUrl: string;
  status: "healthy" | "degraded" | "error" | "unknown";
}

/**
 * System health alert
 * Story 13.7: Build System Health and Job Monitoring (AC: 6)
 */
export interface SystemAlert {
  id: string;
  severity: "info" | "warning" | "critical";
  message: string;
  source: "database" | "inngest" | "email" | "application";
  createdAt: Date;
  acknowledged: boolean;
}

/**
 * Application health metrics
 * Story 13.7: Build System Health and Job Monitoring (AC: 4)
 *
 * Note: In serverless environments (Vercel/Next.js), memory usage and
 * process-level metrics are not accessible. This provides what's available.
 */
export interface ApplicationMetrics {
  /** Runtime environment */
  environment: string;
  /** Node.js version */
  nodeVersion: string;
  /** Whether running in serverless mode */
  isServerless: boolean;
  /** Uptime in seconds (only meaningful in non-serverless) */
  uptimeSeconds: number | null;
  /** Memory usage in MB (only available in non-serverless) */
  memoryUsageMb: number | null;
  /** Status indicator */
  status: "healthy" | "degraded" | "unknown";
}

/**
 * Combined system health data
 * Story 13.7: Build System Health and Job Monitoring (AC: 1-6)
 */
export interface SystemHealthData {
  database: DatabaseMetrics;
  inngest: InngestJobMetrics;
  email: EmailMetrics;
  application: ApplicationMetrics;
  alerts: SystemAlert[];
  generatedAt: string; // ISO string
}

/**
 * Announcement severity type
 * Story 13.8: Implement Platform-Wide Announcements (AC: 1)
 */
export type AnnouncementType = "info" | "warning" | "critical";

/**
 * Platform announcement record
 * Story 13.8: Implement Platform-Wide Announcements
 */
export interface PlatformAnnouncement {
  id: string;
  message: string;
  type: AnnouncementType;
  startsAt: Date;
  endsAt: Date | null;
  targetRoles: string[] | null;
  isActive: boolean;
  createdAt: Date;
  createdByAdminEmail: string;
  updatedAt: Date;
  updatedByAdminEmail: string | null;
}

/**
 * Input for creating an announcement
 * Story 13.8: Implement Platform-Wide Announcements (AC: 1)
 */
export interface CreateAnnouncementInput {
  message: string; // Min 10 chars
  type: AnnouncementType;
  startsAt: Date;
  endsAt?: Date | null;
  targetRoles?: string[] | null; // null = all users
}

/**
 * Input for updating an announcement
 * Story 13.8: Implement Platform-Wide Announcements (AC: 6)
 */
export interface UpdateAnnouncementInput {
  message?: string;
  type?: AnnouncementType;
  startsAt?: Date;
  endsAt?: Date | null;
  targetRoles?: string[] | null;
  isActive?: boolean;
}

/**
 * Active announcement for banner display (minimal data)
 * Story 13.8: Implement Platform-Wide Announcements (AC: 2)
 */
export interface ActiveAnnouncement {
  id: string;
  message: string;
  type: AnnouncementType;
  targetRoles: string[] | null;
}
