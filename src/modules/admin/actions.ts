"use server";

/**
 * Admin Module Server Actions
 *
 * Server actions for system monitoring operations.
 *
 * Story: 6.6 - Build Background Job Monitoring for System Administration
 * AC-6.6.7: System health section shows status of Database, Clerk, S3, Resend, Inngest
 * AC-6.6.8: Health check failures display warning indicators
 *
 * Related:
 * - src/lib/health-checks.ts (health check functions)
 * - src/modules/admin/components/health-status.tsx (consumer)
 */

import { requirePermission } from "@/lib/auth";
import { runAllHealthChecks } from "@/lib/health-checks";
import type { HealthCheckResult } from "./types";

/**
 * Run all health checks
 * AC-6.6.7: System health section shows status of Database, Clerk, S3, Resend, Inngest
 *
 * Permission: owner, admin only
 *
 * @returns Array of health check results
 */
export async function runHealthChecks(): Promise<HealthCheckResult[]> {
  // Only owner/admin can run health checks
  await requirePermission(["owner", "admin"]);

  const results = await runAllHealthChecks();

  // Convert Date objects to serializable format for client
  return results.map((result) => ({
    ...result,
    checkedAt: result.checkedAt,
  }));
}
