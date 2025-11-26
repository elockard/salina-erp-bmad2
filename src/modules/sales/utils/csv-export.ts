/**
 * CSV Export Utility
 *
 * Client-side utility for downloading sales data as CSV.
 * Story 3.3: AC 7 (CSV export)
 *
 * Features:
 * - Exports currently filtered results
 * - Filename format: sales-export-YYYY-MM-DD.csv
 * - Streaming download for large datasets
 */

import { format } from "date-fns";
import { exportSalesCsvAction } from "../actions";
import type { SalesFilterInput } from "../schema";

/**
 * Export sales to CSV file
 *
 * @param filters - Current filter state to apply to export
 * @returns Promise that resolves when download starts, or throws on error
 */
export async function downloadSalesCsv(
  filters: SalesFilterInput = {},
): Promise<void> {
  // Call server action to generate CSV
  const result = await exportSalesCsvAction(filters);

  if (!result.success) {
    throw new Error(result.error || "Failed to export sales data");
  }

  // Create blob from CSV content
  const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" });

  // Generate filename with current date
  const filename = `sales-export-${format(new Date(), "yyyy-MM-dd")}.csv`;

  // Trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
