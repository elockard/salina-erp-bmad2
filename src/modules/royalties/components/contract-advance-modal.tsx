"use client";

/**
 * Contract Advance Modal
 *
 * Modal for recording additional advance payments.
 * Story 4.3: Build Contract Detail View and Management
 *
 * AC 8: Update Advance modal tracks additional payments
 * - Current advance amount displayed (read-only)
 * - Current advance paid displayed
 * - "Additional Payment" currency input
 * - Calculates new total advance paid
 * - Save updates advance_paid field
 */

import Decimal from "decimal.js";
import { DollarSign, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAdvancePaid } from "../actions";
import type { ContractWithRelations } from "../types";

interface ContractAdvanceModalProps {
  contract: ContractWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: string): string {
  const num = parseFloat(amount || "0");
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

export function ContractAdvanceModal({
  contract,
  open,
  onOpenChange,
}: ContractAdvanceModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [additionalPayment, setAdditionalPayment] = useState("");

  // Calculate values using Decimal.js
  const advanceAmount = new Decimal(contract.advance_amount || "0");
  const currentPaid = new Decimal(contract.advance_paid || "0");
  const remainingAdvance = advanceAmount.minus(currentPaid);

  // Calculate new total if payment is entered
  const paymentAmount = new Decimal(additionalPayment || "0");
  const newTotal = currentPaid.plus(paymentAmount);
  const wouldExceedLimit = newTotal.greaterThan(advanceAmount);

  // Validation
  const isValidPayment =
    paymentAmount.greaterThan(0) &&
    !wouldExceedLimit &&
    !Number.isNaN(parseFloat(additionalPayment));

  const handleSubmit = () => {
    if (!isValidPayment) return;

    startTransition(async () => {
      const result = await updateAdvancePaid(contract.id, additionalPayment);

      if (result.success) {
        toast.success(
          `Recorded additional payment of ${formatCurrency(additionalPayment)}`,
        );
        setAdditionalPayment("");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleClose = () => {
    setAdditionalPayment("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Update Advance Payment
          </DialogTitle>
          <DialogDescription>
            Record an additional advance payment for this contract.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Advance Amount (read-only) */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">
              Total Advance Amount
            </Label>
            <div className="text-lg font-medium">
              {formatCurrency(contract.advance_amount)}
            </div>
          </div>

          {/* Current Advance Paid (read-only) */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Currently Paid</Label>
            <div className="text-lg font-medium">
              {formatCurrency(contract.advance_paid)}
            </div>
          </div>

          {/* Remaining to be paid */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Remaining to Pay</Label>
            <div className="text-lg font-medium text-amber-600">
              {formatCurrency(remainingAdvance.toString())}
            </div>
          </div>

          <div className="border-t pt-4">
            {/* Additional Payment Input */}
            <div className="space-y-2">
              <Label htmlFor="additionalPayment">Additional Payment</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="additionalPayment"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={remainingAdvance.toNumber()}
                  placeholder="0.00"
                  className="pl-7"
                  value={additionalPayment}
                  onChange={(e) => setAdditionalPayment(e.target.value)}
                />
              </div>
              {wouldExceedLimit && parseFloat(additionalPayment) > 0 && (
                <p className="text-sm text-destructive">
                  Payment cannot exceed remaining advance (
                  {formatCurrency(remainingAdvance.toString())})
                </p>
              )}
            </div>

            {/* New Total Preview */}
            {isValidPayment && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    New Total Paid
                  </span>
                  <span className="font-bold text-lg">
                    {formatCurrency(newTotal.toString())}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !isValidPayment}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Record Payment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
