"use server";

/**
 * Notifications module server actions
 * Story 20.2: Build Notifications Center
 */

import { and, eq, isNull, lt, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notifications } from "@/db/schema/notifications";
import { getCurrentTenantId, getCurrentUser, getDb } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";
import { getNotifications, getUnreadCount } from "./queries";
import { type MarkAsReadInput, markAsReadSchema } from "./schema";
import type {
  MarkAsReadResult,
  Notification,
  NotificationsResponse,
} from "./types";

/**
 * Get notifications for the current user (server action wrapper)
 * Used by TanStack Query for polling
 */
export async function fetchNotifications(): Promise<
  ActionResult<NotificationsResponse>
> {
  try {
    const result = await getNotifications();
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("fetchNotifications error:", error);
    return {
      success: false,
      error: "Failed to fetch notifications",
    };
  }
}

/**
 * Get unread count for the current user (server action wrapper)
 * Used for badge display
 */
export async function fetchUnreadCount(): Promise<ActionResult<number>> {
  try {
    const count = await getUnreadCount();
    return {
      success: true,
      data: count,
    };
  } catch (error) {
    console.error("fetchUnreadCount error:", error);
    return {
      success: false,
      error: "Failed to fetch unread count",
    };
  }
}

/**
 * Mark a single notification as read
 * AC 20.2.5: Mark as Read - individual notification
 */
export async function markNotificationAsRead(
  input: MarkAsReadInput,
): Promise<ActionResult<Notification>> {
  try {
    const validated = markAsReadSchema.parse(input);
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();
    const userId = user?.id;
    const db = await getDb();

    // Verify the notification belongs to this user/tenant
    const existing = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.id, validated.notificationId),
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

    if (existing.length === 0) {
      return {
        success: false,
        error: "Notification not found",
      };
    }

    // Already read, just return it
    if (existing[0].readAt !== null) {
      return {
        success: true,
        data: {
          ...existing[0],
          isRead: true,
        },
      };
    }

    // Mark as read
    const [updated] = await db
      .update(notifications)
      .set({
        readAt: new Date(),
      })
      .where(eq(notifications.id, validated.notificationId))
      .returning();

    revalidatePath("/dashboard");

    return {
      success: true,
      data: {
        ...updated,
        isRead: true,
      },
    };
  } catch (error) {
    console.error("markNotificationAsRead error:", error);
    return {
      success: false,
      error: "Failed to mark notification as read",
    };
  }
}

/**
 * Mark all notifications as read for the current user
 * AC 20.2.5: Mark as Read - "Mark All Read" button
 */
export async function markAllNotificationsAsRead(): Promise<
  ActionResult<MarkAsReadResult>
> {
  try {
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();
    const userId = user?.id;
    const db = await getDb();

    // Update all unread notifications for this user/tenant
    const result = await db
      .update(notifications)
      .set({
        readAt: new Date(),
      })
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
      )
      .returning();

    revalidatePath("/dashboard");

    return {
      success: true,
      data: {
        success: true,
        markedCount: result.length,
      },
    };
  } catch (error) {
    console.error("markAllNotificationsAsRead error:", error);
    return {
      success: false,
      error: "Failed to mark all notifications as read",
    };
  }
}

/**
 * Delete old read notifications (cleanup job helper)
 * AC 20.2.10: Notification Retention - 30 day retention
 */
export async function deleteOldNotifications(
  daysOld = 30,
): Promise<ActionResult<number>> {
  try {
    const db = await getDb();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Delete read notifications older than cutoff
    const result = await db
      .delete(notifications)
      .where(
        and(
          lt(notifications.readAt, cutoffDate),
          // Only delete read notifications (readAt is not null)
          // The lt() condition implicitly handles this
        ),
      )
      .returning();

    return {
      success: true,
      data: result.length,
    };
  } catch (error) {
    console.error("deleteOldNotifications error:", error);
    return {
      success: false,
      error: "Failed to delete old notifications",
    };
  }
}
