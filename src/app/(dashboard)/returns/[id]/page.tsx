import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { VIEW_RETURNS } from "@/lib/permissions";
import { getReturnByIdAction } from "@/modules/returns/actions";
import { ReturnDetailView } from "@/modules/returns/components/return-detail-view";

/**
 * Return Detail Page
 *
 * Displays full information about a specific return.
 * Story 3.7: AC 10 (Return detail page)
 *
 * Content:
 * - Status badge prominently displayed
 * - Return Information card
 * - Submission metadata
 * - Review metadata (if approved/rejected)
 * - Back to Returns History link
 */

export const metadata = {
  title: "Return Details - Salina ERP",
};

interface ReturnDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ReturnDetailPage({
  params,
}: ReturnDetailPageProps) {
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

  // Get return data
  const { id } = await params;
  const result = await getReturnByIdAction(id);

  if (!result.success || !result.data) {
    notFound();
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
          className="hover:text-foreground transition-colors"
        >
          Returns
        </Link>
        <ChevronRight className="mx-2 h-4 w-4" />
        <span className="text-foreground font-medium">Return Details</span>
      </nav>

      {/* Return Detail View */}
      <ReturnDetailView returnData={result.data} />
    </div>
  );
}
