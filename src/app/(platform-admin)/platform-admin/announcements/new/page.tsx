/**
 * New Announcement Page
 *
 * Story 13.8: Implement Platform-Wide Announcements
 * AC: 1 - Create platform announcements with message, type, dates, target roles
 *
 * Server component wrapper for the announcement form in create mode.
 */

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { AnnouncementForm } from "@/modules/platform-admin/components/announcement-form";

export const metadata = {
  title: "Create Announcement | Platform Admin",
  description: "Create a new platform-wide announcement",
};

export default async function NewAnnouncementPage() {
  // Require platform admin authentication
  await requirePlatformAdmin();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link href="/platform-admin/announcements">
          <Button variant="ghost" size="sm" className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Announcements
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Create Announcement</h1>
        <p className="text-slate-400">
          Create a new platform-wide announcement to display to all tenants
        </p>
      </div>
      <AnnouncementForm mode="create" />
    </div>
  );
}
