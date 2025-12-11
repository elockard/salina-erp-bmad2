/**
 * Tax Preparation Report Page
 *
 * Displays 1099 preparation report showing annual earnings per author.
 *
 * Story 11.2: Track Annual Earnings for 1099 Threshold
 * AC-11.2.1: New report accessible at /reports/tax-preparation
 * AC-11.2.1: Report is accessible only to Finance, Admin, and Owner roles
 *
 * Permission: owner, admin, finance (NOT editor, NOT author)
 */

import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission } from "@/lib/auth";
import { TaxPreparationClient } from "@/modules/reports/components/tax-preparation-client";
import { TaxPreparationStats } from "@/modules/reports/components/tax-preparation-stats";
import {
  getAnnualEarningsByAuthor,
  getTaxPreparationStats,
} from "@/modules/reports/queries/tax-preparation";

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

function TableSkeleton() {
  return <Skeleton className="h-96" />;
}

async function TaxStatsSection({ year }: { year: number }) {
  const result = await getTaxPreparationStats(year);

  if (!result.success) {
    return (
      <div className="text-destructive">
        Failed to load statistics: {result.error}
      </div>
    );
  }

  return <TaxPreparationStats stats={result.data} />;
}

async function TaxReportSection({ year }: { year: number }) {
  const result = await getAnnualEarningsByAuthor(year);

  if (!result.success) {
    return (
      <div className="text-destructive">
        Failed to load earnings data: {result.error}
      </div>
    );
  }

  return <TaxPreparationClient initialData={result.data} initialYear={year} />;
}

export default async function TaxPreparationPage() {
  // AC-11.2.1: Only Finance, Admin, Owner can access
  const canAccess = await hasPermission(["owner", "admin", "finance"]);
  if (!canAccess) {
    redirect("/dashboard");
  }

  // Default to current calendar year
  const currentYear = new Date().getFullYear();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            1099 Preparation Report
          </h1>
          <p className="text-muted-foreground">
            Track annual author earnings for IRS 1099-MISC filing
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <Suspense fallback={<StatsSkeleton />}>
        <TaxStatsSection year={currentYear} />
      </Suspense>

      {/* Filters and Table */}
      <Suspense fallback={<TableSkeleton />}>
        <TaxReportSection year={currentYear} />
      </Suspense>
    </div>
  );
}
