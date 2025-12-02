"use client";

/**
 * Health Status Component
 *
 * Displays system health status for all external services.
 *
 * Story: 6.6 - Build Background Job Monitoring for System Administration
 * AC-6.6.7: System health section shows status of Database, Clerk, S3, Resend, Inngest
 * AC-6.6.8: Health check failures display warning indicators
 *
 * Related:
 * - src/lib/health-checks.ts (health check functions)
 * - src/modules/admin/actions.ts (server action)
 */

import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  HardDrive,
  Loader2,
  Mail,
  RefreshCw,
  Server,
  Shield,
} from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { runHealthChecks } from "../actions";
import type {
  HealthCheckResult,
  HealthStatus as HealthStatusType,
} from "../types";

/**
 * Icon mapping for each service
 */
const SERVICE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  Database: Database,
  Clerk: Shield,
  S3: HardDrive,
  Resend: Mail,
  Inngest: Server,
};

/**
 * Status indicator component
 */
function StatusIndicator({ status }: { status: HealthStatusType }) {
  switch (status) {
    case "healthy":
      return (
        <CheckCircle2
          className="h-5 w-5 text-green-500"
          data-testid="status-healthy"
        />
      );
    case "degraded":
      return (
        <AlertCircle
          className="h-5 w-5 text-yellow-500"
          data-testid="status-degraded"
        />
      );
    case "unhealthy":
      return (
        <AlertCircle
          className="h-5 w-5 text-red-500"
          data-testid="status-unhealthy"
        />
      );
    case "checking":
      return (
        <Loader2
          className="h-5 w-5 text-muted-foreground animate-spin"
          data-testid="status-checking"
        />
      );
    default:
      return null;
  }
}

/**
 * Service card component
 */
function ServiceCard({
  result,
  isLoading,
}: {
  result: HealthCheckResult;
  isLoading: boolean;
}) {
  const Icon = SERVICE_ICONS[result.service] || Server;
  const status = isLoading ? "checking" : result.status;

  return (
    <Card
      className={
        status === "unhealthy"
          ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
          : status === "degraded"
            ? "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950"
            : ""
      }
      data-testid={`health-card-${result.service.toLowerCase()}`}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{result.service}</span>
            <StatusIndicator status={status} />
          </div>
          {result.message && (
            <p className="text-sm text-muted-foreground truncate">
              {result.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {result.latencyMs}ms latency
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Health Status Container Component
 */
export function HealthStatus() {
  const [results, setResults] = useState<HealthCheckResult[]>([]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const fetchHealthStatus = useCallback(() => {
    startTransition(async () => {
      try {
        setError(null);
        const healthResults = await runHealthChecks();
        setResults(healthResults);
        setLastChecked(new Date());
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to run health checks",
        );
      }
    });
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchHealthStatus();
  }, [fetchHealthStatus]);

  // Show loading state if no results yet
  const displayResults: HealthCheckResult[] =
    results.length > 0
      ? results
      : [
          {
            service: "Database",
            status: "checking",
            latencyMs: 0,
            checkedAt: new Date(),
          },
          {
            service: "Clerk",
            status: "checking",
            latencyMs: 0,
            checkedAt: new Date(),
          },
          {
            service: "S3",
            status: "checking",
            latencyMs: 0,
            checkedAt: new Date(),
          },
          {
            service: "Resend",
            status: "checking",
            latencyMs: 0,
            checkedAt: new Date(),
          },
          {
            service: "Inngest",
            status: "checking",
            latencyMs: 0,
            checkedAt: new Date(),
          },
        ];

  return (
    <div className="space-y-4" data-testid="health-status-section">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">System Health</h2>
          {lastChecked && (
            <p className="text-sm text-muted-foreground">
              Last checked{" "}
              {formatDistanceToNow(lastChecked, { addSuffix: true })}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchHealthStatus}
          disabled={isPending}
          data-testid="refresh-health-button"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isPending ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-red-800 dark:bg-red-950 dark:text-red-200">
          <p className="text-sm font-medium">Error checking health status</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {displayResults.map((result) => (
          <ServiceCard
            key={result.service}
            result={result}
            isLoading={isPending && results.length > 0}
          />
        ))}
      </div>
    </div>
  );
}
