/**
 * Platform Audit Logger
 *
 * Story 13.1: Implement Platform Administrator Authentication
 * AC-13.1.7: Platform admin authentication events are logged to platform audit trail
 *
 * Provides async, non-blocking audit logging for platform admin actions.
 *
 * Design Principles:
 * - FIRE AND FORGET: Don't await in calling code path
 * - ERROR RESILIENCE: Failures don't throw to caller
 * - APPEND-ONLY: Logs are never updated or deleted
 * - NO TENANT CONTEXT: Uses adminDb, not tenant-scoped db
 */

import { adminDb } from "@/db";
import { platformAuditLogs } from "@/db/schema/platform-audit-logs";

/**
 * Platform admin action types for type-safe audit logging
 */
export const PLATFORM_ADMIN_ACTIONS = {
  /** Successful access to platform admin area */
  ACCESS: "access",
  /** Access denied (user not in whitelist) */
  FORBIDDEN: "forbidden",
  /** Viewed tenant details */
  VIEW_TENANT: "view_tenant",
  /** Suspended a tenant */
  SUSPEND_TENANT: "suspend_tenant",
  /** Reactivated a tenant */
  REACTIVATE_TENANT: "reactivate_tenant",
  /** Viewed platform analytics */
  VIEW_ANALYTICS: "view_analytics",
  /** Started user impersonation */
  START_IMPERSONATION: "start_impersonation",
  /** Ended user impersonation */
  END_IMPERSONATION: "end_impersonation",
  /** Action taken while impersonating (Story 13.6: AC 4) */
  IMPERSONATION_ACTION: "impersonation_action",
  /** Viewed tenant list */
  TENANT_LIST: "tenant_list",
  /** Searched/filtered tenants */
  TENANT_SEARCH: "tenant_search",
  /** Viewed tenant detail page */
  VIEW_TENANT_DETAIL: "view_tenant_detail",
  /** Viewed platform dashboard */
  VIEW_PLATFORM_DASHBOARD: "view_platform_dashboard",
  /** Viewed system health monitoring (Story 13.7) */
  VIEW_SYSTEM_HEALTH: "view_system_health",
  /** Created a platform announcement (Story 13.8) */
  CREATE_ANNOUNCEMENT: "create_announcement",
  /** Updated a platform announcement (Story 13.8) */
  UPDATE_ANNOUNCEMENT: "update_announcement",
  /** Deleted a platform announcement (Story 13.8) */
  DELETE_ANNOUNCEMENT: "delete_announcement",
  /** Viewed announcements management page (Story 13.8) */
  VIEW_ANNOUNCEMENTS: "view_announcements",
} as const;

export type PlatformAdminAction =
  (typeof PLATFORM_ADMIN_ACTIONS)[keyof typeof PLATFORM_ADMIN_ACTIONS];

/**
 * Parameters for logging a platform admin event
 */
export interface PlatformAuditEventParams {
  /** Email of the admin performing the action */
  adminEmail: string;
  /** Clerk user ID of the admin */
  adminClerkId: string;
  /** Type of action: 'access', 'forbidden', 'view_tenant', etc. */
  action: string;
  /** Route or resource being accessed */
  route: string;
  /** Additional context (optional) */
  metadata?: Record<string, unknown>;
}

/**
 * Logs a platform admin event asynchronously (non-blocking)
 *
 * IMPORTANT: This function is designed to be fire-and-forget.
 * Do NOT await it in the calling code path - audit failures
 * should never block or fail the parent operation.
 *
 * Usage:
 * ```typescript
 * // Fire and forget - don't await
 * logPlatformAdminEvent({
 *   adminEmail: "admin@example.com",
 *   adminClerkId: "user_abc123",
 *   action: "access",
 *   route: "/platform-admin",
 * });
 * ```
 *
 * @param params - Platform audit event parameters
 */
export async function logPlatformAdminEvent(
  params: PlatformAuditEventParams,
): Promise<void> {
  try {
    await adminDb.insert(platformAuditLogs).values({
      admin_email: params.adminEmail,
      admin_clerk_id: params.adminClerkId,
      action: params.action,
      route: params.route,
      metadata: params.metadata,
    });
  } catch (error) {
    // Log error but don't throw - audit failure shouldn't fail the parent operation
    console.error("[PlatformAudit] Failed to log event:", error);
  }
}
