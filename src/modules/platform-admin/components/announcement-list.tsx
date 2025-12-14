"use client";

/**
 * Announcement List Component
 *
 * Story 13.8: Implement Platform-Wide Announcements
 * AC: 5, 6, 7 - View all announcements, edit/deactivate, ordered by type
 *
 * Features:
 * - Display all announcements with status badges
 * - Type-based color coding (critical, warning, info)
 * - Status indicators (Active, Scheduled, Expired, Inactive)
 * - Actions: View/Edit, Deactivate, Delete (with confirmation)
 * - Click to navigate to edit page
 */

import { format } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  MoreHorizontal,
  Pencil,
  Power,
  Trash2,
} from "lucide-react";
import Link from "next/link";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { deactivateAnnouncement, deleteAnnouncement } from "../actions";
import type { PlatformAnnouncement } from "../types";

interface AnnouncementListProps {
  announcements: PlatformAnnouncement[];
}

function getAnnouncementStatus(
  announcement: PlatformAnnouncement,
): "active" | "scheduled" | "expired" | "inactive" {
  if (!announcement.isActive) return "inactive";

  const now = new Date();
  if (announcement.startsAt > now) return "scheduled";
  if (announcement.endsAt && announcement.endsAt < now) return "expired";
  return "active";
}

function StatusBadge({
  status,
}: {
  status: ReturnType<typeof getAnnouncementStatus>;
}) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-600 text-white">Active</Badge>;
    case "scheduled":
      return <Badge className="bg-blue-600 text-white">Scheduled</Badge>;
    case "expired":
      return <Badge variant="secondary">Expired</Badge>;
    case "inactive":
      return <Badge variant="destructive">Inactive</Badge>;
  }
}

function _TypeIcon({ type }: { type: "info" | "warning" | "critical" }) {
  switch (type) {
    case "critical":
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case "warning":
      return <AlertCircle className="h-4 w-4 text-amber-500" />;
    case "info":
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}

function TypeBadge({ type }: { type: "info" | "warning" | "critical" }) {
  switch (type) {
    case "critical":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Critical
        </Badge>
      );
    case "warning":
      return (
        <Badge className="gap-1 bg-amber-500 text-black hover:bg-amber-600">
          <AlertCircle className="h-3 w-3" />
          Warning
        </Badge>
      );
    case "info":
      return (
        <Badge className="gap-1 bg-blue-600 text-white">
          <Info className="h-3 w-3" />
          Info
        </Badge>
      );
  }
}

export function AnnouncementList({ announcements }: AnnouncementListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDeactivate = async (id: string) => {
    startTransition(async () => {
      const result = await deactivateAnnouncement(id);
      if (result.success) {
        toast.success("Announcement deactivated");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to deactivate announcement");
      }
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    startTransition(async () => {
      const result = await deleteAnnouncement(deleteId);
      if (result.success) {
        toast.success("Announcement deleted");
        setDeleteId(null);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete announcement");
      }
    });
  };

  // Sort by type priority (critical > warning > info), then by startsAt desc
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    const typeOrder = { critical: 0, warning: 1, info: 2 };
    const typeDiff = typeOrder[a.type] - typeOrder[b.type];
    if (typeDiff !== 0) return typeDiff;
    return b.startsAt.getTime() - a.startsAt.getTime();
  });

  if (announcements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-slate-700 bg-slate-800 p-12 text-center">
        <Info className="mb-4 h-12 w-12 text-slate-500" />
        <h3 className="mb-2 text-lg font-medium text-white">
          No Announcements
        </h3>
        <p className="mb-4 text-slate-400">
          Create your first platform-wide announcement to communicate with all
          tenants.
        </p>
        <Link href="/platform-admin/announcements/new">
          <Button>Create Announcement</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-slate-700 bg-slate-800">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700 hover:bg-slate-800">
              <TableHead className="text-slate-300">Type</TableHead>
              <TableHead className="text-slate-300">Message</TableHead>
              <TableHead className="text-slate-300">Start Date</TableHead>
              <TableHead className="text-slate-300">End Date</TableHead>
              <TableHead className="text-slate-300">Status</TableHead>
              <TableHead className="w-[70px] text-slate-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAnnouncements.map((announcement) => {
              const status = getAnnouncementStatus(announcement);
              return (
                <TableRow
                  key={announcement.id}
                  className="border-slate-700 hover:bg-slate-750"
                >
                  <TableCell>
                    <TypeBadge type={announcement.type} />
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="truncate text-slate-200">
                      {announcement.message}
                    </p>
                    {announcement.targetRoles &&
                      announcement.targetRoles.length > 0 && (
                        <p className="mt-1 text-xs text-slate-500">
                          Target: {announcement.targetRoles.join(", ")}
                        </p>
                      )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-slate-400">
                    {format(announcement.startsAt, "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-slate-400">
                    {announcement.endsAt
                      ? format(announcement.endsAt, "MMM d, yyyy h:mm a")
                      : "No expiration"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={status} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={isPending}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/platform-admin/announcements/${announcement.id}`}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        {announcement.isActive && (
                          <DropdownMenuItem
                            onClick={() => handleDeactivate(announcement.id)}
                            disabled={isPending}
                          >
                            <Power className="mr-2 h-4 w-4" />
                            Deactivate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-400 focus:text-red-400"
                          onClick={() => setDeleteId(announcement.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this announcement?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
