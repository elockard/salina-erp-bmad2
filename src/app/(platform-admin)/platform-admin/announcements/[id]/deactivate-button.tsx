"use client";

/**
 * Deactivate Button Component
 *
 * Story 13.8: Implement Platform-Wide Announcements
 * AC: 6 - Deactivate announcements
 *
 * Client component for deactivating an announcement from the edit page.
 */

import { Power } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deactivateAnnouncement } from "@/modules/platform-admin/actions";

interface DeactivateButtonProps {
  announcementId: string;
}

export function DeactivateButton({ announcementId }: DeactivateButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handleDeactivate = async () => {
    startTransition(async () => {
      const result = await deactivateAnnouncement(announcementId);
      if (result.success) {
        toast.success("Announcement deactivated");
        router.push("/platform-admin/announcements");
      } else {
        toast.error(result.error || "Failed to deactivate announcement");
        setOpen(false);
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 text-amber-400 hover:text-amber-300"
        >
          <Power className="h-4 w-4" />
          Deactivate
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate Announcement</AlertDialogTitle>
          <AlertDialogDescription>
            This will immediately hide the announcement from all users. You can
            reactivate it later by editing and setting it to active.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeactivate}
            disabled={isPending}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isPending ? "Deactivating..." : "Deactivate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
