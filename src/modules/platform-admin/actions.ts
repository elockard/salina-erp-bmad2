"use server";

/**
 * Platform Admin Server Actions
 *
 * Story 13.2: Build Tenant List and Search Interface
 * Story 13.3: Build Tenant Detail View
 * Story 13.4: Implement Tenant Suspension and Reactivation
 *
 * CRITICAL: Always check platform admin authentication first.
 * Returns ActionResult pattern - NEVER throw errors to client.
 */

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { adminDb } from "@/db";
import { tenants, users } from "@/db/schema";
import { platformAnnouncements } from "@/db/schema/platform-announcements";
import { getCurrentPlatformAdmin } from "@/lib/platform-admin";
import {
  logPlatformAdminEvent,
  PLATFORM_ADMIN_ACTIONS,
} from "@/lib/platform-audit";
import type { ActionResult } from "@/lib/types";
import { getApplicationMetrics } from "./app-monitoring";
import { getEmailMetrics } from "./email-monitoring";
import {
  sendTenantReactivatedEmail,
  sendTenantSuspendedEmail,
} from "./email-service";
import {
  getDatabaseHealthStatus,
  getDatabaseMetrics,
  getEmailServiceStatus,
  getInngestHealthStatus,
} from "./health";
import { createActorToken } from "./impersonation";
import { getInngestJobMetrics } from "./job-monitoring";
import {
  getPlatformTenantMetrics,
  getPlatformUsageMetrics,
  getPlatformUserMetrics,
  getTenantActivity,
  getTenantById,
  getTenantGrowthTrend,
  getTenantOwnerEmail,
  getTenants,
  getTenantUsageMetrics,
  getTenantUsers,
  isValidUUID,
} from "./queries";
import type {
  CreateAnnouncementInput,
  GetTenantsOptions,
  ImpersonationStatus,
  PaginatedTenantsResult,
  PlatformAnnouncement,
  PlatformDashboardData,
  StartImpersonationInput,
  SystemAlert,
  SystemHealthData,
  TenantDetail,
  UpdateAnnouncementInput,
} from "./types";

/**
 * Search and filter tenants
 *
 * @param options - Search, filter, sort, and pagination options
 * @returns ActionResult with paginated tenant data
 */
export async function searchTenants(
  options: GetTenantsOptions,
): Promise<ActionResult<PaginatedTenantsResult>> {
  try {
    const admin = await getCurrentPlatformAdmin();

    if (!admin) {
      return {
        success: false,
        error: "Unauthorized: Platform admin access required",
      };
    }

    // Log search event (fire and forget - don't await)
    logPlatformAdminEvent({
      adminEmail: admin.email,
      adminClerkId: admin.clerkId,
      action: PLATFORM_ADMIN_ACTIONS.TENANT_SEARCH,
      route: "/platform-admin/tenants",
      metadata: {
        search: options.search,
        status: options.status,
        sortBy: options.sortBy,
        page: options.page,
      },
    });

    const result = await getTenants(options);
    return { success: true, data: result };
  } catch (error) {
    console.error("searchTenants error:", error);
    return { success: false, error: "Failed to search tenants" };
  }
}

/**
 * Get detailed tenant information
 * Story 13.3: Build Tenant Detail View (AC: 1-7)
 *
 * @param id - Tenant UUID
 * @returns ActionResult with TenantDetail or error
 */
