"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { and, count, desc, eq, ilike } from "drizzle-orm";
import { tenants } from "@/db/schema/tenants";
import { users } from "@/db/schema/users";
import { logAuditEvent } from "@/lib/audit";
import {
  getCurrentTenantId,
  getCurrentUser,
  getDb,
  requirePermission,
} from "@/lib/auth";
import { MANAGE_USERS } from "@/lib/permissions";
import type { ActionResult } from "@/lib/types";
import { inviteUserSchema } from "./schema";
import type { User, UserRole } from "./types";

/**
 * Get all users for current tenant with pagination, filtering, search
 * Permission: MANAGE_USERS (owner, admin)
 */
export async function getUsers(options?: {
  page?: number;
  pageSize?: number;
  roleFilter?: UserRole | "all";
  searchQuery?: string;
}): Promise<
  ActionResult<{
    users: User[];
    total: number;
    page: number;
    pageSize: number;
  }>
> {
  try {
    await requirePermission(MANAGE_USERS);

    const db = await getDb();
    const tenantId = await getCurrentTenantId();
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const roleFilter = options?.roleFilter || "all";
    const searchQuery = options?.searchQuery || "";

    // Build WHERE clause
    const conditions = [eq(users.tenant_id, tenantId)];

    if (roleFilter !== "all") {
      conditions.push(eq(users.role, roleFilter));
    }

    if (searchQuery) {
      conditions.push(ilike(users.email, `%${searchQuery}%`));
    }

    const whereClause = and(...conditions);

    // Query users with pagination
    const userList = await db.query.users.findMany({
      where: whereClause,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      orderBy: desc(users.created_at),
    });

    // Query total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(users)
      .where(whereClause);

    return {
      success: true,
      data: {
        users: userList,
        total: totalResult.count,
        page,
        pageSize,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to view users",
      };
    }

    console.error("getUsers error:", error);
    return {
      success: false,
      error: "Failed to load users",
    };
  }
}

/**
 * Invite a new user to the current tenant
 * Permission: MANAGE_USERS (owner, admin)
 */
