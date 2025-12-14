/**
 * Announcement Banner Wrapper (RSC)
 *
 * Story 13.8: Implement Platform-Wide Announcements (AC: 2)
 *
 * Server component that fetches active announcements and conditionally
 * renders the client-side AnnouncementBanner. Follows the pattern
 * established by ImpersonationBannerWrapper.
 */

import { getActiveAnnouncements } from "@/modules/platform-admin/announcements";
import { AnnouncementBanner } from "./announcement-banner";

interface AnnouncementBannerWrapperProps {
  /** User role for filtering targeted announcements */
  userRole?: string;
}

export async function AnnouncementBannerWrapper({
  userRole,
}: AnnouncementBannerWrapperProps) {
  // Get active announcements filtered by role
  const announcements = await getActiveAnnouncements(userRole);

  if (announcements.length === 0) {
    return null;
  }

  return <AnnouncementBanner announcements={announcements} />;
}
