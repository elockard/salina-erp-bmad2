"use client";

/**
 * Send Invoice Confirmation Dialog
 *
 * Confirmation dialog for sending or resending an invoice email with:
 * - Invoice number and customer email preview
 * - Confirmation message
 * - Send and Cancel buttons
 * - Loading state during send
 *
 * Story: 8.6 - Implement Invoice PDF Generation and Email
 * Task 9: Create Send Invoice Dialog
 * AC-8.6.7: Send button with confirmation dialog
 *
 * Related:
 * - src/modules/invoices/components/void-invoice-dialog.tsx (pattern)
 */

import { Loader2, Mail, RefreshCw, Send } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface SendInvoiceDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onOpenChange: (open: boolean) => void;
  /** Invoice number for display */
  invoiceNumber: string;
  /** Invoice amount for display */
  invoiceAmount: string;
  /** Customer email address */
  customerEmail: string;
  /** Whether this is a resend (already sent invoice) */
  isResend?: boolean;
  /** Callback when send is confirmed */
  onConfirm: (regeneratePDF?: boolean) => Promise<void>;
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
 * Send invoice confirmation dialog
 *
 * AC-8.6.7: Confirmation dialog before sending invoice
 */
export function SendInvoiceDialog({
  open,
  onOpenChange,
  invoiceNumber,
  invoiceAmount,
  customerEmail,
  isResend = false,
  onConfirm,
}: SendInvoiceDialogProps) {
  const [regeneratePDF, setRegeneratePDF] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(regeneratePDF);
      setRegeneratePDF(false);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setRegeneratePDF(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isResend ? (
              <RefreshCw className="h-5 w-5 text-blue-600" />
            ) : (
              <Send className="h-5 w-5 text-blue-600" />
            )}
            {isResend ? "Resend Invoice" : "Send Invoice"}
          </DialogTitle>
          <DialogDescription>
            {isResend
              ? "This will resend the invoice email to the customer."
              : "This will email the invoice with PDF attachment to the customer and mark it as sent."}
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

          {/* Email recipient */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Send to:</span>
              <span className="font-medium">{customerEmail}</span>
            </div>
          </div>

          {/* Regenerate PDF option (resend only) */}
          {isResend && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="regenerate-pdf"
                checked={regeneratePDF}
                onCheckedChange={(checked) =>
                  setRegeneratePDF(checked === true)
                }
                disabled={isSubmitting}
              />
              <Label
                htmlFor="regenerate-pdf"
                className="text-sm font-normal cursor-pointer"
              >
                Regenerate PDF before sending
              </Label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isResend ? "Resending..." : "Sending..."}
              </>
            ) : (
              <>
                {isResend ? (
                  <RefreshCw className="mr-2 h-4 w-4" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {isResend ? "Resend Invoice" : "Send Invoice"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
