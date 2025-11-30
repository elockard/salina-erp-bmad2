import { ChevronRight, Home, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { RECORD_RETURNS, VIEW_RETURNS } from "@/lib/permissions";
import { ReturnsHistoryView } from "@/modules/returns/components/returns-history-view";

/**
 * Returns History Page
 *
 * Main page for viewing returns history with filtering.
 * Story 3.7: AC 1 (page layout), AC 12 (permission check)
 *
 * Features:
 * - Data table with columns (AC 2)
 * - Status filter (AC 3)
 * - Date range filter (AC 4)
 * - Title search (AC 5)
 * - Format filter (AC 6)
 * - Sorting (AC 7)
 * - Pagination (AC 8)
 * - Row click to view detail (AC 9)
 */

export const metadata = {
  title: "Returns History - Salina ERP",
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filters skeleton */}
      <div className="flex flex-wrap gap-4">
        <Skeleton className="h-10 w-[140px]" />
        <Skeleton className="h-10 w-[260px]" />
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-[140px]" />
      </div>

      {/* Table skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static loading skeleton
          <Skeleton key={`skeleton-${i}`} className="h-12 w-full" />
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex justify-between">
        <Skeleton className="h-5 w-[200px]" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-[80px]" />
          <Skeleton className="h-9 w-[100px]" />
          <Skeleton className="h-9 w-[80px]" />
        </div>
      </div>
    </div>
  );
}

export default async function ReturnsPage() {
  // Check user authentication
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Permission check (AC 12)
  const canViewReturns = await hasPermission(VIEW_RETURNS);
  if (!canViewReturns) {
    redirect("/dashboard?error=unauthorized");
  }

  // Check if user can record returns (for the action button)
  const canRecordReturns = await hasPermission(RECORD_RETURNS);

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center text-sm text-muted-foreground">
        <Link
          href="/dashboard"
          className="flex items-center hover:text-foreground transition-colors"
        >
          <Home className="h-4 w-4" />
          <span className="ml-1">Dashboard</span>
        </Link>
        <ChevronRight className="mx-2 h-4 w-4" />
        <span className="text-foreground font-medium">Returns</span>
      </nav>

      {/* Page Header with Action (AC 1) */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Returns History</h1>
          <p className="text-muted-foreground">
            Track approved, rejected, and pending return requests
          </p>
        </div>
        {canRecordReturns && (
          <Button asChild>
            <Link href="/returns/new">
              <Plus className="mr-2 h-4 w-4" />
              Record Return
            </Link>
          </Button>
        )}
      </div>

      {/* Returns History View with Suspense for loading state (AC 14) */}
      <Suspense fallback={<LoadingSkeleton />}>
        <ReturnsHistoryView />
      </Suspense>
    </div>
  );
}
