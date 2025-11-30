"use client";

/**
 * Contract Status Dropdown
 *
 * Dropdown for changing contract status with confirmation.
 * Story 4.3: Build Contract Detail View and Management
 *
 * AC 6: Actions section provides management capabilities
 * - Status dropdown allows status change with confirmation
 */

import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateContractStatus } from "../actions";

type ContractStatus = "active" | "suspended" | "terminated";

const STATUS_LABELS: Record<ContractStatus, string> = {
  active: "Active",
  suspended: "Suspended",
  terminated: "Terminated",
};

const STATUS_DESCRIPTIONS: Record<ContractStatus, string> = {
  active: "Contract is in effect and royalties can be calculated",
  suspended: "Contract is temporarily paused - no royalties will be calculated",
  terminated: "Contract has been permanently ended",
};

interface ContractStatusDropdownProps {
  contractId: string;
  currentStatus: ContractStatus;
}

export function ContractStatusDropdown({
  contractId,
  currentStatus,
}: ContractStatusDropdownProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingStatus, setPendingStatus] = useState<ContractStatus | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleStatusSelect = (newStatus: ContractStatus) => {
    if (newStatus === currentStatus) return;
    setPendingStatus(newStatus);
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    if (!pendingStatus) return;

    startTransition(async () => {
      const result = await updateContractStatus(contractId, pendingStatus);

      if (result.success) {
        toast.success(`Contract status changed to ${STATUS_LABELS[pendingStatus]}`);
        router.refresh();
      } else {
        toast.error(result.error);
      }

      setShowConfirmation(false);
      setPendingStatus(null);
    });
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setPendingStatus(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Status: {STATUS_LABELS[currentStatus]}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(["active", "suspended", "terminated"] as const).map((status) => (
            <DropdownMenuItem
              key={status}
              onClick={() => handleStatusSelect(status)}
              className="flex items-center justify-between"
            >
              <span>{STATUS_LABELS[status]}</span>
              {status === currentStatus && <Check className="h-4 w-4 ml-2" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Contract Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the contract status from{" "}
              <strong>{STATUS_LABELS[currentStatus]}</strong> to{" "}
              <strong>{pendingStatus ? STATUS_LABELS[pendingStatus] : ""}</strong>?
              <br />
              <br />
              {pendingStatus && STATUS_DESCRIPTIONS[pendingStatus]}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                "Confirm Change"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
