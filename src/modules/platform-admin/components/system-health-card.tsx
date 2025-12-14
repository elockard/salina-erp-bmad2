"use client";

/**
 * System Health Card Component
 *
 * Story 13.5: Build Platform Analytics Dashboard (AC: 5)
 *
 * Displays system health indicators for database, background jobs, and email service.
 */

import { ExternalLink } from "lucide-react";
import type { PlatformHealthStatus } from "../types";

interface SystemHealthCardProps {
  health: PlatformHealthStatus;
}

const statusColors = {
  healthy: "bg-green-500",
  degraded: "bg-amber-500",
  error: "bg-red-500",
  unknown: "bg-slate-500",
};

export function SystemHealthCard({ health }: SystemHealthCardProps) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
      <h3 className="mb-4 text-lg font-semibold text-white">System Health</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Database</span>
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${statusColors[health.database.status]}`}
            />
            <span className="text-sm text-slate-400">
              {health.database.responseTimeMs}ms
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Background Jobs</span>
          <a
            href={health.inngest.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-blue-400 hover:underline"
            title="Check Inngest dashboard for job health"
          >
            Dashboard <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Email Service</span>
          <a
            href={health.email.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-blue-400 hover:underline"
            title="Check Resend dashboard for email health"
          >
            Dashboard <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
