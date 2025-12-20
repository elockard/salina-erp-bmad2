/**
 * Inngest: Notification Cleanup Background Job
 *
 * Story 20.2 - Build Notifications Center
 * AC 20.2.10: Notification Retention - 30 day retention
 *
 * Runs daily at 2:00 AM to delete old read notifications.
 * Only deletes notifications that have been read and are older than 30 days.
 * Unread notifications are never deleted regardless of age.
 *
 * Note: Uses adminDb because Inngest jobs run outside HTTP request context.
 */

import { and, isNotNull, lt } from "drizzle-orm";
import { adminDb } from "@/db";
import { notifications } from "@/db/schema/notifications";
import { inngest } from "./client";

/**
 * Default retention period in days
 */
const RETENTION_DAYS = 30;

/**
 * Notification Cleanup Job
 *
 * Scheduled to run daily at 2:00 AM UTC.
 * Deletes read notifications older than the retention period.
 */
export const notificationCleanup = inngest.createFunction(
  {
    id: "notification-cleanup",
    retries: 2,
  },
  { cron: "0 2 * * *" }, // Daily at 2:00 AM UTC
  async ({ step }) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    // Delete old read notifications
    const result = await step.run("delete-old-notifications", async () => {
      const deleted = await adminDb
        .delete(notifications)
        .where(
          and(
            isNotNull(notifications.readAt),
            lt(notifications.readAt, cutoffDate),
          ),
        )
        .returning({ id: notifications.id });

      return deleted.length;
    });

    console.log(
      `[notification-cleanup] Deleted ${result} read notifications older than ${RETENTION_DAYS} days`,
    );

    return {
      success: true,
      deletedCount: result,
      cutoffDate: cutoffDate.toISOString(),
    };
  },
);