export async function inviteUser(data: unknown): Promise<ActionResult<User>> {
  try {
    // Validate input
    const { email, role } = inviteUserSchema.parse(data);

    // Check permission
    await requirePermission(MANAGE_USERS);

    // Get authenticated db and tenant context
    const db = await getDb();
    const tenantId = await getCurrentTenantId();

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: and(eq(users.tenant_id, tenantId), eq(users.email, email)),
    });

    if (existingUser) {
      return {
        success: false,
        error: "A user with this email already exists in your organization",
      };
    }

    // Get tenant subdomain for redirect URL
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return {
        success: false,
        error: "Tenant not found",
      };
    }

    // Send Clerk invitation
    const client = await clerkClient();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Build redirect URL with tenant subdomain
    // For localhost: http://localhost:3000/dashboard
    // For production: https://tenant.salina.media/dashboard
    const redirectUrl = baseUrl.includes("localhost")
      ? `${baseUrl}/dashboard`
      : `${baseUrl
          .replace("https://", `https://${tenant.subdomain}.`)
          .replace("http://", `http://${tenant.subdomain}.`)}/dashboard`;

    await client.invitations.createInvitation({
      emailAddress: email,
      redirectUrl,
      publicMetadata: { tenant_id: tenantId, role },
    });

    // Create pending user record
    const [newUser] = await db
      .insert(users)
      .values({
        tenant_id: tenantId,
        email,
        role,
        clerk_user_id: "", // Will be set by webhook
        is_active: false, // Activated by webhook
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    // Get current user for audit log
    const currentUser = await getCurrentUser();

    // Log audit event (fire and forget - non-blocking)
    logAuditEvent({
      tenantId,
      userId: currentUser?.id ?? null,
      actionType: "CREATE",
      resourceType: "user",
      resourceId: newUser.id,
      changes: {
        after: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          is_active: false,
        },
      },
      metadata: {
        operation: "invite",
      },
    });

    return { success: true, data: newUser };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to invite users",
      };
    }

    console.error("inviteUser error:", error);
    return {
      success: false,
      error: "Failed to send invitation. Please try again.",
    };
  }
}

/**
 * Update a user's role
 * Permission: MANAGE_USERS (owner, admin)
 * Validation: Cannot demote self, must maintain at least one owner
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole,
): Promise<ActionResult<User>> {
  try {
    // Check permission
    await requirePermission(MANAGE_USERS);

    // Get authenticated db and context
    const db = await getDb();
    const tenantId = await getCurrentTenantId();
    const currentUser = await getCurrentUser();

    // Get target user
    const targetUser = await db.query.users.findFirst({
      where: and(eq(users.id, userId), eq(users.tenant_id, tenantId)),
    });

    if (!targetUser) {
      return { success: false, error: "User not found" };
    }

    // Validate: Owner cannot demote themselves
    if (
      targetUser.id === currentUser?.id &&
      currentUser.role === "owner" &&
      newRole !== "owner"
    ) {
      return {
        success: false,
        error: "You cannot remove your own owner role",
      };
    }

    // Validate: Must maintain at least one owner
    if (newRole !== "owner" && targetUser.role === "owner") {
      const [ownerCount] = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.tenant_id, tenantId),
            eq(users.role, "owner"),
            eq(users.is_active, true),
          ),
        );

      if (ownerCount.count <= 1) {
        return {
          success: false,
          error: "Tenant must have at least one active owner",
        };
      }
    }

    // Update role
    const oldRole = targetUser.role;
    const [updatedUser] = await db
      .update(users)
      .set({
        role: newRole,
        updated_at: new Date(),
      })
      .where(and(eq(users.id, userId), eq(users.tenant_id, tenantId)))
      .returning();

    // Log audit event (fire and forget - non-blocking)
    logAuditEvent({
      tenantId,
      userId: currentUser?.id ?? null,
      actionType: "UPDATE",
      resourceType: "user",
      resourceId: userId,
      changes: {
        before: { role: oldRole },
        after: { role: newRole },
      },
      metadata: {
        operation: "role_change",
        target_user_email: targetUser.email,
      },
    });

    return { success: true, data: updatedUser };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to update user roles",
      };
    }

    console.error("updateUserRole error:", error);
    return {
      success: false,
      error: "Failed to update user role",
    };
  }
}

/**
 * Deactivate a user
 * Permission: MANAGE_USERS (owner, admin)
 * Validation: Cannot deactivate self, must maintain at least one owner
 */
export async function deactivateUser(
  userId: string,
): Promise<ActionResult<User>> {
  try {
    await requirePermission(MANAGE_USERS);

    const db = await getDb();
    const tenantId = await getCurrentTenantId();
    const currentUser = await getCurrentUser();

    // Validate: Cannot deactivate self
    if (userId === currentUser?.id) {
      return {
        success: false,
        error: "You cannot deactivate your own account",
      };
    }

    // Get target user
    const targetUser = await db.query.users.findFirst({
      where: and(eq(users.id, userId), eq(users.tenant_id, tenantId)),
    });

    if (!targetUser) {
      return { success: false, error: "User not found" };
    }

    // Validate: If owner, must have another active owner
    if (targetUser.role === "owner") {
      const [ownerCount] = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.tenant_id, tenantId),
            eq(users.role, "owner"),
            eq(users.is_active, true),
          ),
        );

      if (ownerCount.count <= 1) {
        return {
          success: false,
          error: "Cannot deactivate the last active owner",
        };
      }
    }

    // Deactivate
    const [updatedUser] = await db
      .update(users)
      .set({
        is_active: false,
        updated_at: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    // Log audit event (fire and forget - non-blocking)
    logAuditEvent({
      tenantId,
      userId: currentUser?.id ?? null,
      actionType: "UPDATE",
      resourceType: "user",
      resourceId: userId,
      changes: {
        before: { is_active: true },
        after: { is_active: false },
      },
      metadata: {
        operation: "deactivate",
        target_user_email: targetUser.email,
      },
    });

    return { success: true, data: updatedUser };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to deactivate users",
      };
    }

    console.error("deactivateUser error:", error);
    return {
      success: false,
      error: "Failed to deactivate user",
    };
  }
}

/**
 * Reactivate a user
 * Permission: MANAGE_USERS (owner, admin)
 */
export async function reactivateUser(
  userId: string,
): Promise<ActionResult<User>> {
  try {
    await requirePermission(MANAGE_USERS);

    const db = await getDb();
    const tenantId = await getCurrentTenantId();
    const currentUser = await getCurrentUser();

    // Get target user for audit log
    const targetUser = await db.query.users.findFirst({
      where: and(eq(users.id, userId), eq(users.tenant_id, tenantId)),
    });

    const [updatedUser] = await db
      .update(users)
      .set({
        is_active: true,
        updated_at: new Date(),
      })
      .where(and(eq(users.id, userId), eq(users.tenant_id, tenantId)))
      .returning();

    if (!updatedUser) {
      return { success: false, error: "User not found" };
    }

    // Log audit event (fire and forget - non-blocking)
    logAuditEvent({
      tenantId,
      userId: currentUser?.id ?? null,
      actionType: "UPDATE",
      resourceType: "user",
      resourceId: userId,
      changes: {
        before: { is_active: false },
        after: { is_active: true },
      },
      metadata: {
        operation: "reactivate",
        target_user_email: targetUser?.email,
      },
    });

    return { success: true, data: updatedUser };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to reactivate users",
      };
    }

    console.error("reactivateUser error:", error);
    return {
      success: false,
      error: "Failed to reactivate user",
    };
  }
}
