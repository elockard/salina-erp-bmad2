"use server";

/**
 * Server Actions for authentication checks
 *
 * These wrappers allow client components to check permissions
 * via server actions instead of direct imports.
 *
 * Usage: Import these in client components instead of direct auth.ts functions
 */

import type { UserRole } from "@/db/schema";
import { hasPermission as hasPermissionServer } from "./auth";

/**
 * Check if current user has permission (server action wrapper)
 * Can be called from client components
 */
export async function checkUserPermission(
  allowedRoles: UserRole[],
): Promise<boolean> {
  return hasPermissionServer(allowedRoles);
}
