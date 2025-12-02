/**
 * System Monitoring Page
 *
 * Admin page for monitoring system health and background jobs.
 *
 * Story: 6.6 - Build Background Job Monitoring for System Administration
 * AC-6.6.1: Admin/Owner users can access /admin/system page
 * AC-6.6.2: Dashboard shows Active Jobs, Queued Jobs, Recent Completions, Recent Failures
 * AC-6.6.6: Link to Inngest dashboard provided for detailed monitoring
 * AC-6.6.7: System health section shows status of Database, Clerk, S3, Resend, Inngest
 *
 * Permission: owner, admin only (NOT finance, editor, author)
 *
 * Related:
 * - src/modules/admin/components/ (UI components)
 * - src/lib/health-checks.ts (health check utilities)
 */

import { redirect } from "next/navigation";
import { Suspense } from "react";
import { hasPermission } from "@/lib/auth";
import { SystemMonitoringClient } from "./client";

// Force dynamic rendering for real-time data
export const dynamic = "force-dynamic";

/**
 * Loading skeleton for system monitoring
 */
function SystemMonitoringSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Health section skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl" />
          ))}
        </div>
      </div>

      {/* Job summary skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-xl" />
          ))}
        </div>
      </div>

      {/* Job list skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    </div>
  );
}

/**
 * System Monitoring Page Component
 * AC-6.6.1: Admin/Owner users can access /admin/system page
 */
export default async function SystemMonitoringPage() {
  // Permission check: Owner and Admin only
  const canAccess = await hasPermission(["owner", "admin"]);

  if (!canAccess) {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Monitoring</h1>
        <p className="text-muted-foreground">
          Monitor system health, background jobs, and service status
        </p>
      </div>

      <Suspense fallback={<SystemMonitoringSkeleton />}>
        <SystemMonitoringClient />
      </Suspense>
    </div>
  );
}