export async function getTenantDetail(
  id: string,
): Promise<ActionResult<TenantDetail>> {
  try {
    // Validate UUID format first
    if (!isValidUUID(id)) {
      return { success: false, error: "Invalid tenant ID format" };
    }

    const admin = await getCurrentPlatformAdmin();

    if (!admin) {
      return {
        success: false,
        error: "Unauthorized: Platform admin access required",
      };
    }

    const tenant = await getTenantById(id);

    if (!tenant) {
      return { success: false, error: "Tenant not found" };
    }

    // Log view event (fire and forget - don't await)
    logPlatformAdminEvent({
      adminEmail: admin.email,
      adminClerkId: admin.clerkId,
      action: PLATFORM_ADMIN_ACTIONS.VIEW_TENANT_DETAIL,
      route: `/platform-admin/tenants/${id}`,
      metadata: { tenantId: id, tenantName: tenant.name },
    });

    // Fetch all related data in parallel
    const [usersResult, metricsResult, activityResult] = await Promise.all([
      getTenantUsers(id),
      getTenantUsageMetrics(id),
      getTenantActivity(id),
    ]);

    return {
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        status: (tenant.status as "active" | "suspended") ?? "active",
        created_at: tenant.created_at,
        user_count: usersResult.length,
        timezone: tenant.timezone,
        fiscal_year_start: tenant.fiscal_year_start,
        statement_frequency: tenant.statement_frequency,
        royalty_period_type: tenant.royalty_period_type,
        users: usersResult,
        metrics: metricsResult,
        activity: activityResult,
        last_activity_at: activityResult[0]?.created_at ?? null,
        // Suspension fields (Story 13.4)
        suspended_at: tenant.suspended_at,
        suspended_reason: tenant.suspended_reason,
        suspended_by_admin_email: tenant.suspended_by_admin_email,
      },
    };
  } catch (error) {
    console.error("getTenantDetail error:", error);
    return { success: false, error: "Failed to load tenant details" };
  }
}

/**
 * Suspend a tenant
 * Story 13.4: Implement Tenant Suspension and Reactivation (AC: 1, 2, 5, 9)
 *
 * @param id - Tenant UUID
 * @param reason - Reason for suspension (min 10 chars)
 * @returns ActionResult with success or error
 */
