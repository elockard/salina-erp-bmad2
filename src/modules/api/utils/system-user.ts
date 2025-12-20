/**
 * API System User Utilities
 *
 * Manages system users for API-created records that require user context.
 * Sales records require created_by_user_id, but API tokens don't have user context.
 */

import { and, eq } from "drizzle-orm";
import { adminDb } from "@/db";
import { users } from "@/db/schema/users";

/**
 * Get or create a system user for API operations within a tenant.
 * Used for records that require created_by_user_id (e.g., sales).
 *
 * @param tenantId - The tenant ID
 * @returns The system user's ID
 */
export async function getApiSystemUser(tenantId: string): Promise<string> {
  const systemEmail = `api-system@${tenantId}.salina.internal`;

  // Try to find existing system user
  let user = await adminDb.query.users.findFirst({
    where: and(eq(users.email, systemEmail), eq(users.tenant_id, tenantId)),
  });

  if (!user) {
    // Create system user on first API operation requiring user context
    [user] = await adminDb
      .insert(users)
      .values({
        email: systemEmail,
        tenant_id: tenantId,
        role: "admin", // Use admin role for system account
        is_active: true,
      })
      .returning();
  }

  return user.id;
}
