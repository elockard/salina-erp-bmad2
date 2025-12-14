/**
 * Reactivate Tenant Dialog Component
 *
 * Story 13.4: Implement Tenant Suspension and Reactivation
 * Task 10: Create Reactivate Tenant Dialog Component
 * AC-13.4.6: Platform admin can reactivate a suspended tenant
 *
 * AlertDialog for reactivating a suspended tenant.
 */

"use client";

import { CheckCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { reactivateTenant } from "../actions";

interface ReactivateTenantDialogProps {
  /** Tenant UUID */
  tenantId: string;
  /** Tenant name for display */
  tenantName: string;
  /** Time suspended for display */
  suspendedDuration?: string;
}

export function ReactivateTenantDialog({
  tenantId,
  tenantName,
  suspendedDuration,
}: ReactivateTenantDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleReactivate() {
    setIsLoading(true);
    const result = await reactivateTenant(tenantId);
    setIsLoading(false);

    if (result.success) {
      toast.success(`${tenantName} has been reactivated`);
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          className="bg-green-600 text-white hover:bg-green-700"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Reactivate Tenant
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-slate-700 bg-slate-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">
            Reactivate {tenantName}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            This will restore access for all users of this tenant. They will be
            able to log in and use the application normally.
            {suspendedDuration && (
              <span className="mt-2 block text-slate-500">
                This tenant has been suspended for {suspendedDuration}.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-slate-600 bg-slate-700 text-white hover:bg-slate-600 hover:text-white">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleReactivate();
            }}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reactivate Tenant
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
