/**
 * Edit Announcement Page
 *
 * Story 13.8: Implement Platform-Wide Announcements
 * AC: 6 - Edit or deactivate announcements
 *
 * Server component that fetches the announcement and passes to form component.
 */

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { getAnnouncementById } from "@/modules/platform-admin/announcements";
import { AnnouncementForm } from "@/modules/platform-admin/components/announcement-form";
import { DeactivateButton } from "./deactivate-button";

export const metadata = {
  title: "Edit Announcement | Platform Admin",
  description: "Edit an existing platform announcement",
};

interface EditAnnouncementPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAnnouncementPage({
  params,
}: EditAnnouncementPageProps) {
  // Require platform admin authentication
  await requirePlatformAdmin();

  const { id } = await params;

  // Fetch the announcement
  const announcement = await getAnnouncementById(id);

  if (!announcement) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link href="/platform-admin/announcements">
          <Button variant="ghost" size="sm" className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Announcements
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Edit Announcement</h1>
            <p className="text-slate-400">
              Update this platform-wide announcement
            </p>
          </div>
          {announcement.isActive && (
            <DeactivateButton announcementId={announcement.id} />
          )}
        </div>
      </div>
      <AnnouncementForm mode="edit" announcement={announcement} />
    </div>
  );
}
