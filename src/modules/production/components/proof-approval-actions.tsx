"use client";

/**
 * Proof Approval Actions Component
 *
 * Buttons to approve or request corrections on the latest proof.
 * Only shown when project is in "proof" stage with a pending proof.
 *
 * Story: 18.5 - Approve or Request Corrections on Proofs
 * AC-18.5.1: Approve button moves project to print_ready stage
 * AC-18.5.2: Request corrections with required notes
 */

import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { approveProof, requestProofCorrections } from "../actions";
import type { ProofFileWithUrl } from "../types";

interface ProofApprovalActionsProps {
  /** Latest proof that can be approved */
  proof: ProofFileWithUrl;
  /** Whether project is in proof stage (approval enabled) */
  isProofStage: boolean;
  /** Callback after approval action completes */
  onActionComplete: () => void;
}

export function ProofApprovalActions({
  proof,
  isProofStage,
  onActionComplete,
}: ProofApprovalActionsProps) {
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showCorrectionsDialog, setShowCorrectionsDialog] = useState(false);
  const [correctionNotes, setCorrectionNotes] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isRequestingCorrections, setIsRequestingCorrections] = useState(false);

  // Determine if actions can be taken and why not
  const canTakeAction = isProofStage && proof.approvalStatus === "pending";

  // AC-18.5.5: Tooltip message explaining why buttons are disabled
  const getDisabledReason = (): string | null => {
    if (!isProofStage) {
      return "Project must be in proof stage to take approval actions";
    }
    if (proof.approvalStatus === "approved") {
      return "This proof has already been approved";
    }
    if (proof.approvalStatus === "corrections_requested") {
      return "Corrections already requested - upload a new proof version";
    }
    return null;
  };

  const disabledReason = getDisabledReason();

  /**
   * Handle approve proof
   * AC-18.5.1: Moves project to print_ready stage
   */
  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const result = await approveProof(proof.id);

      if (result.success) {
        toast.success("Proof approved! Project moved to Print Ready stage.");
        setShowApproveDialog(false);
        onActionComplete();
      } else {
        toast.error(result.message || "Failed to approve proof");
      }
    } catch (error) {
      console.error("Error approving proof:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsApproving(false);
    }
  };

  /**
   * Handle request corrections
   * AC-18.5.2: Required notes (min 10 chars)
   * AC-18.5.3: Sends email notification to vendor
   */
  const handleRequestCorrections = async () => {
    if (correctionNotes.trim().length < 10) {
      toast.error(
        "Please provide at least 10 characters describing the corrections needed",
      );
      return;
    }

    setIsRequestingCorrections(true);
    try {
      const result = await requestProofCorrections(
        proof.id,
        correctionNotes.trim(),
      );

      if (result.success) {
        // Show success message
        toast.success("Corrections requested successfully.");

        // Show warning if email wasn't sent (AC-18.5.3)
        if (result.emailWarning) {
          toast.warning(result.emailWarning);
        } else if (result.emailSent) {
          toast.info("Vendor has been notified by email.");
        }

        setShowCorrectionsDialog(false);
        setCorrectionNotes("");
        onActionComplete();
      } else {
        toast.error(result.message || "Failed to request corrections");
      }
    } catch (error) {
      console.error("Error requesting corrections:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsRequestingCorrections(false);
    }
  };

  // Wrap button with tooltip when disabled
  const renderButtonWithTooltip = (
    button: React.ReactNode,
    disabled: boolean,
  ) => {
    if (!disabled || !disabledReason) {
      return button;
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-not-allowed">{button}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{disabledReason}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider>
      {/* Action Buttons - AC-18.5.5: Show with tooltip when disabled */}
      <div className="flex items-center gap-2 mt-4">
        {renderButtonWithTooltip(
          <Button
            variant="default"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => setShowApproveDialog(true)}
            disabled={!canTakeAction || isApproving}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Approve Proof
          </Button>,
          !canTakeAction,
        )}
        {renderButtonWithTooltip(
          <Button
            variant="outline"
            className="border-orange-300 text-orange-700 hover:bg-orange-50"
            onClick={() => setShowCorrectionsDialog(true)}
            disabled={!canTakeAction}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Request Corrections
          </Button>,
          !canTakeAction,
        )}
      </div>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Proof</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve proof version {proof.version}?
              This will move the project to the <strong>Print Ready</strong>{" "}
              stage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApproving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={isApproving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Request Corrections Dialog */}
      <Dialog
        open={showCorrectionsDialog}
        onOpenChange={(open) => {
          if (!open) {
            setCorrectionNotes("");
          }
          setShowCorrectionsDialog(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Corrections</DialogTitle>
            <DialogDescription>
              Describe the corrections needed for proof version {proof.version}.
              The vendor will be notified by email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="correction-notes">
              Correction Notes <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="correction-notes"
              value={correctionNotes}
              onChange={(e) => setCorrectionNotes(e.target.value)}
              placeholder="Describe the specific corrections needed (minimum 10 characters)..."
              rows={4}
              maxLength={2000}
              className="resize-none"
              disabled={isRequestingCorrections}
            />
            <p className="text-xs text-muted-foreground">
              {correctionNotes.length}/2000 characters
              {correctionNotes.length < 10 && correctionNotes.length > 0 && (
                <span className="text-destructive ml-2">
                  (minimum 10 characters required)
                </span>
              )}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCorrectionsDialog(false)}
              disabled={isRequestingCorrections}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleRequestCorrections}
              disabled={
                isRequestingCorrections || correctionNotes.trim().length < 10
              }
            >
              {isRequestingCorrections && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Request Corrections
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
