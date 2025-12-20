"use client";

/**
 * CSV Import Page Component
 *
 * Story: 19.1 - Import Catalog via CSV
 * Task 6: Import page route
 *
 * FRs: FR170, FR171
 *
 * Pattern from: src/modules/titles/components/titles-split-view.tsx
 */

import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { ImportResult } from "../types";
import { CsvImportModal } from "./csv-import-modal";
import { DownloadTemplateButton } from "./download-template-button";

/**
 * CSV Import Page
 *
 * Standalone page for CSV import with:
 * - Back navigation to titles
 * - Import instructions
 * - Import modal trigger
 */
export function CsvImportPage() {
  const router = useRouter();
  const [importModalOpen, setImportModalOpen] = useState(false);

  const handleImportComplete = (result: ImportResult) => {
    if (result.success && result.imported > 0) {
      // Navigate back to titles list after successful import
      router.push("/titles");
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with back navigation and download template button */}
      <div className="flex items-center gap-4">
        <Link href="/titles">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Import Titles from CSV</h1>
          <p className="text-muted-foreground">
            Upload a CSV file to bulk import titles into your catalog
          </p>
        </div>
        <DownloadTemplateButton />
      </div>

      {/* Import instructions card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            CSV Import
          </CardTitle>
          <CardDescription>
            Import your existing catalog from a CSV file with column mapping
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium">Supported Fields</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>
                <strong>Title</strong> (required) - The title of the work
              </li>
              <li>
                <strong>Subtitle</strong> - Optional subtitle
              </li>
              <li>
                <strong>Author Name</strong> - Must match an existing contact
              </li>
              <li>
                <strong>ISBN</strong> - ISBN-13 format (with or without hyphens)
              </li>
              <li>
                <strong>Genre</strong> - Genre classification
              </li>
              <li>
                <strong>Publication Date</strong> - YYYY-MM-DD format
              </li>
              <li>
                <strong>Publication Status</strong> - draft, pending, published,
                or out_of_print
              </li>
              <li>
                <strong>Word Count</strong> - Positive integer
              </li>
              <li>
                <strong>ASIN</strong> - Amazon Standard Identification Number
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Requirements</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>CSV file format (comma or tab delimited)</li>
              <li>Maximum file size: 5MB</li>
              <li>Maximum rows: 1,000</li>
              <li>First row should contain column headers</li>
            </ul>
          </div>

          <Button onClick={() => setImportModalOpen(true)} className="mt-4">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Start Import
          </Button>
        </CardContent>
      </Card>

      {/* Import modal */}
      <CsvImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}
