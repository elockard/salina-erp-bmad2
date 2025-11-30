"use client";

/**
 * Approve Confirmation Dialog Component
 *
 * Confirmation dialog for approving a return request.
 * Story 3.6: AC 5 (confirmation dialog), AC 6 (approval action)
 *
 * Features:
 * - Display return amount and confirmation message
 * - Optional internal note text area
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
import { formatNegativeCurrency } from "../utils";

interface ApproveConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnItem: PendingReturn;
  onConfirm: (internalNote?: string) => Promise<void>;
  loading?: boolean;
}

export function ApproveConfirmDialog({
  open,
  onOpenChange,
  returnItem,
  onConfirm,
  loading,
}: ApproveConfirmDialogProps) {
  const [internalNote, setInternalNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(internalNote.trim() || undefined);
      setInternalNote("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setInternalNote("");
    }
    onOpenChange(newOpen);
  };

  const isLoading = loading || isSubmitting;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Approve Return?</AlertDialogTitle>
          <AlertDialogDescription>
            This return of{" "}
            <span className="font-semibold text-foreground">
              {formatNegativeCurrency(returnItem.total_amount)}
            </span>{" "}
            will be approved and will impact royalty calculations.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Optional Internal Note (AC 5) */}
        <div className="space-y-2 py-4">
          <Label htmlFor="internal-note">Add internal note (optional)</Label>
          <Textarea
            id="internal-note"
            placeholder="Optional note for internal records..."
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            className="resize-none"
            rows={3}
            maxLength={500}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground text-right">
            {internalNote.length}/500
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Approving..." : "Confirm Approval"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
