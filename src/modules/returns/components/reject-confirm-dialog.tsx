"use client";

/**
 * Reject Confirmation Dialog Component
 *
 * Confirmation dialog for rejecting a return request.
 * Story 3.6: AC 7 (rejection dialog), AC 8 (rejection action)
 *
 * Features:
 * - Required rejection reason text area with validation
 * - Confirm and Cancel buttons
 */

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PendingReturn } from "../types";

interface RejectConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnItem: PendingReturn;
  onConfirm: (reason: string) => Promise<void>;
  loading?: boolean;
}

export function RejectConfirmDialog({
  open,
  onOpenChange,
  returnItem,
  onConfirm,
  loading,
}: RejectConfirmDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    // Validate reason (AC 12 - rejection reason required)
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError("Please provide a reason for rejection");
      return;
    }
    if (trimmedReason.length > 500) {
      setError("Reason cannot exceed 500 characters");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await onConfirm(trimmedReason);
      setReason("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason("");
      setError("");
    }
    onOpenChange(newOpen);
  };

  const handleReasonChange = (value: string) => {
    setReason(value);
    if (error && value.trim()) {
      setError("");
    }
  };

  const isLoading = loading || isSubmitting;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject Return?</AlertDialogTitle>
          <AlertDialogDescription>
            This return will be rejected and will not affect royalty
            calculations. Please provide a reason for rejection.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Required Rejection Reason (AC 7) */}
        <div className="space-y-2 py-4">
          <Label htmlFor="rejection-reason">
            Rejection reason <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="rejection-reason"
            placeholder="Please explain why this return is being rejected..."
            value={reason}
            onChange={(e) => handleReasonChange(e.target.value)}
            className={error ? "border-red-500" : ""}
            rows={3}
            maxLength={500}
            disabled={isLoading}
          />
          <div className="flex justify-between">
            {error ? <p className="text-xs text-red-500">{error}</p> : <span />}
            <p className="text-xs text-muted-foreground">{reason.length}/500</p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Rejecting..." : "Confirm Rejection"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
