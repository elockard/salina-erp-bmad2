"use client";

import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Upload,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as Papa from "papaparse";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { importISBNs } from "../actions";
import type { ISBNType } from "../types";
import { detectDuplicates, normalizeIsbn13, validateIsbn13 } from "../utils";

/** Max file size: 1MB (AC 2) */
const MAX_FILE_SIZE = 1024 * 1024;
/** Max rows per import: 100 (AC 2) */
const MAX_ROWS = 100;
/** Rows to show in preview (AC 4) */
const PREVIEW_ROWS = 10;

interface ParsedISBN {
  row: number;
  raw: string;
  normalized: string;
  valid: boolean;
  error?: string;
}

interface ValidationSummary {
  total: number;
  valid: number;
  invalid: number;
  duplicatesInFile: Array<{ isbn: string; rows: number[] }>;
}

/**
 * ISBN Import Form Component
 *
 * Story 2.7 - Build ISBN Import with CSV Upload and Validation
 *
 * AC 2: File upload accepts CSV only (max 1MB, max 100 rows)
 * AC 3: ISBN type selection (Physical / Ebook)
 * AC 4: CSV parsing with preview display
 * AC 5: ISBN-13 checksum validation
 * AC 6: Duplicate detection (file + database)
 * AC 7: Validation errors displayed inline
 * AC 8: Transaction all-or-nothing import
 * AC 9: Success feedback and navigation
 */
