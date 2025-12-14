"use client";

/**
 * ONIX Import Modal Component
 *
 * Story: 14.5 - Implement ONIX Import Parser
 * Task 9: Build import UI
 *
 * Modal for uploading, previewing, and importing ONIX files.
 * Supports ONIX 2.1, 3.0, and 3.1 with preview before import.
 */

import {
  AlertCircle,
  CheckCircle2,
  FileCode,
  FileUp,
  Upload,
  X,
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
import { importONIXTitles, uploadONIXFile } from "../parser/actions";
import type {
  ConflictResolution,
  ImportPreview,
  ImportResult,
} from "../parser/types";
import { ImportPreviewTable } from "./import-preview-table";

/** Max file size: 10MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;
/** Preview rows to display */
const PREVIEW_ROWS = 50;

type ModalStep = "upload" | "preview" | "importing" | "complete";

interface ONIXImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: (result: ImportResult) => void;
}

/**
 * ONIX Import Modal
 *
 * Multi-step modal for:
 * 1. File upload with validation
 * 2. Preview parsed products with errors
 * 3. Import progress tracking
 * 4. Success/error summary
 */
export function ONIXImportModal({
  open,
  onOpenChange,
  onImportComplete,
}: ONIXImportModalProps) {
  // Step management
  const [step, setStep] = useState<ModalStep>("upload");

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Upload/parsing state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Preview state
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(),
  );
  const [conflictResolutions, setConflictResolutions] = useState<
    Map<number, ConflictResolution>
  >(new Map());

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
    setIsUploading(false);
    setUploadProgress(0);
    setPreview(null);
    setSelectedIndices(new Set());
    setConflictResolutions(new Map());
    setIsImporting(false);
    setImportProgress(0);
    setImportResult(null);
  }, []);

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    if (isImporting) {
      return; // Don't allow closing during import
    }
    resetState();
    onOpenChange(false);
  }, [isImporting, resetState, onOpenChange]);

  /**
   * Validate file before upload
   */
  const validateFile = useCallback((f: File): string | null => {
    // Check extension
    const ext = f.name.toLowerCase().split(".").pop();
    if (ext !== "xml" && ext !== "onix") {
      return "Invalid file type. Please upload an XML or ONIX file.";
    }

    // Check file size
    if (f.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is 10MB (${(f.size / 1024 / 1024).toFixed(2)}MB uploaded).`;
    }

    return null;
  }, []);

  /**
   * Process uploaded file
   */
  const processFile = useCallback(async (selectedFile: File) => {
    setFileError(null);
    setFile(selectedFile);
    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Create FormData for server action
      const formData = new FormData();
      formData.append("file", selectedFile);
      setUploadProgress(30);

      // Upload and parse
      const result = await uploadONIXFile(formData);
      setUploadProgress(100);

      if (!result.success) {
        setFileError(result.error || "Failed to parse ONIX file");
        setFile(null);
        return;
      }

      const previewData = result.data;

      // Set preview
      setPreview(previewData);

      // Auto-select all valid products
      const validIndices = new Set<number>(
        previewData.products
          .filter((p) => p.validationErrors.length === 0)
          .map((p) => p.index),
      );
      setSelectedIndices(validIndices);

      // Initialize conflict resolutions to "skip" for all conflicts
      const defaultResolutions = new Map<number, ConflictResolution>();
      previewData.conflicts.forEach((c) => {
        defaultResolutions.set(c.importProductIndex, "skip");
      });
      setConflictResolutions(defaultResolutions);

      setStep("preview");
    } catch (err) {
      setFileError(
        err instanceof Error ? err.message : "Failed to process file",
      );
      setFile(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, []);

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(
    (selectedFile: File) => {
      const error = validateFile(selectedFile);
      if (error) {
        setFileError(error);
        setFile(null);
        return;
      }
      processFile(selectedFile);
    },
    [validateFile, processFile],
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
   * Handle drag and drop
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
   * Handle conflict resolution change
   */
  const handleConflictResolutionChange = useCallback(
    (index: number, resolution: ConflictResolution) => {
      setConflictResolutions((prev) => {
        const next = new Map(prev);
        next.set(index, resolution);
        return next;
      });
    },
    [],
  );

  /**
   * Execute import
   */
  const handleImport = useCallback(async () => {
    if (!preview) return;

    setStep("importing");
    setIsImporting(true);
    setImportProgress(10);

    try {
      // Convert selections and resolutions to correct format
      const selectedProducts = Array.from(selectedIndices);

      // Build conflict resolutions object keyed by ISBN
      const resolutionsRecord: Record<string, ConflictResolution> = {};
      for (const [index, resolution] of conflictResolutions.entries()) {
        const product = preview.products.find((p) => p.index === index);
        if (product?.isbn) {
          resolutionsRecord[product.isbn] = resolution;
        }
      }

      setImportProgress(30);

      // Execute import with correct signature
      const result = await importONIXTitles(
        preview,
        selectedProducts,
        resolutionsRecord,
      );

      setImportProgress(100);

      if (!result.success) {
        toast.error(result.error || "Import failed");
        setStep("preview");
        return;
      }

      setImportResult(result.data);
      setStep("complete");
      onImportComplete?.(result.data);

      toast.success(
        `Successfully imported ${result.data.imported} title${result.data.imported === 1 ? "" : "s"}`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
      setStep("preview");
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  }, [preview, selectedIndices, conflictResolutions, onImportComplete]);

  /**
   * Get import button text
   */
  const getImportButtonText = () => {
    if (!preview) return "Import";

    const selected = selectedIndices.size;
    const skipped = Array.from(conflictResolutions.values()).filter(
      (r) => r === "skip",
    ).length;
    const willImport = selected - skipped;

    if (willImport === 0) return "No titles selected";
    return `Import ${willImport} title${willImport === 1 ? "" : "s"}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Import ONIX File
          </DialogTitle>
          <DialogDescription>
            {step === "upload" &&
              "Upload an ONIX XML file to import titles into your catalog."}
            {step === "preview" && preview && (
              <>
                Detected ONIX {preview.version} - {preview.totalProducts}{" "}
                product{preview.totalProducts === 1 ? "" : "s"} found
                {preview.validProducts < preview.totalProducts && (
                  <span className="text-destructive">
                    {" "}
                    ({preview.totalProducts - preview.validProducts} with
                    errors)
                  </span>
                )}
              </>
            )}
            {step === "importing" && "Importing titles..."}
            {step === "complete" && "Import complete!"}
          </DialogDescription>
        </DialogHeader>

        {/* Upload Step */}
        {step === "upload" && (
          <div className="flex-1 overflow-auto py-4">
            {!isUploading ? (
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
                  Drag and drop your ONIX file here, or
                </p>
                <label className="cursor-pointer">
                  <span className="text-sm font-medium text-primary hover:underline">
                    browse to upload
                  </span>
                  <input
                    type="file"
                    accept=".xml,.onix"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
                <p className="text-xs text-muted-foreground mt-4">
                  Supported formats: ONIX 2.1, 3.0, 3.1 (XML files up to 10MB)
                </p>
              </div>
            ) : (
              <div className="p-8 text-center">
                <FileUp className="mx-auto h-12 w-12 text-primary mb-4 animate-pulse" />
                <p className="text-sm font-medium mb-4">
                  Processing {file?.name}...
                </p>
                <Progress value={uploadProgress} className="max-w-xs mx-auto" />
              </div>
            )}

            {/* File Error */}
            {fileError && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{fileError}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Preview Step */}
        {step === "preview" && preview && (
          <div className="flex-1 overflow-auto py-4 space-y-4">
            {/* Summary */}
            <div className="flex gap-3 flex-wrap">
              <Badge variant="outline" className="text-sm">
                {preview.totalProducts} total products
              </Badge>
              <Badge
                variant={
                  preview.validProducts === preview.totalProducts
                    ? "default"
                    : "secondary"
                }
                className="text-sm"
              >
                {preview.validProducts} valid
              </Badge>
              {preview.totalProducts - preview.validProducts > 0 && (
                <Badge variant="destructive" className="text-sm">
                  {preview.totalProducts - preview.validProducts} with errors
                </Badge>
              )}
              {preview.conflicts.length > 0 && (
                <Badge
                  variant="outline"
                  className="text-sm text-amber-600 border-amber-600"
                >
                  {preview.conflicts.length} conflicts
                </Badge>
              )}
              <Badge variant="outline" className="text-sm">
                {selectedIndices.size} selected
              </Badge>
            </div>

            {/* Errors Summary */}
            {preview.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Parsing Errors</AlertTitle>
                <AlertDescription className="max-h-32 overflow-auto">
                  <ul className="list-disc pl-4 mt-2 space-y-1">
                    {preview.errors.slice(0, 10).map((err, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: Static error list without unique IDs
                      <li key={i} className="text-sm">
                        {err.recordReference && (
                          <span className="font-mono">
                            [{err.recordReference}]
                          </span>
                        )}{" "}
                        {err.field}: {err.message}
                      </li>
                    ))}
                    {preview.errors.length > 10 && (
                      <li className="text-sm">
                        ...and {preview.errors.length - 10} more errors
                      </li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Unmapped Fields Warning */}
            {preview.unmappedFieldsSummary.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Fields Not Imported</AlertTitle>
                <AlertDescription className="text-sm">
                  The following ONIX fields are not mapped to Salina fields and
                  will be skipped: {preview.unmappedFieldsSummary.join(", ")}
                </AlertDescription>
              </Alert>
            )}

            {/* Preview Table */}
            <div className="max-h-[400px] overflow-auto">
              <ImportPreviewTable
                products={preview.products.slice(0, PREVIEW_ROWS)}
                selectedIndices={selectedIndices}
                onSelectionChange={setSelectedIndices}
                conflictResolutions={conflictResolutions}
                onConflictResolutionChange={handleConflictResolutionChange}
              />
            </div>

            {preview.products.length > PREVIEW_ROWS && (
              <p className="text-sm text-muted-foreground text-center">
                Showing first {PREVIEW_ROWS} of {preview.products.length}{" "}
                products
              </p>
            )}
          </div>
        )}

        {/* Importing Step */}
        {step === "importing" && (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
              <p className="font-medium">Importing titles...</p>
              <Progress value={importProgress} className="max-w-xs mx-auto" />
              <p className="text-sm text-muted-foreground">
                Please do not close this window
              </p>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {step === "complete" && importResult && (
          <div className="flex-1 py-8">
            <div className="text-center space-y-4 mb-6">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
              <h3 className="text-lg font-semibold">Import Complete</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-lg mx-auto">
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {importResult.imported}
                </p>
                <p className="text-sm text-muted-foreground">Imported</p>
              </div>
              {importResult.updated > 0 && (
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {importResult.updated}
                  </p>
                  <p className="text-sm text-muted-foreground">Updated</p>
                </div>
              )}
              {importResult.skipped > 0 && (
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-amber-600">
                    {importResult.skipped}
                  </p>
                  <p className="text-sm text-muted-foreground">Skipped</p>
                </div>
              )}
              {importResult.errors > 0 && (
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-destructive">
                    {importResult.errors}
                  </p>
                  <p className="text-sm text-muted-foreground">Errors</p>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {step === "preview" && (
            <>
              <Button variant="outline" onClick={resetState}>
                <X className="h-4 w-4 mr-2" />
                Start Over
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedIndices.size === 0}
              >
                {getImportButtonText()}
              </Button>
            </>
          )}

          {step === "complete" && <Button onClick={handleClose}>Done</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
