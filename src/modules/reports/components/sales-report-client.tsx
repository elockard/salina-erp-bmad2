"use client";

/**
 * Sales Report Client Component
 *
 * Client-side component that assembles all sales report functionality.
 * Manages filter state, data fetching, and coordinates components.
 *
 * Story: 6.2 - Build Sales Reports with Multi-Dimensional Filtering
 * AC: 1-10 (Complete sales report functionality)
 *
 * Features:
 * - Filter state management (subtask 7.2)
 * - Generate Report button wiring (subtask 7.3)
 * - Responsive layout (subtask 7.4)
 */

import * as React from "react";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchSalesReport } from "../actions";
import type { SalesReportFilterInput } from "../schema";
import type { SalesReportResult } from "../types";
import { ExportButton } from "./export-button";
import { SalesReportCharts } from "./sales-report-charts";
import { SalesReportFilters } from "./sales-report-filters";
import { SalesReportTable } from "./sales-report-table";

interface FilterOption {
  id: string;
  label: string;
}

interface SalesReportClientProps {
  /** Available titles for filter dropdown */
  titles: FilterOption[];
  /** Available authors for filter dropdown */
  authors: FilterOption[];
}

const GROUPING_LABELS: Record<string, string> = {
  title: "Titles",
  format: "Formats",
  channel: "Channels",
  date: "Periods",
};

export function SalesReportClient({ titles, authors }: SalesReportClientProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [reportData, setReportData] = React.useState<SalesReportResult | null>(
    null,
  );
  const [currentFilters, setCurrentFilters] =
    React.useState<SalesReportFilterInput | null>(null);
  const [groupByLabel, setGroupByLabel] = React.useState("Titles");
  const [error, setError] = React.useState<string | null>(null);

  const handleGenerateReport = async (filters: SalesReportFilterInput) => {
    setIsLoading(true);
    setError(null);
    setCurrentFilters(filters);
    setGroupByLabel(GROUPING_LABELS[filters.groupBy] ?? "Groups");

    try {
      const result = await fetchSalesReport(filters);

      if (result.success) {
        setReportData(result.data);
      } else {
        setError(result.error);
        setReportData(null);
      }
    } catch {
      setError("An unexpected error occurred");
      setReportData(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters Section (subtask 7.1) */}
      <SalesReportFilters
        titles={titles}
        authors={authors}
        onSubmit={handleGenerateReport}
        isLoading={isLoading}
      />

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Results Section - only show after generating */}
      {(reportData || isLoading) && (
        <>
          {/* Header with export button */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {isLoading
                ? "Generating Report..."
                : `Report Results (${reportData?.rows.length ?? 0} ${groupByLabel.toLowerCase()})`}
            </h2>
            <ExportButton
              filters={currentFilters}
              disabled={
                isLoading || !reportData || reportData.rows.length === 0
              }
            />
          </div>

          {/* Charts Section (subtask 7.5) */}
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <SalesReportCharts
              data={reportData}
              isLoading={isLoading}
              groupByLabel={groupByLabel}
            />
          </Suspense>

          {/* Table Section (subtask 7.5) */}
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <SalesReportTable data={reportData} isLoading={isLoading} />
          </Suspense>
        </>
      )}

      {/* Initial state - no report generated yet */}
      {!reportData && !isLoading && !error && (
        <div className="flex flex-col items-center justify-center rounded-lg border py-16 text-center">
          <p className="text-lg text-muted-foreground mb-2">
            Select filters and click &quot;Generate Report&quot; to view results
          </p>
          <p className="text-sm text-muted-foreground">
            Date range is required. Other filters are optional.
          </p>
        </div>
      )}
    </div>
  );
}
