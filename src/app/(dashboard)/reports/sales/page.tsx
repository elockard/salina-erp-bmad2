/**
 * Sales Report Page
 *
 * Interactive sales report builder with multi-dimensional filtering.
 *
 * Story: 6.2 - Build Sales Reports with Multi-Dimensional Filtering
 * AC: 1-10 (Full sales report functionality)
 *
 * Permission: owner, admin, editor, finance (NOT author)
 */

import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/auth";
import { getAuthors } from "@/modules/authors/queries";
import { SalesReportClient } from "@/modules/reports/components/sales-report-client";
import { getTitles } from "@/modules/titles/queries";

export const dynamic = "force-dynamic";

export default async function SalesReportPage() {
  // AC-10: Block Author role from accessing sales reports
  const canAccess = await hasPermission([
    "owner",
    "admin",
    "editor",
    "finance",
  ]);
  if (!canAccess) {
    redirect("/dashboard");
  }

  // Fetch filter options (titles and authors) for dropdowns
  // These are fetched server-side to populate the filter dropdowns
  const [titlesData, authorsData] = await Promise.all([
    getTitles(),
    getAuthors(),
  ]);

  // Transform to simple filter options
  const titleOptions = titlesData.map((t) => ({
    id: t.id,
    label: `${t.title} (${t.author.name})`,
  }));

  const authorOptions = authorsData.map((a) => ({
    id: a.id,
    label: a.name,
  }));

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sales Report</h1>
        <p className="text-muted-foreground">
          Analyze sales patterns with flexible filtering
        </p>
      </div>

      <SalesReportClient titles={titleOptions} authors={authorOptions} />
    </div>
  );
}
