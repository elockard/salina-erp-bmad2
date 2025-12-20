"use client";

/**
 * CSV Update Modal Component
 *
 * Story: 19.4 - Bulk Update via CSV
 * Task 4: Create bulk update modal
 *
 * Multi-step modal for bulk updating titles via CSV.
 * Follows pattern from CsvImportModal with update-specific steps.
 *
 * FRs: FR174
 *
 * Pattern from: src/modules/import-export/components/csv-import-modal.tsx
 */

import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  Upload,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

import {
  MAX_FILE_SIZE,
  parseCsvFile,
  validateCsvFile,
} from "../parsers/csv-parser";
import { autoMapColumns, validateCsvData } from "../schema";
import type {
  BulkUpdateResult,
  ColumnMapping,
  CsvParseResult,
  ImportValidationResult,
  MatchResult,
  TitleMatch,
  UpdateWizardStep,
} from "../types";
import { ColumnMapper } from "./column-mapper";
import { CsvUpdatePreview } from "./csv-update-preview";

interface CsvUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateComplete?: (result: BulkUpdateResult) => void;
}

/**
 * CSV Update Modal
 *
 * Multi-step modal for:
 * 1. File upload with validation
 * 2. Column mapping
 * 3. ISBN matching and diff preview
 * 4. Update progress tracking
 * 5. Success/error summary
 */
