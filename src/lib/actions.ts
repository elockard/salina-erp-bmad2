"use server";

import type { UserRole } from "@/db/schema";
import { hasPermission } from "./auth";

/**
 * Server Action wrapper for permission checking
 * Used by client-side hooks to check permissions without importing server-only code
 */
export async function checkPermissionAction(
  allowedRoles: UserRole[],
): Promise<boolean> {
  try {
    return await hasPermission(allowedRoles);
  } catch {
    return false;
  }
}
