/**
 * ISBN Pool Status Report Page
 *
 * Displays ISBN pool utilization metrics, alerts, and insights.
 *
 * Story: 6.3 - Build ISBN Pool Status Report
 * AC: 1 (Users can access /reports/isbn-pool page)
 * AC: 2-9 (Full ISBN pool report functionality)
 *
 * Permission: owner, admin, editor, finance (NOT author)
 */

import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission } from "@/lib/auth";
import { ISBNPoolAlert } from "@/modules/reports/components/isbn-pool-alert";
import { ISBNPoolCharts } from "@/modules/reports/components/isbn-pool-charts";
import { ISBNPoolInsights } from "@/modules/reports/components/isbn-pool-insights";
import { ISBNPoolStats } from "@/modules/reports/components/isbn-pool-stats";
import {
  getISBNAssignmentHistory,
  getISBNPoolMetrics,
} from "@/modules/reports/queries";

export const dynamic = "force-dynamic";

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Skeleton className="h-80" />
      <Skeleton className="h-80" />
    </div>
  );
}

async function ISBNPoolContent() {
  const [metrics, history] = await Promise.all([
    getISBNPoolMetrics(),
    getISBNAssignmentHistory(6),
  ]);

  return (
    <>
      {/* AC-6: Warning alerts when available < 10 */}
      <ISBNPoolAlert metrics={metrics} />

      {/* AC-2, AC-3: Stats cards with counts and utilization */}
      <ISBNPoolStats metrics={metrics} />

      {/* AC-4, AC-5: Pie chart and timeline chart */}
      <ISBNPoolCharts metrics={metrics} history={history} />

      {/* AC-7, AC-8, AC-9: Burn rate, runout, and import button */}
      <ISBNPoolInsights metrics={metrics} />
    </>
  );
}

export default async function ISBNPoolReportPage() {
  // AC-1: Block Author role from accessing ISBN pool report
  const canAccess = await hasPermission([
    "owner",
    "admin",
    "editor",
    "finance",
  ]);
  if (!canAccess) {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ISBN Pool Status</h1>
        <p className="text-muted-foreground">
          Monitor ISBN inventory, utilization, and plan for reorders
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-6">
            <StatsSkeleton />
            <ChartsSkeleton />
          </div>
        }
      >
        <ISBNPoolContent />
      </Suspense>
    </div>
  );
}
