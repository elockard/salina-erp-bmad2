import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { RECORD_SALES } from "@/lib/permissions";
import { SalesForm } from "@/modules/sales/components/sales-form";
import { getTenantTimezone } from "@/modules/sales/queries";

/**
 * Sales Entry Page
 *
 * Story 3.2: Build Sales Transaction Entry Form
 * AC 1: Sales entry page at /sales/new with form per UX "Spacious Guided Flow"
 *   - Page header: "Record Sales Transaction"
 *   - Subtitle: "Enter sales data for accurate royalty calculations"
 *   - Form centered with max-width constraint
 *
 * AC 6: Tenant timezone support - fetches timezone for date display
 * AC 12: Permission enforcement - Only Editor, Finance, Admin, or Owner can access
 */

export const metadata = {
  title: "Record Sale - Salina ERP",
};

export default async function SalesNewPage() {
  // Check user authentication
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // AC 12: Permission check - redirect unauthorized users
  const canRecordSales = await hasPermission(RECORD_SALES);
  if (!canRecordSales) {
    // Redirect to dashboard with error (toast shown via query param)
    redirect("/dashboard?error=unauthorized");
  }

  // AC 6: Fetch tenant timezone for date display
  const timezone = await getTenantTimezone();

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
        <span>Sales</span>
        <ChevronRight className="mx-2 h-4 w-4" />
        <span className="text-foreground font-medium">Record Sale</span>
      </nav>

      {/* Page Header - AC 1 */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Record Sales Transaction
        </h1>
        <p className="text-muted-foreground">
          Enter sales data for accurate royalty calculations
        </p>
      </div>

      {/* Form Container - AC 1: Spacious Guided Flow */}
      <div className="mx-auto max-w-xl">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <SalesForm timezone={timezone} autoFocus />
        </div>
      </div>
    </div>
  );
}