export function CsvUpdateModal({
  open,
  onOpenChange,
  onUpdateComplete,
}: CsvUpdateModalProps) {
  // Step management
  const [step, setStep] = useState<UpdateWizardStep>("upload");

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

  // Match state
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [isMatching, setIsMatching] = useState(false);

  // Update state
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateResult, setUpdateResult] = useState<BulkUpdateResult | null>(
    null,
  );

  // Upsert mode (create unmatched)
  const [createUnmatched, setCreateUnmatched] = useState(false);

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
    setMatchResult(null);
    setIsMatching(false);
    setIsUpdating(false);
    setUpdateProgress(0);
    setUpdateResult(null);
    setCreateUnmatched(false);
  }, []);

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [resetState, onOpenChange]);

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFileError(null);
    setFile(selectedFile);

    // Validate file (returns error message or null if valid)
    const validationError = validateCsvFile(selectedFile);
    if (validationError) {
      setFileError(validationError);
      return;
    }

    // Parse file
    setIsProcessing(true);
    try {
      const result = await parseCsvFile(selectedFile);
      if (!result.success) {
        setFileError(
          result.errors.length > 0
            ? result.errors[0].message
            : "Failed to parse CSV",
        );
        setIsProcessing(false);
        return;
      }

      setParseResult(result);

      // Auto-map columns
      const mappings = autoMapColumns(result.headers, result.rows);
      setColumnMappings(mappings);

      setStep("map");
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : "Failed to parse CSV",
      );
    } finally {
      setIsProcessing(false);
    }
  }, []);

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
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileSelect(selectedFile);
      }
    },
    [handleFileSelect],
  );

  /**
   * Validate mapped data and proceed to matching
   */
  const handleValidateAndMatch = useCallback(async () => {
    if (!parseResult) return;

    setIsValidating(true);
    try {
      // First validate the CSV data
      const validation = validateCsvData(parseResult, columnMappings);
      setValidationResult(validation);

      // Check for ISBN column mapping
      const isbnMapping = columnMappings.find((m) => m.targetField === "isbn");
      if (!isbnMapping) {
        toast.error("ISBN column required", {
          description: "Map a column to ISBN to match existing titles",
        });
        setIsValidating(false);
        return;
      }

      // Proceed to matching
      setIsMatching(true);
      setStep("match");

      // Perform ISBN matching via server action
      const actions = (await import("../actions")) as {
        matchTitlesByIsbnAction?: (
          rows: typeof validation.rows,
        ) => Promise<MatchResult>;
      };
      if (!actions.matchTitlesByIsbnAction) {
        throw new Error("Failed to load matchTitlesByIsbnAction from actions");
      }
      const matches = await actions.matchTitlesByIsbnAction(validation.rows);

      setMatchResult(matches);
      setStep("preview");
    } catch (error) {
      toast.error("Matching failed", {
        description:
          error instanceof Error ? error.message : "Failed to match titles",
      });
    } finally {
      setIsValidating(false);
      setIsMatching(false);
    }
  }, [parseResult, columnMappings]);

  /**
   * Handle selection changes in preview
   */
  const handleSelectionChange = useCallback((matches: TitleMatch[]) => {
    setMatchResult((prev) =>
      prev
        ? {
            ...prev,
            matched: matches,
          }
        : null,
    );
  }, []);

  /**
   * Execute the bulk update
   */
  const handleUpdate = useCallback(async () => {
    if (!matchResult || !parseResult) return;

    const selectedUpdates = matchResult.matched.filter(
      (m) => m.hasChanges && m.selected,
    );

    if (selectedUpdates.length === 0) {
      toast.error("No updates selected", {
        description: "Select at least one title to update",
      });
      return;
    }

    setIsUpdating(true);
    setUpdateProgress(0);
    setStep("update");

    try {
      // Call the bulk update action
      const actions = (await import("../actions")) as {
        bulkUpdateTitlesFromCsvAction?: (params: {
          filename: string;
          columnMappings: ColumnMapping[];
          updates: TitleMatch[];
          createUnmatched: boolean;
          unmatchedRows?: ImportValidationResult["rows"];
        }) => Promise<BulkUpdateResult>;
      };
      if (!actions.bulkUpdateTitlesFromCsvAction) {
        throw new Error(
          "Failed to load bulkUpdateTitlesFromCsvAction from actions",
        );
      }

      // Get unmatched rows if upsert mode
      const unmatchedRows = createUnmatched
        ? validationResult?.rows.filter((r) =>
            matchResult.unmatched.includes(r.data.isbn || ""),
          )
        : undefined;

      const result = await actions.bulkUpdateTitlesFromCsvAction({
        filename: file?.name || "unknown.csv",
        columnMappings,
        updates: selectedUpdates,
        createUnmatched,
        unmatchedRows,
      });

      setUpdateResult(result);
      setUpdateProgress(100);
      setStep("complete");

      if (result.success) {
        toast.success("Bulk update complete", {
          description: `Updated ${result.updatedCount} titles${
            result.createdCount > 0
              ? `, created ${result.createdCount} new`
              : ""
          }`,
        });
        onUpdateComplete?.(result);
      } else {
        toast.error("Update failed", {
          description:
            result.errors[0]?.message || "Some updates could not be completed",
        });
      }
    } catch (error) {
      toast.error("Update failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      setUpdateResult({
        success: false,
        updatedCount: 0,
        createdCount: 0,
        skippedCount: matchResult.matched.length,
        errors: [
          {
            row: 0,
            field: "",
            value: "",
            message: error instanceof Error ? error.message : "Update failed",
          },
        ],
        importId: "",
        updatedTitleIds: [],
        createdTitleIds: [],
      });
      setStep("complete");
    } finally {
      setIsUpdating(false);
    }
  }, [
    matchResult,
    parseResult,
    file,
    columnMappings,
    createUnmatched,
    validationResult,
    onUpdateComplete,
  ]);

  /**
   * Get step title
   */
  const getStepTitle = () => {
    switch (step) {
      case "upload":
        return "Upload CSV File";
      case "map":
        return "Map Columns";
      case "match":
        return "Matching Titles...";
      case "preview":
        return "Preview Changes";
      case "update":
        return "Updating Titles...";
      case "complete":
        return updateResult?.success ? "Update Complete" : "Update Failed";
      default:
        return "Bulk Update";
    }
  };

  /**
   * Get step description
   */
  const getStepDescription = () => {
    switch (step) {
      case "upload":
        return "Upload a CSV file with updated title data";
      case "map":
        return "Map CSV columns to Salina fields (ISBN required for matching)";
      case "match":
        return "Finding matching titles by ISBN...";
      case "preview":
        return "Review changes before applying updates";
      case "update":
        return "Applying updates to your catalog...";
      case "complete":
        return updateResult?.success
          ? "Your catalog has been updated"
          : "Some updates could not be completed";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            {getStepTitle()}
          </DialogTitle>
          <DialogDescription>{getStepDescription()}</DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <section
              aria-label="File upload drop zone"
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop your CSV file here, or
              </p>
              <label htmlFor="csv-update-input">
                <Button variant="outline" asChild>
                  <span>Browse Files</span>
                </Button>
                <input
                  id="csv-update-input"
                  type="file"
                  accept=".csv,.tsv,text/csv,text/tab-separated-values"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </label>
              <p className="text-xs text-muted-foreground mt-2">
                CSV or TSV files, max {MAX_FILE_SIZE / 1024 / 1024}MB
              </p>
            </section>

            {fileError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{fileError}</AlertDescription>
              </Alert>
            )}

            {isProcessing && (
              <div className="text-center py-4">
                <Progress value={50} className="w-full mb-2" />
                <p className="text-sm text-muted-foreground">
                  Processing file...
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === "map" && parseResult && (
          <div className="space-y-4">
            <Alert>
              <FileSpreadsheet className="h-4 w-4" />
              <AlertTitle>File loaded: {file?.name}</AlertTitle>
              <AlertDescription>
                {parseResult.rowCount} rows found. Map columns to Salina fields
                below. ISBN is required for matching.
              </AlertDescription>
            </Alert>

            <ColumnMapper
              mappings={columnMappings}
              onMappingsChange={setColumnMappings}
            />
          </div>
        )}

        {/* Step 3: Matching */}
        {step === "match" && isMatching && (
          <div className="text-center py-8">
            <Progress value={50} className="w-full mb-4" />
            <p className="text-sm text-muted-foreground">
              Matching {validationResult?.validCount || 0} rows by ISBN...
            </p>
          </div>
        )}

        {/* Step 4: Preview */}
        {step === "preview" && matchResult && (
          <div className="space-y-4">
            <CsvUpdatePreview
              matchResult={matchResult}
              onSelectionChange={handleSelectionChange}
            />

            {matchResult.unmatched.length > 0 && (
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                <Checkbox
                  id="create-unmatched"
                  checked={createUnmatched}
                  onCheckedChange={(checked) => setCreateUnmatched(!!checked)}
                />
                <Label htmlFor="create-unmatched" className="text-sm">
                  Create new titles for {matchResult.unmatched.length} unmatched
                  ISBNs (upsert mode)
                </Label>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Updating */}
        {step === "update" && (
          <div className="text-center py-8">
            <Progress value={updateProgress} className="w-full mb-4" />
            <p className="text-sm text-muted-foreground">
              Updating titles... Please wait.
            </p>
          </div>
        )}

        {/* Step 6: Complete */}
        {step === "complete" && updateResult && (
          <div className="space-y-4">
            {updateResult.success ? (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-600">
                  Update Complete
                </AlertTitle>
                <AlertDescription>
                  <div className="space-y-1 mt-2">
                    <p>
                      <strong>{updateResult.updatedCount}</strong> titles
                      updated
                    </p>
                    {updateResult.createdCount > 0 && (
                      <p>
                        <strong>{updateResult.createdCount}</strong> new titles
                        created
                      </p>
                    )}
                    {updateResult.skippedCount > 0 && (
                      <p className="text-muted-foreground">
                        {updateResult.skippedCount} rows skipped (no changes)
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Import ID: {updateResult.importId}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Update Failed</AlertTitle>
                <AlertDescription>
                  {updateResult.errors[0]?.message || "Unknown error occurred"}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {step === "map" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button
                onClick={handleValidateAndMatch}
                disabled={
                  isValidating ||
                  !columnMappings.some((m) => m.targetField === "isbn")
                }
              >
                {isValidating ? "Validating..." : "Match & Preview"}
              </Button>
            </>
          )}

          {step === "preview" && matchResult && (
            <>
              <Button variant="outline" onClick={() => setStep("map")}>
                Back
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={
                  isUpdating ||
                  matchResult.matched.filter((m) => m.hasChanges && m.selected)
                    .length === 0
                }
              >
                Update{" "}
                {
                  matchResult.matched.filter((m) => m.hasChanges && m.selected)
                    .length
                }{" "}
                Titles
              </Button>
            </>
          )}

          {step === "complete" && (
            <Button onClick={handleClose}>
              {updateResult?.success ? "Done" : "Close"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
