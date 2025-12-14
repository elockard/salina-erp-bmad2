/**
 * System Monitoring Page
 *
 * Story 13.7: Build System Health and Job Monitoring (AC: 1)
 *
 * Server component that fetches system health data and renders
 * the monitoring dashboard for platform administrators.
 */

import { getCurrentPlatformAdmin } from "@/lib/platform-admin";
import { getSystemHealth } from "@/modules/platform-admin/actions";
import { SystemMonitoringClient } from "./client";

export default async function SystemMonitoringPage() {
  const admin = await getCurrentPlatformAdmin();
  if (!admin) {
    return null; // Layout handles redirect
  }

  const result = await getSystemHealth();

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-2 text-3xl font-bold text-white">System Monitoring</h1>
      <p className="mb-8 text-slate-400">
        Monitor database, background jobs, and email service health
      </p>

      {result.success && result.data ? (
        <SystemMonitoringClient initialData={result.data} />
      ) : (
        <div className="rounded-lg border border-red-700 bg-red-900/20 p-4">
          <p className="text-red-400">
            Failed to load system health:{" "}
            {!result.success ? result.error : "Unknown error"}
          </p>
        </div>
      )}
    </div>
  );
}