export async function suspendTenant(
  id: string,
  reason: string,
): Promise<ActionResult<void>> {
  try {
    // Validate UUID format
    if (!isValidUUID(id)) {
      return { success: false, error: "Invalid tenant ID format" };
    }

    // Validate reason
    if (!reason || reason.trim().length < 10) {
      return {
        success: false,
        error: "Suspension reason must be at least 10 characters",
      };
    }

    // Check platform admin authentication
    const admin = await getCurrentPlatformAdmin();
    if (!admin) {
      return {
        success: false,
        error: "Unauthorized: Platform admin access required",
      };
    }

    // Safety check: prevent self-suspension
    const adminUser = await adminDb.query.users.findFirst({
      where: eq(users.clerk_user_id, admin.clerkId),
    });
    if (adminUser?.tenant_id === id) {
      return { success: false, error: "Cannot suspend your own tenant" };
    }

    // Verify tenant exists
    const tenant = await getTenantById(id);
    if (!tenant) {
      return { success: false, error: "Tenant not found" };
    }

    // Check if already suspended
    if (tenant.status === "suspended") {
      return { success: false, error: "Tenant is already suspended" };
    }

    // Update tenant status
    await adminDb
      .update(tenants)
      .set({
        status: "suspended",
        suspended_at: new Date(),
        suspended_reason: reason.trim(),
        suspended_by_admin_email: admin.email,
        updated_at: new Date(),
      })
      .where(eq(tenants.id, id));

    // Log platform admin event (fire and forget)
    logPlatformAdminEvent({
      adminEmail: admin.email,
      adminClerkId: admin.clerkId,
      action: PLATFORM_ADMIN_ACTIONS.SUSPEND_TENANT,
      route: `/platform-admin/tenants/${id}`,
      metadata: {
        tenantId: id,
        tenantName: tenant.name,
        reason: reason.trim(),
      },
    });

    // Send notification email to tenant owner (fire and forget)
    const ownerEmail = await getTenantOwnerEmail(id);
    if (ownerEmail) {
      void sendTenantSuspendedEmail({
        to: ownerEmail,
        tenantName: tenant.name,
        reason: reason.trim(),
        suspendedAt: new Date(),
      });
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("suspendTenant error:", error);
    return { success: false, error: "Failed to suspend tenant" };
  }
}

/**
 * Reactivate a suspended tenant
 * Story 13.4: Implement Tenant Suspension and Reactivation (AC: 6, 7, 8, 9)
 *
 * @param id - Tenant UUID
 * @returns ActionResult with success or error
 */
export async function reactivateTenant(
  id: string,
): Promise<ActionResult<void>> {
  try {
    // Validate UUID format
    if (!isValidUUID(id)) {
      return { success: false, error: "Invalid tenant ID format" };
    }

    // Check platform admin authentication
    const admin = await getCurrentPlatformAdmin();
    if (!admin) {
      return {
        success: false,
        error: "Unauthorized: Platform admin access required",
      };
    }

    // Verify tenant exists
    const tenant = await getTenantById(id);
    if (!tenant) {
      return { success: false, error: "Tenant not found" };
    }

    // Check if actually suspended
    if (tenant.status !== "suspended") {
      return { success: false, error: "Tenant is not suspended" };
    }

    // Update tenant status
    await adminDb
      .update(tenants)
      .set({
        status: "active",
        suspended_at: null,
        suspended_reason: null,
        suspended_by_admin_email: null,
        updated_at: new Date(),
      })
      .where(eq(tenants.id, id));

    // Log platform admin event (fire and forget)
    logPlatformAdminEvent({
      adminEmail: admin.email,
      adminClerkId: admin.clerkId,
      action: PLATFORM_ADMIN_ACTIONS.REACTIVATE_TENANT,
      route: `/platform-admin/tenants/${id}`,
      metadata: { tenantId: id, tenantName: tenant.name },
    });

    // Send notification email to tenant owner (fire and forget)
    const ownerEmail = await getTenantOwnerEmail(id);
    if (ownerEmail) {
      void sendTenantReactivatedEmail({
        to: ownerEmail,
        tenantName: tenant.name,
        reactivatedAt: new Date(),
      });
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("reactivateTenant error:", error);
    return { success: false, error: "Failed to reactivate tenant" };
  }
}

/**
 * Get platform dashboard data with all metrics
 * Story 13.5: Build Platform Analytics Dashboard (AC: 1-7)
 *
 * @returns ActionResult with PlatformDashboardData or error
 */
export async function getPlatformDashboard(): Promise<
  ActionResult<PlatformDashboardData>
> {
  try {
    const admin = await getCurrentPlatformAdmin();

    if (!admin) {
      return {
        success: false,
        error: "Unauthorized: Platform admin access required",
      };
    }

    // Log dashboard view (fire and forget)
    logPlatformAdminEvent({
      adminEmail: admin.email,
      adminClerkId: admin.clerkId,
      action: PLATFORM_ADMIN_ACTIONS.VIEW_PLATFORM_DASHBOARD,
      route: "/platform-admin",
      metadata: {},
    });

    // Fetch all metrics in parallel
    const [
      tenantMetrics,
      tenantGrowthTrend,
      userMetrics,
      usageMetrics,
      dbHealth,
    ] = await Promise.all([
      getPlatformTenantMetrics(),
      getTenantGrowthTrend(6),
      getPlatformUserMetrics(),
      getPlatformUsageMetrics(),
      getDatabaseHealthStatus(),
    ]);

    return {
      success: true,
      data: {
        tenantMetrics,
        tenantGrowthTrend,
        userMetrics,
        usageMetrics,
        health: {
          database: dbHealth,
          inngest: getInngestHealthStatus(),
          email: getEmailServiceStatus(),
        },
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("getPlatformDashboard error:", error);
    return { success: false, error: "Failed to load platform dashboard" };
  }
}

/**
 * Start impersonating a tenant user
 * Story 13.6: Implement Tenant Impersonation for Support (AC: 1, 4-7)
 *
 * @param input - User ID and reason for impersonation
 * @returns ActionResult with sign-in URL or error
 */
export async function startImpersonation(
  input: StartImpersonationInput,
): Promise<ActionResult<{ signInUrl: string }>> {
  try {
    const admin = await getCurrentPlatformAdmin();
    if (!admin) {
      return {
        success: false,
        error: "Unauthorized: Platform admin access required",
      };
    }

    // Validate userId
    if (!input.userId) {
      return { success: false, error: "User ID is required" };
    }
    if (!isValidUUID(input.userId)) {
      return { success: false, error: "Invalid user ID format" };
    }

    // Validate reason (min 10 characters)
    if (!input.reason || input.reason.trim().length < 10) {
      return {
        success: false,
        error: "Reason must be at least 10 characters",
      };
    }

    // Lookup target user by database ID
    const targetUser = await adminDb.query.users.findFirst({
      where: eq(users.id, input.userId),
    });
    if (!targetUser) {
      return { success: false, error: "User not found" };
    }

    // CRITICAL: Check clerk_user_id exists
    if (!targetUser.clerk_user_id) {
      return {
        success: false,
        error: "User has no Clerk account - cannot impersonate",
      };
    }

    // CRITICAL: Check tenant is not suspended
    const tenant = await getTenantById(targetUser.tenant_id);
    if (!tenant) {
      return { success: false, error: "User's tenant not found" };
    }
    if (tenant.status === "suspended") {
      return {
        success: false,
        error: "Cannot impersonate users in suspended tenants",
      };
    }

    // Create actor token using CLERK IDs
    const result = await createActorToken(
      targetUser.clerk_user_id,
      admin.clerkId,
    );
    if (!result) {
      return {
        success: false,
        error: "Failed to create impersonation session",
      };
    }

    // Log audit event
    logPlatformAdminEvent({
      adminEmail: admin.email,
      adminClerkId: admin.clerkId,
      action: PLATFORM_ADMIN_ACTIONS.START_IMPERSONATION,
      route: "/platform-admin/impersonate",
      metadata: {
        targetUserId: input.userId,
        targetClerkId: targetUser.clerk_user_id,
        targetTenantId: targetUser.tenant_id,
        targetEmail: targetUser.email,
        reason: input.reason.trim(),
        tokenId: result.tokenId,
      },
    });

    return { success: true, data: { signInUrl: result.url } };
  } catch (error) {
    console.error("startImpersonation error:", error);
    return { success: false, error: "Failed to start impersonation" };
  }
}

/**
 * Get current impersonation status
 * Story 13.6: Implement Tenant Impersonation for Support (AC: 2)
 *
 * @returns ImpersonationStatus indicating if current session is impersonated
 */
export async function getImpersonationStatus(): Promise<ImpersonationStatus> {
  try {
    const { actor, userId } = await auth();

    if (actor?.sub && userId) {
      // Fetch impersonated user details for display
      const impersonatedUser = await adminDb.query.users.findFirst({
        where: eq(users.clerk_user_id, userId),
      });

      let tenantName: string | undefined;
      if (impersonatedUser?.tenant_id) {
        const tenant = await adminDb.query.tenants.findFirst({
          where: eq(tenants.id, impersonatedUser.tenant_id),
        });
        tenantName = tenant?.name;
      }

      return {
        isImpersonating: true,
        impersonatedUserId: impersonatedUser?.id,
        impersonatedEmail: impersonatedUser?.email,
        impersonatorClerkId: actor.sub as string,
        tenantName,
      };
    }

    return { isImpersonating: false };
  } catch (error) {
    console.error("getImpersonationStatus error:", error);
    return { isImpersonating: false };
  }
}

/**
 * Log the end of an impersonation session
 * Story 13.6: Implement Tenant Impersonation for Support (AC: 5)
 *
 * Called before signOut to log END_IMPERSONATION event for duration tracking.
 * @returns ActionResult indicating success
 */
export async function endImpersonation(): Promise<ActionResult<void>> {
  try {
    const { actor, userId } = await auth();

    // Only log if actually impersonating
    if (!actor || !actor.sub || !userId) {
      return { success: true, data: undefined };
    }

    // Fetch impersonated user details for logging
    const impersonatedUser = await adminDb.query.users.findFirst({
      where: eq(users.clerk_user_id, userId),
    });

    // Log audit event
    logPlatformAdminEvent({
      adminEmail: "unknown", // We don't have admin email in impersonated session
      adminClerkId: actor.sub as string,
      action: PLATFORM_ADMIN_ACTIONS.END_IMPERSONATION,
      route: "/platform-admin/end-impersonation",
      metadata: {
        impersonatedUserId: impersonatedUser?.id,
        impersonatedClerkId: userId,
        impersonatedEmail: impersonatedUser?.email,
        impersonatedTenantId: impersonatedUser?.tenant_id,
      },
    });

    return { success: true, data: undefined };
  } catch (error) {
    console.error("endImpersonation error:", error);
    // Don't block signOut on audit failure
    return { success: true, data: undefined };
  }
}

/**
 * Get system health data for monitoring page
 * Story 13.7: Build System Health and Job Monitoring (AC: 1-6)
 *
 * @returns ActionResult with SystemHealthData or error
 */
export async function getSystemHealth(): Promise<
  ActionResult<SystemHealthData>
> {
  try {
    const admin = await getCurrentPlatformAdmin();

    if (!admin) {
      return {
        success: false,
        error: "Unauthorized: Platform admin access required",
      };
    }

    // Log audit event
    logPlatformAdminEvent({
      adminEmail: admin.email,
      adminClerkId: admin.clerkId,
      action: PLATFORM_ADMIN_ACTIONS.VIEW_SYSTEM_HEALTH,
      route: "/platform-admin/system",
      metadata: {},
    });

    // Fetch all metrics in parallel (application is sync, so call it separately)
    const [database, inngest, email] = await Promise.all([
      getDatabaseMetrics(),
      getInngestJobMetrics(),
      getEmailMetrics(),
    ]);
    const application = getApplicationMetrics();

    // Generate alerts based on thresholds
    const alerts: SystemAlert[] = [];

    // Database response time alerts (stable IDs based on alert type for acknowledgment persistence)
    if (database.responseTimeMs > 1000) {
      alerts.push({
        id: "alert-db-response-critical",
        severity: "critical",
        message: `Database response time critical: ${database.responseTimeMs}ms`,
        source: "database",
        createdAt: new Date(),
        acknowledged: false,
      });
    } else if (database.responseTimeMs > 500) {
      alerts.push({
        id: "alert-db-response-warning",
        severity: "warning",
        message: `Database response time degraded: ${database.responseTimeMs}ms`,
        source: "database",
        createdAt: new Date(),
        acknowledged: false,
      });
    }

    // Database connection pool alerts
    if (database.connectionPoolStatus === "error") {
      alerts.push({
        id: "alert-db-pool-error",
        severity: "critical",
        message: "Database connection pool error",
        source: "database",
        createdAt: new Date(),
        acknowledged: false,
      });
    }

    // Inngest success rate alerts (only if we have the data)
    if (inngest.successRateLast24h !== null) {
      if (inngest.successRateLast24h < 80) {
        alerts.push({
          id: "alert-inngest-critical",
          severity: "critical",
          message: `Job success rate critical: ${inngest.successRateLast24h}%`,
          source: "inngest",
          createdAt: new Date(),
          acknowledged: false,
        });
      } else if (inngest.successRateLast24h < 95) {
        alerts.push({
          id: "alert-inngest-warning",
          severity: "warning",
          message: `Job success rate degraded: ${inngest.successRateLast24h}%`,
          source: "inngest",
          createdAt: new Date(),
          acknowledged: false,
        });
      }
    }

    // Email delivery alerts (only if we have the data)
    if (
      email.sentLast24h !== null &&
      email.failedLast24h !== null &&
      email.sentLast24h > 0
    ) {
      const failureRate = (email.failedLast24h / email.sentLast24h) * 100;
      if (failureRate > 5) {
        alerts.push({
          id: "alert-email-failure-rate",
          severity: "warning",
          message: `Email failure rate elevated: ${failureRate.toFixed(1)}%`,
          source: "email",
          createdAt: new Date(),
          acknowledged: false,
        });
      }
    }

    return {
      success: true,
      data: {
        database,
        inngest,
        email,
        application,
        alerts,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("getSystemHealth error:", error);
    return { success: false, error: "Failed to load system health" };
  }
}

/**
 * Create a new platform announcement
 * Story 13.8: Implement Platform-Wide Announcements (AC: 1)
 *
 * @param input - Announcement data
 * @returns ActionResult with created announcement or error
 */
export async function createAnnouncement(
  input: CreateAnnouncementInput,
): Promise<ActionResult<PlatformAnnouncement>> {
  try {
    const admin = await getCurrentPlatformAdmin();
    if (!admin) {
      return {
        success: false,
        error: "Unauthorized: Platform admin access required",
      };
    }

    // Validate message length
    if (!input.message || input.message.trim().length < 10) {
      return {
        success: false,
        error: "Message must be at least 10 characters",
      };
    }

    // Validate type
    if (!["info", "warning", "critical"].includes(input.type)) {
      return {
        success: false,
        error: "Invalid announcement type",
      };
    }

    // Validate startsAt
    if (!input.startsAt) {
      return {
        success: false,
        error: "Start date is required",
      };
    }

    const [result] = await adminDb
      .insert(platformAnnouncements)
      .values({
        message: input.message.trim(),
        type: input.type,
        starts_at: input.startsAt,
        ends_at: input.endsAt ?? null,
        target_roles: input.targetRoles ?? null,
        created_by_admin_email: admin.email,
        updated_by_admin_email: admin.email,
      })
      .returning();

    // Log audit event (fire and forget)
    logPlatformAdminEvent({
      adminEmail: admin.email,
      adminClerkId: admin.clerkId,
      action: PLATFORM_ADMIN_ACTIONS.CREATE_ANNOUNCEMENT,
      route: "/platform-admin/announcements",
      metadata: { announcementId: result.id, type: input.type },
    });

    // Revalidate to refresh UI
    revalidatePath("/platform-admin/announcements");

    return {
      success: true,
      data: {
        id: result.id,
        message: result.message,
        type: result.type as "info" | "warning" | "critical",
        startsAt: result.starts_at,
        endsAt: result.ends_at,
        targetRoles: result.target_roles,
        isActive: result.is_active,
        createdAt: result.created_at,
        createdByAdminEmail: result.created_by_admin_email,
        updatedAt: result.updated_at,
        updatedByAdminEmail: result.updated_by_admin_email,
      },
    };
  } catch (error) {
    console.error("createAnnouncement error:", error);
    return { success: false, error: "Failed to create announcement" };
  }
}

/**
 * Update an existing platform announcement
 * Story 13.8: Implement Platform-Wide Announcements (AC: 6)
 *
 * @param id - Announcement UUID
 * @param input - Updated announcement data
 * @returns ActionResult with updated announcement or error
 */
export async function updateAnnouncement(
  id: string,
  input: UpdateAnnouncementInput,
): Promise<ActionResult<PlatformAnnouncement>> {
  try {
    const admin = await getCurrentPlatformAdmin();
    if (!admin) {
      return {
        success: false,
        error: "Unauthorized: Platform admin access required",
      };
    }

    // Validate UUID format
    if (!isValidUUID(id)) {
      return { success: false, error: "Invalid announcement ID format" };
    }

    // Validate message if provided
    if (input.message !== undefined && input.message.trim().length < 10) {
      return {
        success: false,
        error: "Message must be at least 10 characters",
      };
    }

    // Validate type if provided
    if (
      input.type !== undefined &&
      !["info", "warning", "critical"].includes(input.type)
    ) {
      return { success: false, error: "Invalid announcement type" };
    }

    const updateValues: Record<string, unknown> = {
      updated_at: new Date(),
      updated_by_admin_email: admin.email,
    };

    if (input.message !== undefined)
      updateValues.message = input.message.trim();
    if (input.type !== undefined) updateValues.type = input.type;
    if (input.startsAt !== undefined) updateValues.starts_at = input.startsAt;
    if (input.endsAt !== undefined) updateValues.ends_at = input.endsAt;
    if (input.targetRoles !== undefined)
      updateValues.target_roles = input.targetRoles;
    if (input.isActive !== undefined) updateValues.is_active = input.isActive;

    const [result] = await adminDb
      .update(platformAnnouncements)
      .set(updateValues)
      .where(eq(platformAnnouncements.id, id))
      .returning();

    if (!result) {
      return { success: false, error: "Announcement not found" };
    }

    // Log audit event (fire and forget)
    logPlatformAdminEvent({
      adminEmail: admin.email,
      adminClerkId: admin.clerkId,
      action: PLATFORM_ADMIN_ACTIONS.UPDATE_ANNOUNCEMENT,
      route: `/platform-admin/announcements/${id}`,
      metadata: { announcementId: id, changes: Object.keys(input) },
    });

    // Revalidate to refresh UI
    revalidatePath("/platform-admin/announcements");

    return {
      success: true,
      data: {
        id: result.id,
        message: result.message,
        type: result.type as "info" | "warning" | "critical",
        startsAt: result.starts_at,
        endsAt: result.ends_at,
        targetRoles: result.target_roles,
        isActive: result.is_active,
        createdAt: result.created_at,
        createdByAdminEmail: result.created_by_admin_email,
        updatedAt: result.updated_at,
        updatedByAdminEmail: result.updated_by_admin_email,
      },
    };
  } catch (error) {
    console.error("updateAnnouncement error:", error);
    return { success: false, error: "Failed to update announcement" };
  }
}

/**
 * Deactivate an announcement (soft delete)
 * Story 13.8: Implement Platform-Wide Announcements (AC: 6)
 *
 * @param id - Announcement UUID
 * @returns ActionResult with success or error
 */
export async function deactivateAnnouncement(
  id: string,
): Promise<ActionResult<void>> {
  const result = await updateAnnouncement(id, { isActive: false });
  return result.success
    ? { success: true, data: undefined }
    : { success: false, error: result.error };
}

/**
 * Delete an announcement permanently
 * Story 13.8: Implement Platform-Wide Announcements (AC: 6)
 *
 * @param id - Announcement UUID
 * @returns ActionResult with success or error
 */
export async function deleteAnnouncement(
  id: string,
): Promise<ActionResult<void>> {
  try {
    const admin = await getCurrentPlatformAdmin();
    if (!admin) {
      return {
        success: false,
        error: "Unauthorized: Platform admin access required",
      };
    }

    // Validate UUID format
    if (!isValidUUID(id)) {
      return { success: false, error: "Invalid announcement ID format" };
    }

    // Delete the announcement
    const deleted = await adminDb
      .delete(platformAnnouncements)
      .where(eq(platformAnnouncements.id, id))
      .returning({ id: platformAnnouncements.id });

    if (deleted.length === 0) {
      return { success: false, error: "Announcement not found" };
    }

    // Log audit event (fire and forget)
    logPlatformAdminEvent({
      adminEmail: admin.email,
      adminClerkId: admin.clerkId,
      action: PLATFORM_ADMIN_ACTIONS.DELETE_ANNOUNCEMENT,
      route: `/platform-admin/announcements/${id}`,
      metadata: { announcementId: id },
    });

    // Revalidate to refresh UI
    revalidatePath("/platform-admin/announcements");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("deleteAnnouncement error:", error);
    return { success: false, error: "Failed to delete announcement" };
  }
}
