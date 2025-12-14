"use client";

/**
 * Impersonation Banner Component
 *
 * Story 13.6: Implement Tenant Impersonation for Support (AC: 2, 3, 5)
 *
 * Displays a prominent amber banner when a platform admin is impersonating a user.
 * Provides "End Impersonation" button that logs the event and signs out.
 */

import { useClerk } from "@clerk/nextjs";
import { AlertTriangle } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { endImpersonation } from "@/modules/platform-admin/actions";

interface ImpersonationBannerProps {
  impersonatedEmail: string;
  tenantName: string;
}

export function ImpersonationBanner({
  impersonatedEmail,
  tenantName,
}: ImpersonationBannerProps) {
  const { signOut } = useClerk();
  const [isPending, startTransition] = useTransition();

  const handleEndImpersonation = () => {
    startTransition(async () => {
      // Log END_IMPERSONATION audit event for duration tracking (AC: 5)
      await endImpersonation();
      // Sign out ends the impersonation session
      // Clerk handles session cleanup automatically
      await signOut({ redirectUrl: "/platform-admin" });
    });
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-amber-500 px-4 py-2 text-black">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        <span className="font-medium">
          Impersonating {impersonatedEmail} | {tenantName}
        </span>
      </div>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleEndImpersonation}
        disabled={isPending}
      >
        {isPending ? "Ending..." : "End Impersonation"}
      </Button>
    </div>
  );
}