export function IsbnImportForm() {
  const router = useRouter();

  // Form state
  const [isbnType, setIsbnType] = useState<ISBNType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Parsing and validation state
  const [parsedIsbns, setParsedIsbns] = useState<ParsedISBN[]>([]);
  const [validationSummary, setValidationSummary] =
    useState<ValidationSummary | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Validate file before processing (AC 2)
   */
  const validateFile = useCallback((f: File): string | null => {
    // Check MIME type
    if (f.type !== "text/csv" && !f.name.endsWith(".csv")) {
      return "Invalid file type. Please upload a CSV file.";
    }

    // Check file size
    if (f.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is 1MB (${(
        f.size / 1024 / 1024
      ).toFixed(2)}MB uploaded).`;
    }

    return null;
  }, []);

  /**
   * Parse and validate CSV content (AC 4, 5, 6)
   */
  const processCSV = useCallback((csvFile: File) => {
    setFileError(null);
    setParsedIsbns([]);
    setValidationSummary(null);

    Papa.parse<string[]>(csvFile, {
      complete: (results) => {
        // Filter out empty rows and get ISBN values
        const rawIsbns = results.data
          .filter((row) => row.length > 0 && row[0]?.trim())
          .map((row) => row[0].trim());

        // Skip header row if it looks like a header
        const firstValue = rawIsbns[0]?.toLowerCase();
        const hasHeader =
          firstValue === "isbn" ||
          firstValue === "isbn-13" ||
          firstValue === "isbn13";
        const isbnRows = hasHeader ? rawIsbns.slice(1) : rawIsbns;

        // Check row count (AC 2)
        if (isbnRows.length > MAX_ROWS) {
          setFileError(
            `Too many rows. Maximum is ${MAX_ROWS} ISBNs per import (${isbnRows.length} found).`,
          );
          return;
        }

        if (isbnRows.length === 0) {
          setFileError("No valid ISBN rows found in the CSV file.");
          return;
        }

        // Validate each ISBN (AC 5)
        const parsed: ParsedISBN[] = isbnRows.map((raw, index) => {
          const normalized = normalizeIsbn13(raw);
          const validation = validateIsbn13(raw);
          return {
            row: index + 1 + (hasHeader ? 1 : 0), // 1-indexed, account for header
            raw,
            normalized,
            valid: validation.valid,
            error: validation.error,
          };
        });

        // Detect duplicates within file (AC 6)
        const duplicates = detectDuplicates(isbnRows);

        // Mark duplicates as invalid
        if (duplicates.length > 0) {
          duplicates.forEach(({ rows }) => {
            // Mark all occurrences as duplicates except the first
            rows.slice(1).forEach((rowNum) => {
              const idx = parsed.findIndex((p) => p.row === rowNum);
              if (idx >= 0 && parsed[idx].valid) {
                parsed[idx].valid = false;
                parsed[idx].error = `Duplicate: also appears at row ${rows[0]}`;
              }
            });
          });
        }

        // Calculate summary
        const summary: ValidationSummary = {
          total: parsed.length,
          valid: parsed.filter((p) => p.valid).length,
          invalid: parsed.filter((p) => !p.valid).length,
          duplicatesInFile: duplicates,
        };

        setParsedIsbns(parsed);
        setValidationSummary(summary);
      },
      error: (error) => {
        setFileError(`Failed to parse CSV: ${error.message}`);
      },
    });
  }, []);

  /**
   * Handle file selection (AC 2)
   */
  const handleFileSelect = useCallback(
    (selectedFile: File) => {
      const error = validateFile(selectedFile);
      if (error) {
        setFileError(error);
        setFile(null);
        return;
      }

      setFile(selectedFile);
      processCSV(selectedFile);
    },
    [validateFile, processCSV],
  );

  /**
   * Handle file input change
   */
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileSelect(selectedFile);
      }
    },
    [handleFileSelect],
  );

  /**
   * Handle drag and drop (AC 2)
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect],
  );

  /**
   * Clear file and reset state
   */
  const handleClearFile = useCallback(() => {
    setFile(null);
    setParsedIsbns([]);
    setValidationSummary(null);
    setFileError(null);
  }, []);

  /**
   * Submit import (AC 8, 9)
   */
  const handleSubmit = useCallback(async () => {
    if (!isbnType) {
      toast.error("Please select an ISBN type");
      return;
    }

    if (!validationSummary || validationSummary.invalid > 0) {
      toast.error("Please fix validation errors before importing");
      return;
    }

    setIsSubmitting(true);

    try {
      const validIsbns = parsedIsbns
        .filter((p) => p.valid)
        .map((p) => p.normalized);

      const result = await importISBNs({
        isbns: validIsbns,
        type: isbnType,
      });

      if (result.success) {
        toast.success(`Successfully imported ${result.data.imported} ISBNs`);
        router.push("/isbn-pool");
      } else {
        toast.error(result.error || "Import failed");

        // If there are duplicate errors from the server, show them
        if (result.data?.errorDetails?.length) {
          result.data.errorDetails.forEach((err) => {
            toast.error(`${err.isbn_13}: ${err.error}`);
          });
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Import error:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [isbnType, validationSummary, parsedIsbns, router]);

  const canSubmit =
    isbnType !== null &&
    validationSummary !== null &&
    validationSummary.valid > 0 &&
    validationSummary.invalid === 0 &&
    !isSubmitting;

  return (
    <div className="space-y-6">
      {/* ISBN Type Selection (AC 3) */}
      <Card>
        <CardHeader>
          <CardTitle>ISBN Type</CardTitle>
          <CardDescription>
            Select the type for all ISBNs in this import batch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={isbnType || ""}
            onValueChange={(value) => setIsbnType(value as ISBNType)}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="physical" id="physical" />
              <Label htmlFor="physical" className="font-normal cursor-pointer">
                Physical (Print)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ebook" id="ebook" />
              <Label htmlFor="ebook" className="font-normal cursor-pointer">
                Ebook (Digital)
              </Label>
            </div>
          </RadioGroup>
          {!isbnType && parsedIsbns.length > 0 && (
            <p className="text-sm text-amber-600 mt-2">
              Please select an ISBN type before importing
            </p>
          )}
        </CardContent>
      </Card>

      {/* File Upload (AC 2) */}
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
          <CardDescription>
            Upload a CSV file containing ISBN-13 values (one per row). Maximum
            100 ISBNs, 1MB file size.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!file ? (
            // biome-ignore lint/a11y/noStaticElementInteractions: drop zone with accessible file input
            <div
              className={`
                border-2 border-dashed rounded-lg p-8 text-center transition-colors
                ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop your CSV file here, or
              </p>
              <label className="cursor-pointer">
                <span className="text-sm font-medium text-primary hover:underline">
                  browse to upload
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              <p className="text-xs text-muted-foreground mt-4">
                CSV format: Single column with ISBN-13 values
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearFile}
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* File Error Display */}
          {fileError && (
            <div className="mt-4 p-4 border border-destructive/50 bg-destructive/10 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{fileError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Summary and Preview (AC 4, 7) */}
      {validationSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Validation Results</span>
              <div className="flex gap-2">
                <Badge
                  variant={
                    validationSummary.valid === validationSummary.total
                      ? "default"
                      : "secondary"
                  }
                >
                  {validationSummary.valid} valid
                </Badge>
                {validationSummary.invalid > 0 && (
                  <Badge variant="destructive">
                    {validationSummary.invalid} errors
                  </Badge>
                )}
              </div>
            </CardTitle>
            <CardDescription>
              {validationSummary.invalid === 0 ? (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  All {validationSummary.total} ISBNs are valid and ready to
                  import
                </span>
              ) : (
                <span className="text-destructive">
                  {validationSummary.invalid} of {validationSummary.total} ISBNs
                  have errors. Fix all errors before importing.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Duplicate Warning */}
            {validationSummary.duplicatesInFile.length > 0 && (
              <div className="mb-4 p-3 border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Duplicates found within file:
                </p>
                <ul className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                  {validationSummary.duplicatesInFile.map(({ isbn, rows }) => (
                    <li key={isbn}>
                      {isbn} appears in rows: {rows.join(", ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview Table (AC 4) */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead>ISBN-13</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedIsbns.slice(0, PREVIEW_ROWS).map((isbn) => (
                    <TableRow
                      key={isbn.row}
                      className={!isbn.valid ? "bg-destructive/5" : ""}
                    >
                      <TableCell className="font-mono text-muted-foreground">
                        {isbn.row}
                      </TableCell>
                      <TableCell className="font-mono">{isbn.raw}</TableCell>
                      <TableCell>
                        {isbn.valid ? (
                          <Badge
                            variant="outline"
                            className="text-green-600 border-green-600"
                          >
                            Valid
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Invalid</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-destructive">
                        {isbn.error}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {parsedIsbns.length > PREVIEW_ROWS && (
              <p className="text-sm text-muted-foreground mt-3 text-center">
                Showing first {PREVIEW_ROWS} of {parsedIsbns.length} rows
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      {validationSummary && (
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={handleClearFile}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting
              ? "Importing..."
              : `Import ${validationSummary.valid} ISBNs`}
          </Button>
        </div>
      )}
    </div>
  );
}
