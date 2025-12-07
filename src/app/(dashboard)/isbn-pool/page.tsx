import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ISBNPoolFilters } from "@/modules/isbn/components/isbn-pool-filters";
import { ISBNPoolStats } from "@/modules/isbn/components/isbn-pool-stats";
import { ISBNPoolTable } from "@/modules/isbn/components/isbn-pool-table";
import { getISBNList, getISBNPoolStats } from "@/modules/isbn/queries";
import { getPrefixFilterOptions } from "@/modules/isbn-prefixes/queries";

/**
 * ISBN Pool page - Server Component
 *
 * Story 2.8 - Build ISBN Pool Status View and Availability Tracking
 * AC 3: Full /isbn-pool page displays stats cards
 * AC 4-6: Table with columns, filtering, pagination
 * AC 8: Page accessible to all authenticated dashboard users
 *
 * Story 7.4 - AC 7.4.7: Filter ISBN pool table by prefix
 */

export const metadata = {
  title: "ISBN Pool | Salina ERP",
  description: "View and manage your ISBN inventory pool",
};

interface ISBNPoolPageProps {
  searchParams: Promise<{
    type?: string;
    status?: string;
    search?: string;
    prefix?: string;
    page?: string;
  }>;
}

export default async function ISBNPoolPage({
  searchParams,
}: ISBNPoolPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Author role redirected to portal
  if (user.role === "author") {
    redirect("/portal");
  }

  // Parse search params (await the promise in Next.js 15)
  const params = await searchParams;
  const type = params.type as "physical" | "ebook" | undefined;
  const status = params.status as
    | "available"
    | "assigned"
    | "registered"
    | "retired"
    | undefined;
  const search = params.search;
  const prefix = params.prefix;
  const page = parseInt(params.page || "1", 10);

  // Fetch stats, list data, and prefix options in parallel
  const [statsResult, listResult, prefixOptionsResult] = await Promise.all([
    getISBNPoolStats(),
    getISBNList({ type, status, search, prefix, page, pageSize: 20 }),
    getPrefixFilterOptions(),
  ]);

  if (!statsResult.success) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Error loading ISBN pool</h2>
          <p className="text-sm text-muted-foreground">{statsResult.error}</p>
        </div>
      </div>
    );
  }

  if (!listResult.success) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Error loading ISBN list</h2>
          <p className="text-sm text-muted-foreground">{listResult.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
        <Link
          href="/dashboard"
          className="flex items-center hover:text-foreground"
        >
          <Home className="mr-1 h-4 w-4" />
          Dashboard
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">ISBN Pool</span>
      </nav>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ISBN Pool</h1>
        <p className="text-muted-foreground">
          View and track your ISBN inventory by type and status
        </p>
      </div>

      {/* Stats Cards */}
      <ISBNPoolStats stats={statsResult.data} />

      {/* Filters */}
      {/* Story 7.6: Removed currentType - ISBNs are unified without type distinction */}
      <ISBNPoolFilters
        currentStatus={status}
        currentSearch={search}
        currentPrefix={prefix}
        prefixOptions={prefixOptionsResult.success ? prefixOptionsResult.data : []}
      />

      {/* Data Table */}
      <ISBNPoolTable
        data={listResult.data.data}
        total={listResult.data.total}
        page={listResult.data.page}
        pageSize={listResult.data.pageSize}
        totalPages={listResult.data.totalPages}
      />
    </div>
  );
}
