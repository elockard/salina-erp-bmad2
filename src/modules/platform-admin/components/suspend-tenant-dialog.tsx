/**
 * Suspend Tenant Dialog Component
 *
 * Story 13.4: Implement Tenant Suspension and Reactivation
 * Task 9: Create Suspend Tenant Dialog Component
 * AC-13.4.1: Platform admin must provide suspension reason
 *
 * AlertDialog for suspending a tenant with required reason field.
 */

"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { suspendTenant } from "../actions";

interface SuspendTenantDialogProps {
  /** Tenant UUID */
  tenantId: string;
  /** Tenant name for display */
  tenantName: string;
}

export function SuspendTenantDialog({
  tenantId,
  tenantName,
}: SuspendTenantDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSuspend() {
    if (reason.trim().length < 10) {
      toast.error("Reason must be at least 10 characters");
      return;
    }

    setIsLoading(true);
    const result = await suspendTenant(tenantId, reason);
    setIsLoading(false);

    if (result.success) {
      toast.success(`${tenantName} has been suspended`);
      setOpen(false);
      setReason("");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <AlertTriangle className="mr-2 h-4 w-4" />
          Suspend Tenant
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-slate-700 bg-slate-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">
            Suspend {tenantName}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            This will immediately block all users of this tenant from accessing
            the application. They will see an &quot;Account Suspended&quot;
            message.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="my-4">
          <Label htmlFor="reason" className="text-slate-300">
            Suspension Reason
          </Label>
          <Textarea
            id="reason"
            placeholder="Enter reason for suspension (min 10 characters)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-2 border-slate-600 bg-slate-700 text-white placeholder:text-slate-500"
            rows={3}
          />
          <p className="mt-1 text-xs text-slate-500">
            {reason.length}/10 characters minimum
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-slate-600 bg-slate-700 text-white hover:bg-slate-600 hover:text-white">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleSuspend();
            }}
            disabled={isLoading || reason.trim().length < 10}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Suspend Tenant
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
