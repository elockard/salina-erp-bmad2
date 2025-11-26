import { currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getAuthenticatedDb } from "@/db";
import type { User, UserRole } from "@/db/schema";
import { users } from "@/db/schema/users";

/**
 * Get the current tenant ID from request headers set by middleware
 * @throws Error if tenant ID is not found
 */
export async function getCurrentTenantId(): Promise<string> {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id");

  if (!tenantId) {
    throw new Error("Tenant ID not found in request context");
  }

  return tenantId;
}

/**
 * Get authenticated database client with JWT for RLS enforcement
 * Uses Neon Authorize to validate JWT and populate auth.user_id()
 * @throws Error if JWT token is not found in request context
 */
export async function getDb() {
  const headersList = await headers();
  const jwt = headersList.get("x-clerk-jwt");

  if (!jwt) {
    throw new Error("Authentication token not found in request context");
  }

  return getAuthenticatedDb(jwt);
}

/**
 * Get the current authenticated user from the database
 * Uses Neon Authorize authenticated connection with Clerk JWT
 * @returns User object with role, or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  const tenantId = await getCurrentTenantId();
  const db = await getDb(); // Authenticated connection with JWT

  // Query with tenant_id filter + RLS enforces clerk_user_id match
  const user = await db.query.users.findFirst({
    where: and(
      eq(users.clerk_user_id, clerkUser.id),
      eq(users.tenant_id, tenantId),
    ),
  });

  return user || null;
}

/**
 * Check if the current user has one of the allowed roles
 * @param allowedRoles Array of roles that are permitted
 * @returns true if user has permission, false otherwise
 */
export async function checkPermission(
  allowedRoles: UserRole[],
): Promise<boolean> {
  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  return allowedRoles.includes(user.role as UserRole);
}

/**
 * Check if the current user has one of the allowed roles
 * Also checks that the user is active
 * @param allowedRoles Array of roles that are permitted
 * @returns true if user has permission and is active, false otherwise
 */
export async function hasPermission(
  allowedRoles: UserRole[],
): Promise<boolean> {
  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  if (!user.is_active) {
    return false;
  }

  return allowedRoles.includes(user.role as UserRole);
}

/**
 * Require the current user to have one of the allowed roles
 * Throws an error if permission is denied
 * @param allowedRoles Array of roles that are permitted
 * @throws Error with message "UNAUTHORIZED" if permission denied
 */
export async function requirePermission(
  allowedRoles: UserRole[],
): Promise<void> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  if (!user.is_active || !allowedRoles.includes(user.role as UserRole)) {
    console.warn("Permission denied", {
      userId: user.id,
      role: user.role,
      isActive: user.is_active,
      allowedRoles,
    });
    throw new Error("UNAUTHORIZED");
  }
}
