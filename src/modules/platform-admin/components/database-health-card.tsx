"use client";

/**
 * Database Health Card Component
 *
 * Story 13.7: Build System Health and Job Monitoring (AC: 2)
 *
 * Displays detailed database metrics:
 * - Connection pool status
 * - Active/idle connections
 * - Database size
 * - Response time with color coding
 */

import { Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DatabaseMetrics } from "../types";

interface DatabaseHealthCardProps {
  metrics: DatabaseMetrics;
}

const statusColors = {
  healthy: "bg-green-500",
  degraded: "bg-amber-500",
  error: "bg-red-500",
};

const statusLabels = {
  healthy: "Healthy",
  degraded: "Degraded",
  error: "Error",
};

function formatResponseTime(ms: number): { value: string; color: string } {
  if (ms < 100) {
    return { value: `${ms}ms`, color: "text-green-400" };
  }
  if (ms < 500) {
    return { value: `${ms}ms`, color: "text-amber-400" };
  }
  return { value: `${ms}ms`, color: "text-red-400" };
}

export function DatabaseHealthCard({ metrics }: DatabaseHealthCardProps) {
  const responseTime = formatResponseTime(metrics.responseTimeMs);

  return (
    <Card className="border-slate-700 bg-slate-800">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <Database className="h-5 w-5" />
          Database
          <span
            className={`ml-auto h-2.5 w-2.5 rounded-full ${statusColors[metrics.connectionPoolStatus]}`}
            title={statusLabels[metrics.connectionPoolStatus]}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Connection Pool</span>
          <span className="text-sm font-medium text-slate-200">
            {statusLabels[metrics.connectionPoolStatus]}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Active Connections</span>
          <span className="text-sm font-medium text-slate-200">
            {metrics.activeConnections}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Response Time</span>
          <span className={`text-sm font-medium ${responseTime.color}`}>
            {responseTime.value}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Database Size</span>
          <span className="text-sm font-medium text-slate-200">
            {metrics.databaseSizeMb} MB
          </span>
        </div>
        <div className="border-t border-slate-700 pt-3">
          <p className="text-xs text-slate-500">
            Slow query tracking requires pg_stat_statements (may not be
            available on free tier)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
