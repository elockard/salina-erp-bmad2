"use client";

/**
 * Application Health Card Component
 *
 * Story 13.7: Build System Health and Job Monitoring (AC: 4)
 *
 * Displays application-level metrics:
 * - Runtime environment
 * - Node.js version
 * - Memory usage (when available)
 * - Uptime (when available)
 */

import { Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApplicationMetrics } from "../types";

interface ApplicationHealthCardProps {
  metrics: ApplicationMetrics;
}

const statusColors = {
  healthy: "bg-green-500",
  degraded: "bg-amber-500",
  unknown: "bg-slate-500",
};

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function ApplicationHealthCard({ metrics }: ApplicationHealthCardProps) {
  return (
    <Card className="border-slate-700 bg-slate-800">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <Server className="h-5 w-5" />
          Application
          <span
            className={`ml-auto h-2.5 w-2.5 rounded-full ${statusColors[metrics.status]}`}
            title={metrics.status}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Environment</span>
          <span className="text-sm font-medium text-slate-200">
            {metrics.environment}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Node.js</span>
          <span className="text-sm font-medium text-slate-200">
            {metrics.nodeVersion}
          </span>
        </div>
        {metrics.memoryUsageMb !== null && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Memory Usage</span>
            <span className="text-sm font-medium text-slate-200">
              {metrics.memoryUsageMb} MB
            </span>
          </div>
        )}
        {metrics.uptimeSeconds !== null && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Uptime</span>
            <span className="text-sm font-medium text-slate-200">
              {formatUptime(metrics.uptimeSeconds)}
            </span>
          </div>
        )}
        {metrics.isServerless && (
          <div className="border-t border-slate-700 pt-3">
            <p className="text-xs text-slate-500">
              Running in serverless mode - memory and uptime metrics are
              per-request
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
