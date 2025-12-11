/**
 * Form 1099 Generate Anyway Dialog
 *
 * Dialog for generating a 1099-MISC form for an author without TIN.
 * Shows strong warning about IRS requirements.
 *
 * Story 11.3: Generate 1099-MISC Forms
 * AC-11.3.4: Admin/Owner can "Generate Anyway" with warning dialog
 */

"use client";

import { AlertTriangle, FileText, Loader2 } from "lucide-react";
import { useTransition } from "react";
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
import { generate1099Action } from "../actions";
import type { Author1099Info } from "../types";

interface Form1099GenerateAnywayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  author: Author1099Info;
  taxYear: number;
  onComplete: () => void;
}

export function Form1099GenerateAnywayDialog({
  open,
  onOpenChange,
  author,
  taxYear,
  onComplete,
}: Form1099GenerateAnywayDialogProps) {
  const [isPending, startTransition] = useTransition();

  // Format currency
  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  // Handle generate anyway
  const handleGenerateAnyway = () => {
    startTransition(async () => {
      const result = await generate1099Action({
        contact_id: author.id,
        tax_year: taxYear,
        force_without_tin: true,
      });

      if (result.success) {
        toast.success(
          "1099 generated without TIN. Remember to collect tax information before filing.",
        );
        onComplete();
      } else if (!result.success) {
        toast.error(result.error || "Failed to generate 1099");
      }
    });
  };

  // Handle close
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Generate Without TIN
          </DialogTitle>
          <DialogDescription>
            Generate 1099-MISC for {author.name} without tax identification?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm text-amber-800 font-medium mb-2">
              IRS Requirement Warning
            </p>
            <p className="text-sm text-amber-700">
              The IRS requires a valid Taxpayer Identification Number (TIN) for
              all 1099-MISC forms. Generating without a TIN will result in an
              incomplete form that cannot be filed as-is.
            </p>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Author</span>
              <span className="font-medium">{author.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Earnings</span>
              <span className="font-medium">
                {formatCurrency(author.total_earnings)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax Year</span>
              <span className="font-medium">{taxYear}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TIN Status</span>
              <span className="font-medium text-red-600">Missing</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            The generated form will display &quot;***-**-XXXX&quot; in the TIN
            field. You should collect the author&apos;s tax information before
            IRS filing deadlines.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerateAnyway}
            disabled={isPending}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Generate Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
