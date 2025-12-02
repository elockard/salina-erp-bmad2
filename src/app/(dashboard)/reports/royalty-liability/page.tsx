/**
 * Royalty Liability Summary Report Page
 *
 * Displays royalty liability metrics across all authors for cash flow planning.
 *
 * Story: 6.4 - Build Royalty Liability Summary Report
 * AC: 1 (Finance/Admin/Owner users can access /reports/royalty-liability)
 * AC: 2-7 (Full royalty liability report functionality)
 *
 * Permission: owner, admin, finance (NOT editor, NOT author)
 */

import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission } from "@/lib/auth";
import {
  AdvanceTrackingSection,
  LiabilityByAuthorTable,
  LiabilityExportButton,
  LiabilitySummaryStats,
} from "@/modules/reports/components";
import { getRoyaltyLiabilitySummary } from "@/modules/reports/queries";

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

function AdvancesSkeleton() {
  return <Skeleton className="h-64" />;
}

async function RoyaltyLiabilityContent() {
  const summary = await getRoyaltyLiabilitySummary();

  return (
    <div className="space-y-6">
      {/* AC-2: Summary stats show: Total Unpaid Liability, Authors with Pending Payments, Oldest Unpaid Statement */}
      {/* AC-3: Average payment per author is calculated */}
      <LiabilitySummaryStats summary={summary} />

      {/* AC-4: Liability by author table shows: Author, Titles, Unpaid Statements, Total Owed, Oldest Statement */}
      {/* AC-5: Table is sortable by amount owed (default: highest first) */}
      <LiabilityByAuthorTable data={summary.liabilityByAuthor} />

      {/* AC-6: Advance tracking section shows authors with active advances and remaining balances */}
      <AdvanceTrackingSection data={summary.advanceBalances} />
    </div>
  );
}

export default async function RoyaltyLiabilityReportPage() {
  // AC-1: Block Editor and Author roles - only Finance, Admin, Owner can access
  const canAccess = await hasPermission(["owner", "admin", "finance"]);
  if (!canAccess) {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Royalty Liability Summary
          </h1>
          <p className="text-muted-foreground">
            Track outstanding royalty obligations and plan cash flow for
            payments
          </p>
        </div>
        {/* AC-7: CSV export available for accounting system import */}
        <LiabilityExportButton />
      </div>

      <Suspense
        fallback={
          <div className="space-y-6">
            <StatsSkeleton />
            <TableSkeleton />
            <AdvancesSkeleton />
          </div>
        }
      >
        <RoyaltyLiabilityContent />
      </Suspense>
    </div>
  );
}
