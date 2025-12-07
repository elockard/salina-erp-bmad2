"use client";

/**
 * Void Invoice Confirmation Dialog
 *
 * Confirmation dialog for voiding an invoice with:
 * - Warning message
 * - Invoice number and amount display
 * - Optional void reason textarea
 * - Confirm and Cancel buttons
 *
 * Story: 8.3 - Build Invoice List and Detail Views
 * Task 5: Create Void Confirmation Dialog (AC: 8.3.9)
 *
 * Related:
 * - src/components/ui/dialog.tsx (shadcn Dialog)
 */

import { AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface VoidInvoiceDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onOpenChange: (open: boolean) => void;
  /** Invoice number for display */
  invoiceNumber: string;
  /** Invoice amount for display */
  invoiceAmount: string;
  /** Callback when void is confirmed */
  onConfirm: (reason: string) => Promise<void>;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: string | number): string {
  const numAmount =
    typeof amount === "string" ? Number.parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numAmount);
}

/**
 * Void invoice confirmation dialog
 *
 * AC-8.3.9: Confirmation with warning, invoice details, reason input
 */
export function VoidInvoiceDialog({
  open,
  onOpenChange,
  invoiceNumber,
  invoiceAmount,
  onConfirm,
}: VoidInvoiceDialogProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(reason);
      setReason("");
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Void Invoice
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. The invoice will be marked as void and
            cannot be edited or sent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Invoice details */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Invoice Number</span>
              <span className="font-medium">{invoiceNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">{formatCurrency(invoiceAmount)}</span>
            </div>
          </div>

          {/* Reason input */}
          <div className="space-y-2">
            <Label htmlFor="void-reason">
              Reason for voiding{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="void-reason"
              placeholder="Enter reason for voiding this invoice..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Voiding...
              </>
            ) : (
              "Void Invoice"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
