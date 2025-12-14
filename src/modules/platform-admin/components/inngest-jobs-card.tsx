"use client";

/**
 * Inngest Jobs Card Component
 *
 * Story 13.7: Build System Health and Job Monitoring (AC: 3)
 *
 * Displays background job metrics:
 * - Queue depth (queued + running)
 * - Recent failures with expandable errors
 * - Success rate percentage
 * - Link to Inngest dashboard
 */

import { AlertCircle, Cog, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InngestJobMetrics } from "../types";

interface InngestJobsCardProps {
  metrics: InngestJobMetrics;
}

const statusColors = {
  healthy: "bg-green-500",
  degraded: "bg-amber-500",
  error: "bg-red-500",
  unknown: "bg-slate-500",
};

const statusLabels = {
  healthy: "Healthy",
  degraded: "Degraded",
  error: "Error",
  unknown: "Check Dashboard",
};

export function InngestJobsCard({ metrics }: InngestJobsCardProps) {
  const hasApiData = metrics.queuedCount !== null;

  return (
    <Card className="border-slate-700 bg-slate-800">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <Cog className="h-5 w-5" />
          Background Jobs
          <span
            className={`ml-auto h-2.5 w-2.5 rounded-full ${statusColors[metrics.status]}`}
            title={statusLabels[metrics.status]}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasApiData ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Queued</span>
              <span className="text-sm font-medium text-slate-200">
                {metrics.queuedCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Running</span>
              <span className="text-sm font-medium text-slate-200">
                {metrics.runningCount}
              </span>
            </div>
            {metrics.successRateLast24h !== null && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  Success Rate (24h)
                </span>
                <span
                  className={`text-sm font-medium ${
                    metrics.successRateLast24h >= 95
                      ? "text-green-400"
                      : metrics.successRateLast24h >= 80
                        ? "text-amber-400"
                        : "text-red-400"
                  }`}
                >
                  {metrics.successRateLast24h}%
                </span>
              </div>
            )}
            {metrics.recentFailures.length > 0 && (
              <div className="border-t border-slate-700 pt-3">
                <p className="mb-2 text-sm text-slate-400">Recent Failures</p>
                <div className="space-y-2">
                  {metrics.recentFailures.slice(0, 5).map((failure) => (
                    <div
                      key={failure.id}
                      className="rounded bg-slate-900 p-2 text-xs"
                    >
                      <div className="flex items-center gap-1 text-red-400">
                        <AlertCircle className="h-3 w-3" />
                        {failure.functionName}
                      </div>
                      <p className="mt-1 truncate text-slate-500">
                        {failure.error}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded bg-slate-900/50 p-3 text-center">
            <p className="text-sm text-slate-400">
              API unavailable - check dashboard for job status
            </p>
          </div>
        )}
        <div className="border-t border-slate-700 pt-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => window.open(metrics.dashboardUrl, "_blank")}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Inngest Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
