"use client";

/**
 * Tax Preparation Report Client Component
 *
 * Client-side wrapper orchestrating filters, table, warning, and export.
 *
 * Story 11.2: Track Annual Earnings for 1099 Threshold
 * AC-11.2.5: Filter state managed via React useState
 * AC-11.2.8: CSV export functionality
 *
 * Handles:
 * - Filter state management
 * - Client-side filtering of pre-loaded data
 * - CSV export generation
 */

import { Download } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import type { AuthorEarnings } from "../queries/tax-preparation";
import type { TaxPreparationFilterInput } from "../schema";
import { TaxPreparationFilters } from "./tax-preparation-filters";
import { TaxPreparationTable } from "./tax-preparation-table";
import { TaxPreparationWarning } from "./tax-preparation-warning";

interface TaxPreparationClientProps {
  /** Initial earnings data for current year */
  initialData: AuthorEarnings[];
  /** Initial year filter value */
  initialYear: number;
}

/**
 * Format currency value with dollar sign and 2 decimal places
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * CSV escape function matching existing pattern
 * AC-11.2.8: Use CSV escaping pattern from reports/queries.ts
 */
function escapeCSV(value: string | number | null): string {
  if (value === null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate CSV content from author earnings data
 * AC-11.2.8: CSV columns match story spec, NEVER includes tin_encrypted
 */
function generateCSV(data: AuthorEarnings[]): string {
  const headers =
    "Name,TIN Status,TIN Type,Annual Earnings,1099 Required,W-9 Status";
  const rows = data.map((a) =>
    [
      escapeCSV(a.name),
      escapeCSV(a.tinStatus === "provided" ? "Provided" : "Missing"),
      escapeCSV(a.tinType?.toUpperCase() || ""),
      escapeCSV(formatCurrency(a.annualEarnings)),
      escapeCSV(a.requires1099 ? "Yes" : "No"),
      escapeCSV(a.w9Received ? "Received" : "Missing"),
    ].join(","),
  );
  return [headers, ...rows].join("\n");
}

/**
 * Download CSV file
 * AC-11.2.8: Download via Blob/createObjectURL pattern
 */
function downloadCSV(data: AuthorEarnings[], year: number): void {
  const csv = generateCSV(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `1099-preparation-${year}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function TaxPreparationClient({
  initialData,
  initialYear,
}: TaxPreparationClientProps) {
  // Filter state (AC-11.2.5: managed via React useState)
  const [filters, setFilters] = React.useState<TaxPreparationFilterInput>({
    year: initialYear,
    requires1099: "all",
    tinStatus: "all",
    w9Status: "all",
  });

  // Data state - for year changes we'd need to refetch
  const [data, setData] = React.useState<AuthorEarnings[]>(initialData);
  const [isLoading, setIsLoading] = React.useState(false);

  // Handle year change - refetch data from server
  const handleFiltersChange = React.useCallback(
    async (newFilters: TaxPreparationFilterInput) => {
      // If only year changed, we need to refetch
      if (newFilters.year !== filters.year) {
        setIsLoading(true);
        try {
          // Dynamically import to get fresh data
          const { getAnnualEarningsByAuthor } = await import(
            "../queries/tax-preparation"
          );
          const result = await getAnnualEarningsByAuthor(newFilters.year);
          if (result.success) {
            setData(result.data);
          }
        } catch (error) {
          console.error("[Tax Preparation] Failed to fetch data:", error);
        } finally {
          setIsLoading(false);
        }
      }
      setFilters(newFilters);
    },
    [filters.year],
  );

  // Apply client-side filters to data (AC-11.2.5: combinable AND logic)
  const filteredData = React.useMemo(() => {
    return data.filter((author) => {
      // Filter: 1099 Required
      if (filters.requires1099 === "required" && !author.requires1099) {
        return false;
      }
      if (filters.requires1099 === "not-required" && author.requires1099) {
        return false;
      }

      // Filter: TIN Status
      if (filters.tinStatus === "provided" && author.tinStatus !== "provided") {
        return false;
      }
      if (filters.tinStatus === "missing" && author.tinStatus !== "missing") {
        return false;
      }

      // Filter: W-9 Status
      if (filters.w9Status === "received" && !author.w9Received) {
        return false;
      }
      if (filters.w9Status === "missing" && author.w9Received) {
        return false;
      }

      return true;
    });
  }, [data, filters]);

  // Calculate missing TIN count from UNFILTERED data (AC-11.2.6)
  const missingTinCount = React.useMemo(() => {
    return data.filter((a) => a.requires1099 && a.tinStatus === "missing")
      .length;
  }, [data]);

  // Handle CSV export
  const handleExport = React.useCallback(() => {
    downloadCSV(filteredData, filters.year);
  }, [filteredData, filters.year]);

  return (
    <div className="space-y-4" data-testid="tax-preparation-client">
      {/* Filters and Export Row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <TaxPreparationFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />

        {/* AC-11.2.8: Export CSV button in table header area */}
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={filteredData.length === 0 || isLoading}
          data-testid="export-csv-button"
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* AC-11.2.7: Warning Alert positioned between filters and table */}
      <TaxPreparationWarning missingTinCount={missingTinCount} />

      {/* Loading State */}
      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">
          Loading data...
        </div>
      ) : (
        <TaxPreparationTable data={filteredData} />
      )}
    </div>
  );
}
