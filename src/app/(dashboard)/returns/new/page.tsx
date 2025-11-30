import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { RECORD_RETURNS } from "@/lib/permissions";
import { ReturnsForm } from "@/modules/returns/components/returns-form";
import { getTenantTimezone } from "@/modules/returns/queries";

/**
 * Return Entry Page
 *
 * Story 3.5: Build Return Request Entry Form
 * AC 1: Return entry page at /returns/new with "Spacious Guided Flow" layout
 *   - Page header: "Record Return Request"
 *   - Subtitle: "Submit return requests for approval before affecting royalties"
 *   - Form centered with max-width constraint (matching sales form pattern)
 *
 * AC 6: Tenant timezone support - fetches timezone for date display
 * AC 12: Permission enforcement - Only Editor, Finance, Admin, or Owner can access
 * AC 14: Breadcrumb navigation: Dashboard > Returns > Record Return
 */

export const metadata = {
  title: "Record Return - Salina ERP",
};

export default async function ReturnsNewPage() {
  // Check user authentication
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // AC 12: Permission check - redirect unauthorized users
  const canRecordReturns = await hasPermission(RECORD_RETURNS);
  if (!canRecordReturns) {
    // Redirect to dashboard with error (toast shown via query param)
    redirect("/dashboard?error=unauthorized");
  }

  // AC 6: Fetch tenant timezone for date display
  const timezone = await getTenantTimezone();

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation - AC 14 */}
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
        <span className="text-foreground font-medium">Record Return</span>
      </nav>

      {/* Page Header - AC 1 */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Record Return Request
        </h1>
        <p className="text-muted-foreground">
          Submit return requests for approval before affecting royalties
        </p>
      </div>

      {/* Form Container - AC 1: Spacious Guided Flow */}
      <div className="mx-auto max-w-xl">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <ReturnsForm timezone={timezone} autoFocus />
        </div>
      </div>
    </div>
  );
}
