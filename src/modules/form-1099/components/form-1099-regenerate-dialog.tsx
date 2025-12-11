/**
 * Form 1099 Regenerate Dialog
 *
 * Dialog for regenerating an existing 1099-MISC form.
 * Shows warning if amount has changed since original generation.
 *
 * Story 11.3: Generate 1099-MISC Forms
 * AC-11.3.7: Regenerate button with warning for changed amounts
 */

"use client";

import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
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
import { regenerate1099Action } from "../actions";
import type { Author1099Info } from "../types";

interface Form1099RegenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  author: Author1099Info;
  taxYear: number;
  onComplete: () => void;
}

export function Form1099RegenerateDialog({
  open,
  onOpenChange,
  author,
  taxYear,
  onComplete,
}: Form1099RegenerateDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [amountChangeWarning, setAmountChangeWarning] = useState<string | null>(
    null,
  );

  // Format currency
  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  // Handle regenerate
  const handleRegenerate = (confirmAmountChange = false) => {
    startTransition(async () => {
      // Use contact_id + tax_year to look up the form
      const result = await regenerate1099Action({
        contact_id: author.id,
        tax_year: taxYear,
        confirm_amount_change: confirmAmountChange,
      });

      if (result.success && result.data) {
        if (result.data.amount_changed) {
          toast.success(
            `1099 regenerated. Amount changed from ${formatCurrency(
              result.data.previous_amount || "0",
            )} to ${formatCurrency(result.data.new_amount)}`,
          );
        } else {
          toast.success("1099 regenerated successfully.");
        }
        onComplete();
      } else if (!result.success) {
        // Check if it's an amount change warning
        if (result.error?.includes("Amount has changed")) {
          setAmountChangeWarning(result.error);
        } else {
          toast.error(result.error || "Failed to regenerate 1099");
          onOpenChange(false);
        }
      }
    });
  };

  // Handle close
  const handleClose = () => {
    setAmountChangeWarning(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Regenerate 1099</DialogTitle>
          <DialogDescription>
            {amountChangeWarning
              ? "The earnings amount has changed since the original 1099 was generated."
              : `Regenerate 1099-MISC for ${author.name} for tax year ${taxYear}?`}
          </DialogDescription>
        </DialogHeader>

        {amountChangeWarning ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Amount Changed</p>
                <p>{amountChangeWarning}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Do you want to regenerate the 1099 with the new amount? This will
              replace the existing form.
            </p>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            <p>
              This will generate a new 1099-MISC form with current earnings data
              and replace the existing form. The download link for the previous
              form will no longer work.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          {amountChangeWarning ? (
            <Button
              onClick={() => handleRegenerate(true)}
              disabled={isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Confirm Regenerate
            </Button>
          ) : (
            <Button
              onClick={() => handleRegenerate(false)}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Regenerate
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
