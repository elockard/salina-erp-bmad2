"use client";

/**
 * System Monitoring Client Component
 *
 * Story 13.7: Build System Health and Job Monitoring (AC: 1-6)
 *
 * Composes all monitoring cards with:
 * - Auto-refresh functionality (30 second interval)
 * - Alert acknowledgment state (client-side only)
 * - Manual refresh button
 * - Last updated timestamp
 */

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getSystemHealth } from "@/modules/platform-admin/actions";
import { AlertsSection } from "@/modules/platform-admin/components/alerts-section";
import { ApplicationHealthCard } from "@/modules/platform-admin/components/application-health-card";
import { DatabaseHealthCard } from "@/modules/platform-admin/components/database-health-card";
import { EmailDeliveryCard } from "@/modules/platform-admin/components/email-delivery-card";
import { InngestJobsCard } from "@/modules/platform-admin/components/inngest-jobs-card";
import type { SystemHealthData } from "@/modules/platform-admin/types";

/** Auto-refresh interval for system health data */
const AUTO_REFRESH_INTERVAL_MS = 30000; // 30 seconds

interface SystemMonitoringClientProps {
  initialData: SystemHealthData;
}

export function SystemMonitoringClient({
  initialData,
}: SystemMonitoringClientProps) {
  const [data, setData] = useState(initialData);
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(
    new Set(),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Auto-refresh at configured interval
  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await getSystemHealth();
      if (!result.success) {
        setRefreshError(result.error ?? "Failed to refresh data");
        return;
      }
      setData(result.data);
      setRefreshError(null);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshError(null);
    const result = await getSystemHealth();
    if (!result.success) {
      setRefreshError(result.error ?? "Failed to refresh data");
      setIsRefreshing(false);
      return;
    }
    setData(result.data);
    setIsRefreshing(false);
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    setAcknowledgedAlerts((prev) => new Set([...prev, alertId]));
  };

  const activeAlerts = data.alerts.filter((a) => !acknowledgedAlerts.has(a.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Last updated: {new Date(data.generatedAt).toLocaleString()}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {refreshError && (
        <div className="rounded-md border border-red-700 bg-red-900/50 p-3">
          <p className="text-sm text-red-400">{refreshError}</p>
        </div>
      )}

      <AlertsSection
        alerts={activeAlerts}
        onAcknowledge={handleAcknowledgeAlert}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DatabaseHealthCard metrics={data.database} />
        <InngestJobsCard metrics={data.inngest} />
        <EmailDeliveryCard metrics={data.email} />
        <ApplicationHealthCard metrics={data.application} />
      </div>

      <p className="text-xs text-slate-600">
        Auto-refreshes every {AUTO_REFRESH_INTERVAL_MS / 1000} seconds. Alerts
        are client-side only and reset on page refresh.
      </p>
    </div>
  );
}
