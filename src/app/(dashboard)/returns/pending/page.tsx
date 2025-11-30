import { ChevronRight, Home, RotateCcw } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { APPROVE_RETURNS } from "@/lib/permissions";
import { ApprovalQueueView } from "@/modules/returns/components/approval-queue-view";
import { getPendingReturnsCount } from "@/modules/returns/queries";

/**
 * Pending Returns Approval Queue Page
 *
 * Finance/Admin/Owner page for reviewing and approving return requests.
 * Story 3.6: AC 1 (page at /returns/pending), AC 11 (permission enforcement)
 *
 * Features:
 * - Split View Explorer layout (AC 1)
 * - Permission check for APPROVE_RETURNS (AC 11)
 * - Dynamic count in header (AC 1)
 * - Breadcrumb navigation
 */

export const metadata = {
  title: "Pending Returns - Salina ERP",
};

function LoadingSkeleton() {
  return (
    <div className="flex h-[calc(100vh-12rem)]">
      {/* Left panel skeleton */}
      <div className="w-[320px] border-r">
        <div className="p-4 border-b">
          <Skeleton className="h-6 w-[180px]" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static loading skeleton
            <Skeleton key={`skeleton-${i}`} className="h-20 w-full" />
          ))}
        </div>
      </div>
      {/* Right panel skeleton */}
      <div className="flex-1 p-6">
        <Skeleton className="h-8 w-[200px] mb-6" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    </div>
  );
}

async function PendingReturnsHeader() {
  const count = await getPendingReturnsCount();
  return (
    <h1 className="text-2xl font-bold tracking-tight">
      Pending Returns ({count})
    </h1>
  );
}

export default async function PendingReturnsPage() {
  // Check user authentication
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Permission check (AC 11) - Only Finance, Admin, Owner can access
  const canApproveReturns = await hasPermission(APPROVE_RETURNS);
  if (!canApproveReturns) {
    redirect("/dashboard?error=unauthorized");
  }

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
        <Link
          href="/returns"
          className="flex items-center hover:text-foreground transition-colors"
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Returns
        </Link>
        <ChevronRight className="mx-2 h-4 w-4" />
        <span className="text-foreground font-medium">Pending Approvals</span>
      </nav>

      {/* Page Header with Dynamic Count (AC 1) */}
      <div className="space-y-1">
        <Suspense fallback={<Skeleton className="h-8 w-[240px]" />}>
          <PendingReturnsHeader />
        </Suspense>
        <p className="text-muted-foreground">
          Review and approve or reject return requests
        </p>
      </div>

      {/* Approval Queue View with Split View Explorer Layout (AC 1, 2, 3) */}
      <Suspense fallback={<LoadingSkeleton />}>
        <ApprovalQueueView />
      </Suspense>
    </div>
  );
}
