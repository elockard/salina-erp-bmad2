/**
 * Announcements Management Page
 *
 * Story 13.8: Implement Platform-Wide Announcements
 * AC: 5 - Platform admins can view all current and past announcements
 * AC: 7 - Announcements are ordered by type (critical first) then date
 *
 * Server component that fetches announcements and passes to client list component.
 */

import { Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import {
  logPlatformAdminEvent,
  PLATFORM_ADMIN_ACTIONS,
} from "@/lib/platform-audit";
import { getAllAnnouncements } from "@/modules/platform-admin/announcements";
import { AnnouncementList } from "@/modules/platform-admin/components/announcement-list";

export const metadata = {
  title: "Announcements | Platform Admin",
  description: "Manage platform-wide announcements",
};

export default async function AnnouncementsPage() {
  const admin = await requirePlatformAdmin();

  // Log announcements access (fire and forget)
  logPlatformAdminEvent({
    adminEmail: admin.email,
    adminClerkId: admin.clerkId,
    action: PLATFORM_ADMIN_ACTIONS.VIEW_ANNOUNCEMENTS,
    route: "/platform-admin/announcements",
  });

  const announcements = await getAllAnnouncements({ includeInactive: true });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Announcements</h1>
          <p className="text-slate-400">
            Manage platform-wide announcements displayed to all tenants
          </p>
        </div>
        <Link href="/platform-admin/announcements/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Announcement
          </Button>
        </Link>
      </div>
      <AnnouncementList announcements={announcements} />
    </div>
  );
}
