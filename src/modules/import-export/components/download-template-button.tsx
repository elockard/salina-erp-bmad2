"use client";

/**
 * Download Template Button Component
 *
 * Story: 19.2 - Download CSV Templates
 * Task 2: Create DownloadTemplateButton component
 *
 * FR172: Publisher can download CSV templates for bulk data entry
 *
 * AC-1: Click "Download Template" to receive CSV file with correct headers
 *
 * Pattern: src/modules/reports/components/ar-export-buttons.tsx:226-249
 */

import { format } from "date-fns";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { generateTitlesTemplate } from "../templates/csv-template-generator";

/**
 * Button to download CSV import template
 *
 * Features:
 * - Client-side template generation (no server round-trip)
 * - Loading state to prevent double-clicks
 * - Proper cleanup of blob URLs
 * - Error handling with toast notifications
 * - data-testid for E2E testing
 */
export function DownloadTemplateButton() {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = () => {
    setIsDownloading(true);
    try {
      const template = generateTitlesTemplate();
      const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `salina-title-import-template-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate template:", error);
      toast.error("Failed to download template. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleDownload}
      disabled={isDownloading}
      data-testid="download-template-button"
    >
      {isDownloading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Downloading...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </>
      )}
    </Button>
  );
}
