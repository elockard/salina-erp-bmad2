/**
 * Notifications module queries
 * Story 20.2: Build Notifications Center
 * Story 20.3: Configure Notification Preferences
 */

import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import type { NotificationType } from "@/db/schema/notifications";
import { notifications } from "@/db/schema/notifications";
import { getCurrentTenantId, getCurrentUser, getDb } from "@/lib/auth";
import { getDefaultPreference } from "./constants";
import { getUserInAppPreferencesMap } from "./preferences/queries";
import type { Notification, NotificationsResponse } from "./types";

/**
 * Get notifications for the current user
 * Returns both user-specific and tenant-wide notifications
 * AC 20.2.2, 20.2.3: Notification panel display
 * AC 20.3.7: Filters tenant-wide notifications by user in-app preference
 */
export async function getNotifications(
  limit = 50,
): Promise<NotificationsResponse> {
  const tenantId = await getCurrentTenantId();
  const user = await getCurrentUser();
  const userId = user?.id;
  const db = await getDb();

  const results = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.tenantId, tenantId),
        or(
          isNull(notifications.userId),
          userId
            ? eq(notifications.userId, userId)
            : isNull(notifications.userId),
        ),
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  // Filter tenant-wide notifications by user in-app preference
  // AC 20.3.7: Only show notifications user has enabled
  // Batch-load preferences to avoid N+1 queries
  const preferencesMap = userId
    ? await getUserInAppPreferencesMap(userId)
    : null;

  const filteredResults: typeof results = [];
  for (const n of results) {
    // User-specific notifications are always included
    if (n.userId !== null) {
      filteredResults.push(n);
      continue;
    }
    // For tenant-wide notifications, check user preference from batch-loaded map
    if (preferencesMap) {
      const type = n.type as NotificationType;
      // Use preference from map, or fall back to default if not in map
      const enabled =
        preferencesMap.get(type) ?? getDefaultPreference(type).defaultInApp;
      if (enabled) {
        filteredResults.push(n);
      }
    } else {
      // No user context - include all tenant-wide notifications
      filteredResults.push(n);
    }
  }

  const notificationList: Notification[] = filteredResults.map((n) => ({
    ...n,
    isRead: n.readAt !== null,
  }));

  const unreadCount = notificationList.filter((n) => !n.isRead).length;

  return {
    notifications: notificationList,
    unreadCount,
    totalCount: notificationList.length,
  };
}

/**
 * Get unread notification count for the current user
 * AC 20.2.1: Badge count on bell icon
 * AC 20.3.7: Filters tenant-wide notifications by user in-app preference
 */
export async function getUnreadCount(): Promise<number> {
  const tenantId = await getCurrentTenantId();
  const user = await getCurrentUser();
  const userId = user?.id;
  const db = await getDb();

  const results = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.tenantId, tenantId),
        or(
          isNull(notifications.userId),
          userId
            ? eq(notifications.userId, userId)
            : isNull(notifications.userId),
        ),
        isNull(notifications.readAt),
      ),
    );

  // Filter tenant-wide notifications by user in-app preference
  // Batch-load preferences to avoid N+1 queries
  const preferencesMap = userId
    ? await getUserInAppPreferencesMap(userId)
    : null;

  let count = 0;
  for (const n of results) {
    if (n.userId !== null) {
      count++;
      continue;
    }
    if (preferencesMap) {
      const type = n.type as NotificationType;
      const enabled =
        preferencesMap.get(type) ?? getDefaultPreference(type).defaultInApp;
      if (enabled) {
        count++;
      }
    } else {
      count++;
    }
  }

  return count;
}

/**
 * Get a single notification by ID
 * Used for navigation after clicking a notification
 */
export async function getNotificationById(
  notificationId: string,
): Promise<Notification | null> {
  const tenantId = await getCurrentTenantId();
  const user = await getCurrentUser();
  const userId = user?.id;
  const db = await getDb();

  const result = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.tenantId, tenantId),
        or(
          isNull(notifications.userId),
          userId
            ? eq(notifications.userId, userId)
            : isNull(notifications.userId),
        ),
      ),
    )
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return {
    ...result[0],
    isRead: result[0].readAt !== null,
  };
}

/**
 * Check if a notification of a specific type was created recently
 * Used for deduplication to avoid spamming notifications
 * @param type - The notification type to check
 * @param hoursAgo - How far back to look (default 24 hours)
 */
export async function hasRecentNotificationOfType(
  type: NotificationType,
  hoursAgo = 24,
): Promise<boolean> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - hoursAgo);

  const result = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.tenantId, tenantId),
        eq(notifications.type, type),
        gt(notifications.createdAt, cutoff),
      ),
    )
    .limit(1);

  return result.length > 0;
}
