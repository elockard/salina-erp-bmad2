"use client";

/**
 * CSV Import Modal Component
 *
 * Story: 19.1 - Import Catalog via CSV
 * Task 3: Build multi-step import wizard UI
 *
 * FRs: FR170, FR171
 *
 * Pattern from: src/modules/onix/components/onix-import-modal.tsx
 */

import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Upload,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

import {
  MAX_FILE_SIZE,
  parseCsvFile,
  validateCsvFile,
} from "../parsers/csv-parser";
import { autoMapColumns, validateCsvData } from "../schema";
import type {
  ColumnMapping,
  CsvParseResult,
  ImportResult,
  ImportValidationResult,
  ImportWizardStep,
} from "../types";
import { ColumnMapper } from "./column-mapper";
import { CsvValidationTable } from "./csv-validation-table";

interface CsvImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: (result: ImportResult) => void;
}

/**
 * CSV Import Modal
 *
 * Multi-step modal for:
 * 1. File upload with validation
 * 2. Column mapping
 * 3. Preview with validation results
 * 4. Import progress tracking
 * 5. Success/error summary
 */
export function CsvImportModal({
  open,
  onOpenChange,
  onImportComplete,
}: CsvImportModalProps) {
  // Step management
  const [step, setStep] = useState<ImportWizardStep>("upload");

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Parse state
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Column mapping state
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);

  // Validation state
  const [validationResult, setValidationResult] =
    useState<ImportValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  /**
   * Reset modal state
   */
  const resetState = useCallback(() => {
    setStep("upload");
    setFile(null);
    setFileError(null);
    setParseResult(null);
    setIsProcessing(false);
    setColumnMappings([]);
    setValidationResult(null);
    setIsValidating(false);
    setIsImporting(false);
    setImportProgress(0);
    setImportResult(null);
  }, []);

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    if (isImporting) return; // Don't allow closing during import
    resetState();
    onOpenChange(false);
  }, [isImporting, resetState, onOpenChange]);

  /**
   * Process uploaded file
   */
  const processFile = useCallback(async (selectedFile: File) => {
    setFileError(null);
    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const result = await parseCsvFile(selectedFile);

      if (!result.success) {
        setFileError(result.errors[0]?.message || "Failed to parse CSV file");
        setIsProcessing(false);
        return;
      }

      if (result.rowCount === 0) {
        setFileError("CSV file contains no data rows");
        setIsProcessing(false);
        return;
      }

      setParseResult(result);

      // Auto-map columns based on headers
      const mappings = autoMapColumns(result.headers, result.rows);
      setColumnMappings(mappings);

      // Move to mapping step
      setStep("map");
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : "Failed to process CSV file",
      );
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(
    (selectedFile: File) => {
      const error = validateCsvFile(selectedFile);
      if (error) {
        setFileError(error);
        return;
      }
      processFile(selectedFile);
    },
    [processFile],
  );

  /**
   * Handle file drop
   */
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
   * Validate mapped data
   */
  const handleValidate = useCallback(async () => {
    if (!parseResult) return;

    setIsValidating(true);

    try {
      // Client-side validation first
      const result = validateCsvData(parseResult, columnMappings);
      setValidationResult(result);
      setStep("preview");
    } catch (error) {
      toast.error("Validation failed", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsValidating(false);
    }
  }, [parseResult, columnMappings]);

  /**
   * Handle import
   */
  const handleImport = useCallback(async () => {
    if (!validationResult || !parseResult) return;

    setIsImporting(true);
    setImportProgress(10);
    setStep("import");

    try {
      // Import using server action
      const { importTitlesFromCsvAction } = await import("../actions");

      setImportProgress(30);

      const result = await importTitlesFromCsvAction({
        filename: parseResult.filename || "import.csv",
        columnMappings,
        rows: validationResult.rows.filter((r) => r.valid),
      });

      setImportProgress(100);

      if (result.success) {
        setImportResult(result);
        setStep("complete");
        toast.success("Import complete", {
          description: `Successfully imported ${result.imported} titles`,
        });
        onImportComplete?.(result);
      } else {
        toast.error("Import failed", {
          description: result.errors[0]?.message || "An error occurred",
        });
        setIsImporting(false);
        setStep("preview");
      }
    } catch (error) {
      toast.error("Import failed", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
      setIsImporting(false);
      setStep("preview");
    }
  }, [validationResult, parseResult, columnMappings, onImportComplete]);

  /**
   * Render upload step
   */
  const renderUploadStep = () => (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Import Titles from CSV</DialogTitle>
        <DialogDescription>
          Upload a CSV file containing title data. The file should include
          headers that match your column names.
        </DialogDescription>
      </DialogHeader>

      {/* Drag and drop zone */}
      <section
        aria-label="File upload drop zone"
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25"
        } ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-muted p-4">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">
              {isProcessing ? "Processing..." : "Drop CSV file here"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse
            </p>
          </div>
          <input
            type="file"
            accept=".csv,text/csv"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
        </div>
      </section>

      {/* File info */}
      {file && !fileError && (
        <div className="flex items-center gap-2 text-sm">
          <FileSpreadsheet className="h-4 w-4" />
          <span className="font-medium">{file.name}</span>
          <span className="text-muted-foreground">
            ({(file.size / 1024).toFixed(1)} KB)
          </span>
        </div>
      )}

      {/* Error message */}
      {fileError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{fileError}</AlertDescription>
        </Alert>
      )}

      {/* Help text */}
      <div className="text-sm text-muted-foreground space-y-1">
        <p>
          <strong>Accepted formats:</strong> CSV (comma or tab delimited)
        </p>
        <p>
          <strong>Max file size:</strong>{" "}
          {(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB
        </p>
        <p>
          <strong>Max rows:</strong> 1,000
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
      </DialogFooter>
    </div>
  );

  /**
   * Render column mapping step
   */
  const renderMapStep = () => (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Map Columns</DialogTitle>
        <DialogDescription>
          Match your CSV columns to the corresponding title fields. The Title
          field is required.
        </DialogDescription>
      </DialogHeader>

      {parseResult && (
        <>
          {/* File info */}
          <div className="flex items-center gap-2 text-sm">
            <FileSpreadsheet className="h-4 w-4" />
            <span>{parseResult.filename}</span>
            <Badge variant="secondary">{parseResult.rowCount} rows</Badge>
            {parseResult.headersDetected && (
              <Badge variant="outline">Headers detected</Badge>
            )}
          </div>

          {/* Column mapper */}
          <ColumnMapper
            mappings={columnMappings}
            onMappingsChange={setColumnMappings}
          />
        </>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => setStep("upload")}>
          Back
        </Button>
        <Button onClick={handleValidate} disabled={isValidating}>
          {isValidating ? "Validating..." : "Validate & Preview"}
        </Button>
      </DialogFooter>
    </div>
  );

  /**
   * Render preview step
   */
  const renderPreviewStep = () => (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Preview & Validate</DialogTitle>
        <DialogDescription>
          Review the validation results. Fix any errors before importing.
        </DialogDescription>
      </DialogHeader>

      {validationResult && (
        <>
          {/* Summary badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {validationResult.totalRows} total rows
            </Badge>
            <Badge
              variant={
                validationResult.validCount > 0 ? "default" : "secondary"
              }
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {validationResult.validCount} valid
            </Badge>
            {validationResult.invalidCount > 0 && (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                {validationResult.invalidCount} errors
              </Badge>
            )}
          </div>

          {/* Stats */}
          <div className="text-sm text-muted-foreground space-x-4">
            <span>With Author: {validationResult.stats.withAuthor}</span>
            <span>With ISBN: {validationResult.stats.withIsbn}</span>
            <span>With ASIN: {validationResult.stats.withAsin}</span>
          </div>

          {/* Validation table */}
          <CsvValidationTable rows={validationResult.rows} />

          {/* Duplicate warnings */}
          {validationResult.stats.duplicateIsbns.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Duplicate ISBNs</AlertTitle>
              <AlertDescription>
                {validationResult.stats.duplicateIsbns.join(", ")}
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => setStep("map")}>
          Back to Mapping
        </Button>
        <Button
          onClick={handleImport}
          disabled={!validationResult || validationResult.validCount === 0}
        >
          Import {validationResult?.validCount || 0} Titles
        </Button>
      </DialogFooter>
    </div>
  );

  /**
   * Render import progress step
   */
  const renderImportStep = () => (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Importing...</DialogTitle>
        <DialogDescription>
          Please wait while we import your titles.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <Progress value={importProgress} />
        <p className="text-sm text-muted-foreground text-center">
          {importProgress < 30
            ? "Preparing import..."
            : importProgress < 100
              ? "Creating titles..."
              : "Finishing up..."}
        </p>
      </div>
    </div>
  );

  /**
   * Render complete step
   */
  const renderCompleteStep = () => (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Import Complete</DialogTitle>
        <DialogDescription>
          Your titles have been successfully imported.
        </DialogDescription>
      </DialogHeader>

      {importResult && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-6 w-6" />
            <span className="font-medium">
              Successfully imported {importResult.imported} titles
            </span>
          </div>

          {importResult.skipped > 0 && (
            <p className="text-sm text-muted-foreground">
              {importResult.skipped} rows were skipped due to errors
            </p>
          )}
        </div>
      )}

      <DialogFooter>
        <Button onClick={handleClose}>Done</Button>
      </DialogFooter>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {step === "upload" && renderUploadStep()}
        {step === "map" && renderMapStep()}
        {step === "preview" && renderPreviewStep()}
        {step === "import" && renderImportStep()}
        {step === "complete" && renderCompleteStep()}
      </DialogContent>
    </Dialog>
  );
}
