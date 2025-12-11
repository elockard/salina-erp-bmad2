/**
 * Accounts Receivable Report Page
 *
 * Displays AR aging report, summary stats, and customer drill-down.
 *
 * Story: 8.5 - Build Accounts Receivable Dashboard
 * AC-8.5.1: Finance/Admin/Owner users can access /reports/accounts-receivable
 * AC-8.5.2: Summary stats cards showing totals
 * AC-8.5.3: Aging report table
 * AC-8.5.4: Customer drill-down (handled in client component)
 * AC-8.5.5: Visual aging chart
 * AC-8.5.6: CSV export
 * AC-8.5.7: PDF export with company header
 *
 * Permission: owner, admin, finance (NOT editor, NOT author)
 */

import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission } from "@/lib/auth";
import { ARReportClient } from "@/modules/reports/components/ar-report-client";
import { ARSummaryStats } from "@/modules/reports/components/ar-summary-stats";
import {
  getAgingReportByCustomer,
  getARSummary,
  getTenantForReport,
} from "@/modules/reports/queries";

export const dynamic = "force-dynamic";

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
  );
}

function ChartSkeleton() {
  return <Skeleton className="h-64" />;
}

function TableSkeleton() {
  return <Skeleton className="h-96" />;
}

async function ARSummarySection() {
  const summary = await getARSummary();
  return <ARSummaryStats summary={summary} />;
}

async function ARReportSection() {
  const [agingData, tenant] = await Promise.all([
    getAgingReportByCustomer(),
    getTenantForReport(),
  ]);

  return <ARReportClient agingData={agingData} tenant={tenant} />;
}

export default async function AccountsReceivableReportPage() {
  // AC-8.5.1: Block Editor and Author roles - only Finance, Admin, Owner can access
  const canAccess = await hasPermission(["owner", "admin", "finance"]);
  if (!canAccess) {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Accounts Receivable
          </h1>
          <p className="text-muted-foreground">
            Track outstanding invoices and customer aging
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <Suspense fallback={<StatsSkeleton />}>
        <ARSummarySection />
      </Suspense>

      {/* Chart and Table */}
      <Suspense
        fallback={
          <div className="space-y-6">
            <ChartSkeleton />
            <TableSkeleton />
          </div>
        }
      >
        <ARReportSection />
      </Suspense>
    </div>
  );
}
