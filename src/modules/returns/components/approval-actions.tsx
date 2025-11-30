"use client";

/**
 * Approval Actions Component
 *
 * Action buttons for approving or rejecting a return request.
 * Story 3.6: AC 5 (approve button), AC 7 (reject button)
 *
 * Features:
 * - Primary "Approve Return" button triggers confirmation dialog
 * - Secondary "Reject Return" button triggers rejection dialog
 * - Loading states during API calls
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PendingReturn } from "../types";
import { ApproveConfirmDialog } from "./approve-confirm-dialog";
import { RejectConfirmDialog } from "./reject-confirm-dialog";

interface ApprovalActionsProps {
  returnItem: PendingReturn;
  onApprove: (internalNote?: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  loading?: boolean;
}

export function ApprovalActions({
  returnItem,
  onApprove,
  onReject,
  loading,
}: ApprovalActionsProps) {
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const handleApproveConfirm = async (internalNote?: string) => {
    await onApprove(internalNote);
    setApproveDialogOpen(false);
  };

  const handleRejectConfirm = async (reason: string) => {
    await onReject(reason);
    setRejectDialogOpen(false);
  };

  return (
    <div className="flex gap-3">
      {/* Approve Button (AC 5) */}
      <Button
        onClick={() => setApproveDialogOpen(true)}
        disabled={loading}
        className="flex-1"
      >
        {loading ? "Processing..." : "Approve Return"}
      </Button>

      {/* Reject Button (AC 7) */}
      <Button
        variant="outline"
        onClick={() => setRejectDialogOpen(true)}
        disabled={loading}
        className="flex-1"
      >
        Reject Return
      </Button>

      {/* Approve Confirmation Dialog (AC 5, 6) */}
      <ApproveConfirmDialog
        open={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        returnItem={returnItem}
        onConfirm={handleApproveConfirm}
        loading={loading}
      />

      {/* Reject Confirmation Dialog (AC 7, 8) */}
      <RejectConfirmDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        returnItem={returnItem}
        onConfirm={handleRejectConfirm}
        loading={loading}
      />
    </div>
  );
}
