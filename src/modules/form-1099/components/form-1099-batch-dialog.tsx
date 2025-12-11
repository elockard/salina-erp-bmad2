/**
 * Form 1099 Batch Generation Dialog
 *
 * Dialog for batch generating 1099-MISC forms for multiple authors.
 * Shows progress and results of the batch operation.
 *
 * Story 11.3: Generate 1099-MISC Forms
 * AC-11.3.3: Batch generation with progress tracking
 */

"use client";

import {
  AlertCircle,
  CheckCircle,
  FileText,
  Loader2,
  XCircle,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import { generateBatch1099sAction } from "../actions";
import type { Author1099Info, BatchGenerate1099Result } from "../types";

interface Form1099BatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAuthors: Author1099Info[];
  taxYear: number;
  onComplete: () => void;
}

type DialogState = "confirm" | "processing" | "complete";

export function Form1099BatchDialog({
  open,
  onOpenChange,
  selectedAuthors,
  taxYear,
  onComplete,
}: Form1099BatchDialogProps) {
  const [state, setState] = useState<DialogState>("confirm");
  const [results, setResults] = useState<BatchGenerate1099Result | null>(null);
  const [isPending, startTransition] = useTransition();

  // Format currency
  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  // Calculate totals
  const totalEarnings = selectedAuthors.reduce(
    (sum, a) => sum + parseFloat(a.total_earnings),
    0,
  );

  // Handle generation
  const handleGenerate = () => {
    setState("processing");

    startTransition(async () => {
      try {
        const result = await generateBatch1099sAction({
          tax_year: taxYear,
          contact_ids: selectedAuthors.map((a) => a.id),
        });

        if (result.success && result.data) {
          setResults(result.data);
          setState("complete");

          if (result.data.failure_count === 0) {
            toast.success(
              `Successfully generated ${result.data.success_count} 1099 forms.`,
            );
          } else {
            toast.error(
              `Generated ${result.data.success_count} forms, ${result.data.failure_count} failed.`,
            );
          }
        } else if (!result.success) {
          toast.error(result.error || "Failed to generate 1099 forms");
          setState("confirm");
        }
      } catch {
        toast.error("An unexpected error occurred");
        setState("confirm");
      }
    });
  };

  // Handle close
  const handleClose = () => {
    if (state === "complete") {
      onComplete();
    }
    onOpenChange(false);
    // Reset state after dialog closes
    setTimeout(() => {
      setState("confirm");
      setResults(null);
    }, 200);
  };

  // Get progress percentage
  const getProgress = () => {
    if (!results) return 0;
    return (
      ((results.success_count + results.failure_count) /
        selectedAuthors.length) *
      100
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {state === "confirm" && "Generate 1099 Forms"}
            {state === "processing" && "Generating 1099 Forms..."}
            {state === "complete" && "Generation Complete"}
          </DialogTitle>
          <DialogDescription>
            {state === "confirm" &&
              `Generate 1099-MISC forms for ${selectedAuthors.length} selected author(s) for tax year ${taxYear}.`}
            {state === "processing" &&
              "Please wait while the forms are being generated."}
            {state === "complete" && "Review the results below."}
          </DialogDescription>
        </DialogHeader>

        {/* Confirm State - Show Summary */}
        {state === "confirm" && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Selected Authors</span>
                <span className="text-lg font-bold">
                  {selectedAuthors.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Earnings</span>
                <span className="text-lg font-bold">
                  {formatCurrency(totalEarnings)}
                </span>
              </div>
            </div>

            <div className="h-48 rounded-lg border overflow-auto">
              <div className="p-4 space-y-2">
                {selectedAuthors.map((author) => (
                  <div
                    key={author.id}
                    className="flex justify-between items-center text-sm"
                  >
                    <span>{author.name}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(author.total_earnings)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Once generated, 1099 forms cannot be regenerated for the same
                author and tax year. Please verify the selection before
                proceeding.
              </p>
            </div>
          </div>
        )}

        {/* Processing State - Show Progress */}
        {state === "processing" && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <Progress value={isPending ? 50 : getProgress()} />
            <p className="text-center text-sm text-muted-foreground">
              Processing {selectedAuthors.length} author(s)...
            </p>
          </div>
        )}

        {/* Complete State - Show Results */}
        {state === "complete" && results && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold text-green-600">
                  {results.success_count}
                </div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <XCircle className="h-8 w-8 mx-auto mb-2 text-red-600" />
                <div className="text-2xl font-bold text-red-600">
                  {results.failure_count}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>

            {results.failure_count > 0 && (
              <div className="h-32 rounded-lg border overflow-auto">
                <div className="p-4 space-y-2">
                  {results.results
                    .filter((r) => !r.success)
                    .map((r) => (
                      <div
                        key={r.contact_id}
                        className="flex items-start gap-2 text-sm text-red-600"
                      >
                        <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium">{r.contact_name}</span>
                          {r.error && (
                            <span className="text-muted-foreground">
                              : {r.error}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {state === "confirm" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={isPending}>
                <FileText className="mr-2 h-4 w-4" />
                Generate {selectedAuthors.length} Form(s)
              </Button>
            </>
          )}
          {state === "processing" && (
            <Button variant="outline" disabled>
              Processing...
            </Button>
          )}
          {state === "complete" && <Button onClick={handleClose}>Done</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
