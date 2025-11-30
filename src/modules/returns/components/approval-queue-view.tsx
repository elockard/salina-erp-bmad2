"use client";

/**
 * Approval Queue View Component
 *
 * Split View Explorer layout for reviewing pending returns.
 * Story 3.6: AC 1 (Split View layout), AC 2 (left panel), AC 3 (right panel), AC 9 (empty state)
 *
 * Layout:
 * - Left panel (320px desktop, 280px tablet): Pending returns list
 * - Right panel (fluid): Selected return detail or empty state
 * - Mobile: List-only with slide-in detail
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  approveReturn,
  getNextPendingReturn,
  getPendingReturnsAction,
  rejectReturn,
} from "../actions";
import type { PendingReturn } from "../types";
import { EmptyQueueState } from "./empty-queue-state";
import { PendingReturnsList } from "./pending-returns-list";
import { ReturnDetailPanel } from "./return-detail-panel";

interface ApprovalQueueViewProps {
  initialReturns?: PendingReturn[];
}

export function ApprovalQueueView({ initialReturns }: ApprovalQueueViewProps) {
  const [pendingReturns, setPendingReturns] = useState<PendingReturn[]>(
    initialReturns ?? [],
  );
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialReturns);
  const [actionLoading, setActionLoading] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const selectedReturn =
    pendingReturns.find((r) => r.id === selectedReturnId) || null;

  // Load pending returns on mount if no initial data
  const loadPendingReturns = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getPendingReturnsAction();
      if (result.success && result.data) {
        setPendingReturns(result.data);
        // Auto-select first return if none selected
        if (result.data.length > 0 && !selectedReturnId) {
          setSelectedReturnId(result.data[0].id);
        }
      } else if (!result.success) {
        toast.error(result.error || "Failed to load pending returns");
      }
    } catch (error) {
      console.error("Failed to load pending returns:", error);
      toast.error("Failed to load pending returns");
    } finally {
      setLoading(false);
    }
  }, [selectedReturnId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: only run on mount
  useEffect(() => {
    if (!initialReturns) {
      loadPendingReturns();
    } else if (initialReturns.length > 0 && !selectedReturnId) {
      // Auto-select first return from initial data
      setSelectedReturnId(initialReturns[0].id);
    }
  }, []);

  // Handle return selection
  const handleSelectReturn = (returnId: string) => {
    setSelectedReturnId(returnId);
    setMobileDetailOpen(true);
  };

  // Handle approval (AC 6)
  const handleApprove = async (internalNote?: string) => {
    if (!selectedReturnId || !selectedReturn) return;

    setActionLoading(true);
    try {
      const result = await approveReturn({
        return_id: selectedReturnId,
        internal_note: internalNote,
      });

      if (result.success) {
        // Show success toast with amount (AC 6)
        toast.success(
          `Return approved - $${selectedReturn.total_amount} will be deducted from royalties`,
        );

        // Remove from local state
        setPendingReturns((prev) =>
          prev.filter((r) => r.id !== selectedReturnId),
        );

        // Auto-load next pending return (AC 6)
        const nextResult = await getNextPendingReturn(selectedReturnId);
        if (nextResult.success && nextResult.data) {
          setSelectedReturnId(nextResult.data.id);
        } else {
          setSelectedReturnId(null);
          setMobileDetailOpen(false);
        }
      } else {
        toast.error(result.error || "Failed to approve return");
      }
    } catch (error) {
      console.error("Approve return error:", error);
      toast.error("Failed to approve return");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle rejection (AC 8)
  const handleReject = async (reason: string) => {
    if (!selectedReturnId) return;

    setActionLoading(true);
    try {
      const result = await rejectReturn({
        return_id: selectedReturnId,
        reason,
      });

      if (result.success) {
        // Show success toast (AC 8)
        toast.success("Return rejected - No impact on royalties");

        // Remove from local state
        setPendingReturns((prev) =>
          prev.filter((r) => r.id !== selectedReturnId),
        );

        // Auto-load next pending return (AC 8)
        const nextResult = await getNextPendingReturn(selectedReturnId);
        if (nextResult.success && nextResult.data) {
          setSelectedReturnId(nextResult.data.id);
        } else {
          setSelectedReturnId(null);
          setMobileDetailOpen(false);
        }
      } else {
        toast.error(result.error || "Failed to reject return");
      }
    } catch (error) {
      console.error("Reject return error:", error);
      toast.error("Failed to reject return");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-16rem)] border rounded-lg overflow-hidden bg-background">
      {/* Left Panel - Pending Returns List (AC 2) */}
      <div
        className={cn(
          "flex flex-col border-r bg-background",
          "w-[320px] lg:w-[320px] md:w-[280px]",
          "max-md:w-full max-md:border-r-0",
          mobileDetailOpen && "max-md:hidden",
        )}
      >
        {/* Header with count */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            Pending Returns ({pendingReturns.length})
          </h2>
        </div>

        {/* Pending Returns List */}
        <PendingReturnsList
          returns={pendingReturns}
          selectedReturnId={selectedReturnId}
          onSelectReturn={handleSelectReturn}
          loading={loading}
        />
      </div>

      {/* Right Panel - Return Detail or Empty State (AC 3, 9) */}
      <div
        className={cn(
          "flex-1 overflow-auto bg-muted/30",
          "max-md:fixed max-md:inset-0 max-md:z-50 max-md:bg-background",
          !mobileDetailOpen && "max-md:hidden",
        )}
      >
        {/* Mobile Back Button */}
        {mobileDetailOpen && (
          <div className="md:hidden p-4 border-b flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileDetailOpen(false)}
            >
              &larr; Back to list
            </Button>
          </div>
        )}

        {selectedReturn ? (
          <ReturnDetailPanel
            returnItem={selectedReturn}
            onApprove={handleApprove}
            onReject={handleReject}
            loading={actionLoading}
          />
        ) : pendingReturns.length === 0 && !loading ? (
          <EmptyQueueState />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Select a return to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
