/**
 * Platform Announcements Query Functions
 *
 * Story 13.8: Implement Platform-Wide Announcements
 *
 * Query functions for retrieving platform announcements.
 * Uses adminDb since announcements are platform-level (not tenant-scoped).
 */

import { and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { adminDb } from "@/db";
import { platformAnnouncements } from "@/db/schema/platform-announcements";
import type { ActiveAnnouncement, PlatformAnnouncement } from "./types";

/**
 * Get active announcements for banner display
 * Story 13.8: Implement Platform-Wide Announcements (AC: 2, 7)
 *
 * Retrieves announcements that are:
 * - Active (is_active = true)
 * - Currently within date range (starts_at <= now AND (ends_at IS NULL OR ends_at > now))
 * - Optionally filtered by target_roles
 *
 * @param userRole - Optional role to filter by target_roles
 * @returns Active announcements ordered by type priority (critical > warning > info)
 */
export async function getActiveAnnouncements(
  userRole?: string,
): Promise<ActiveAnnouncement[]> {
  const now = new Date();

  const results = await adminDb
    .select({
      id: platformAnnouncements.id,
      message: platformAnnouncements.message,
      type: platformAnnouncements.type,
      targetRoles: platformAnnouncements.target_roles,
    })
    .from(platformAnnouncements)
    .where(
      and(
        eq(platformAnnouncements.is_active, true),
        lte(platformAnnouncements.starts_at, now),
        or(
          isNull(platformAnnouncements.ends_at),
          gte(platformAnnouncements.ends_at, now),
        ),
      ),
    )
    .orderBy(
      // Order by type priority: critical (0), warning (1), info (2)
      sql`CASE ${platformAnnouncements.type}
        WHEN 'critical' THEN 0
        WHEN 'warning' THEN 1
        WHEN 'info' THEN 2
        ELSE 3
      END`,
      desc(platformAnnouncements.starts_at),
    );

  // Filter by role if provided
  return results.filter((a) => {
    if (!a.targetRoles || a.targetRoles.length === 0) {
      return true; // No target = all users
    }
    if (!userRole) {
      return true; // No role filter = show all
    }
    return a.targetRoles.includes(userRole);
  }) as ActiveAnnouncement[];
}

/**
 * Get all announcements for management view
 * Story 13.8: Implement Platform-Wide Announcements (AC: 5)
 *
 * @param options.includeInactive - Whether to include inactive announcements (default: true for management)
 * @returns All announcements ordered by created_at desc
 */
export async function getAllAnnouncements(options?: {
  includeInactive?: boolean;
}): Promise<PlatformAnnouncement[]> {
  // Default to including inactive for management view
  const includeInactive = options?.includeInactive ?? true;

  const conditions = includeInactive
    ? undefined
    : eq(platformAnnouncements.is_active, true);

  const results = await adminDb
    .select()
    .from(platformAnnouncements)
    .where(conditions)
    .orderBy(desc(platformAnnouncements.created_at));

  return results.map((r) => ({
    id: r.id,
    message: r.message,
    type: r.type as "info" | "warning" | "critical",
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    targetRoles: r.target_roles,
    isActive: r.is_active,
    createdAt: r.created_at,
    createdByAdminEmail: r.created_by_admin_email,
    updatedAt: r.updated_at,
    updatedByAdminEmail: r.updated_by_admin_email,
  }));
}

/**
 * Get single announcement by ID
 * Story 13.8: Implement Platform-Wide Announcements (AC: 6)
 *
 * @param id - Announcement UUID
 * @returns Announcement or null if not found
 */
export async function getAnnouncementById(
  id: string,
): Promise<PlatformAnnouncement | null> {
  const results = await adminDb
    .select()
    .from(platformAnnouncements)
    .where(eq(platformAnnouncements.id, id))
    .limit(1);

  if (results.length === 0) return null;

  const r = results[0];
  return {
    id: r.id,
    message: r.message,
    type: r.type as "info" | "warning" | "critical",
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    targetRoles: r.target_roles,
    isActive: r.is_active,
    createdAt: r.created_at,
    createdByAdminEmail: r.created_by_admin_email,
    updatedAt: r.updated_at,
    updatedByAdminEmail: r.updated_by_admin_email,
  };
}
