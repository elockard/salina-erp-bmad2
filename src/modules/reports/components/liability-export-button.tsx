"use client";

/**
 * Liability Report Export Button Component
 *
 * Button to export royalty liability report data as CSV.
 *
 * Story: 6.4 - Build Royalty Liability Summary Report
 * AC: 7 (CSV export available for accounting system import)
 *
 * Features:
 * - Triggers browser download with correct filename
 * - Loading state while generating
 */

import { format } from "date-fns";
import { Download, Loader2 } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { exportLiabilityReportCSV } from "../actions";

interface LiabilityExportButtonProps {
  /** Whether export is disabled */
  disabled?: boolean;
}

export function LiabilityExportButton({
  disabled = false,
}: LiabilityExportButtonProps) {
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportLiabilityReportCSV();

      if (result.success) {
        // Create and trigger download
        const blob = new Blob([result.data], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        // Filename format: royalty-liability-YYYY-MM-DD.csv
        link.download = `royalty-liability-${format(new Date(), "yyyy-MM-dd")}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        console.error("[Export] Failed:", result.error);
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
      disabled={disabled || isExporting}
      data-testid="liability-export-button"
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
