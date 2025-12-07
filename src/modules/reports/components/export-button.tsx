"use client";

/**
 * Export Button Component
 *
 * Button to export sales report data as CSV.
 *
 * Story: 6.2 - Build Sales Reports with Multi-Dimensional Filtering
 * AC: 9 (CSV export downloads report data with all filtered results)
 *
 * Features:
 * - Triggers browser download with correct filename
 * - Loading state while generating
 * - Disabled when no data
 */

import { format } from "date-fns";
import { Download, Loader2 } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { exportSalesReportCSV } from "../actions";
import type { SalesReportFilterInput } from "../schema";

interface ExportButtonProps {
  /** Current filter settings */
  filters: SalesReportFilterInput | null;
  /** Whether export is disabled (no data) */
  disabled?: boolean;
}

export function ExportButton({ filters, disabled = false }: ExportButtonProps) {
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = async () => {
    if (!filters) return;

    setIsExporting(true);
    try {
      const result = await exportSalesReportCSV(filters);

      if (result.success) {
        // Create and trigger download (subtask 6.4, 6.5)
        const blob = new Blob([result.data], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        // Filename format: sales-report-YYYY-MM-DD.csv
        link.download = `sales-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        console.error("[Export] Failed:", result.error);
        // Could add toast notification here
      }
    } catch (error) {
      console.error("[Export] Error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={disabled || isExporting || !filters}
    >
      {isExporting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </>
      )}
    </Button>
  );
}
