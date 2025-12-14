/**
 * Impersonation Confirmation Dialog Component
 *
 * Story 13.6: Implement Tenant Impersonation for Support (AC: 6)
 *
 * Dialog that requires platform admin to provide a reason before
 * impersonating a tenant user. On success, redirects to Clerk sign-in URL.
 */

"use client";

import { AlertTriangle, Loader2, UserCog } from "lucide-react";
import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { startImpersonation } from "../actions";

interface ImpersonationConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Database user ID to impersonate */
  userId: string;
  /** User email for display */
  userEmail: string;
  /** Tenant name for display */
  tenantName: string;
}

export function ImpersonationConfirmDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
  tenantName,
}: ImpersonationConfirmDialogProps) {
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleConfirm() {
    if (reason.trim().length < 10) {
      toast.error("Reason must be at least 10 characters");
      return;
    }

    setIsLoading(true);
    const result = await startImpersonation({ userId, reason: reason.trim() });

    if (result.success) {
      // Redirect to Clerk's actor token sign-in URL
      // This will sign out current session and sign in as impersonated user
      window.location.href = result.data.signInUrl;
    } else {
      toast.error(result.error);
      setIsLoading(false);
    }
  }

  function handleOpenChange(newOpen: boolean) {
    if (!isLoading) {
      if (!newOpen) {
        setReason("");
      }
      onOpenChange(newOpen);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-slate-700 bg-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <UserCog className="h-5 w-5 text-amber-500" />
            Impersonate User
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            You are about to impersonate a user. This action is logged for
            security and compliance purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User info */}
          <div className="rounded-lg border border-slate-600 bg-slate-900 p-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-slate-400">User Email:</div>
              <div className="font-medium text-white">{userEmail}</div>
              <div className="text-slate-400">Tenant:</div>
              <div className="font-medium text-white">{tenantName}</div>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
            <p className="text-sm text-amber-200">
              All actions during impersonation are logged with your platform
              admin identity.
            </p>
          </div>

          {/* Reason input */}
          <div>
            <Label htmlFor="reason" className="text-slate-300">
              Reason for Impersonation *
            </Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for impersonation (e.g., investigating support ticket #1234)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2 border-slate-600 bg-slate-700 text-white placeholder:text-slate-500"
              rows={3}
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-slate-500">
              {reason.length}/10 characters minimum
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
            className="border-slate-600 bg-slate-700 text-white hover:bg-slate-600 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || reason.trim().length < 10}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start Impersonation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
