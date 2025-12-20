/**
 * Notification helpers for Inngest jobs
 * Story 20.2: Build Notifications Center
 * Story 20.3: Configure Notification Preferences
 *
 * These functions create notifications using adminDb since
 * Inngest jobs run outside HTTP request context (no JWT/RLS).
 * AC 20.3.6: Sends emails to users with email preference enabled.
 */

import { adminDb } from "@/db";
import type { NotificationType } from "@/db/schema/notifications";
import { notifications } from "@/db/schema/notifications";
import { sendNotificationEmailBatch } from "@/modules/notifications/email/notification-email-service";
import { getUsersWithEmailPreference } from "@/modules/notifications/preferences/queries";

/**
 * Create a feed notification (success or failure)
 * AC 20.2.6, 20.2.7: Feed completion notifications
 * AC 20.3.6: Sends emails to users with email preference enabled
 */
export async function createFeedNotificationAdmin(
  tenantId: string,
  options: {
    success: boolean;
    channel: string;
    productCount: number;
    feedId: string;
    errorMessage?: string;
  },
): Promise<void> {
  const { success, channel, productCount, feedId, errorMessage } = options;

  const type: NotificationType = success ? "feed_success" : "feed_failed";
  const title = success
    ? `${channel} feed sent successfully`
    : `${channel} feed failed`;
  const description = success
    ? `${productCount} products sent to ${channel}`
    : errorMessage || `Feed to ${channel} failed`;
  const link = `/settings/integrations?feedId=${feedId}`;

  // Create tenant-wide in-app notification (userId=null)
  await adminDb.insert(notifications).values({
    tenantId,
    userId: null,
    type,
    title,
    description,
    link,
    metadata: {
      feedId,
      channel,
      productCount,
      ...(errorMessage && { errorMessage }),
    },
  });

  // Send emails to users with email preference enabled for this type
  const usersWithEmail = await getUsersWithEmailPreference(tenantId, type);
  if (usersWithEmail.length > 0) {
    await sendNotificationEmailBatch(
      usersWithEmail.map((user) => ({
        to: user.email,
        title,
        description,
        link: `${process.env.NEXT_PUBLIC_APP_URL || ""}${link}`,
      })),
    );
  }
}

/**
 * Create an import complete notification
 * AC 20.2.6: Import completion notification
 * AC 20.3.6: Sends emails to users with email preference enabled
 */
export async function createImportNotificationAdmin(
  tenantId: string,
  options: {
    importId: string;
    recordCount: number;
    filename?: string;
  },
): Promise<void> {
  const { importId, recordCount, filename } = options;

  const type: NotificationType = "import_complete";
  const title = "Import complete";
  const description = filename
    ? `${recordCount} records imported from ${filename}`
    : `${recordCount} records imported successfully`;
  const link = `/titles/import?importId=${importId}`;

  // Create tenant-wide in-app notification (userId=null)
  await adminDb.insert(notifications).values({
    tenantId,
    userId: null,
    type,
    title,
    description,
    link,
    metadata: {
      importId,
      recordCount,
      ...(filename && { filename }),
    },
  });

  // Send emails to users with email preference enabled for this type
  const usersWithEmail = await getUsersWithEmailPreference(tenantId, type);
  if (usersWithEmail.length > 0) {
    await sendNotificationEmailBatch(
      usersWithEmail.map((user) => ({
        to: user.email,
        title,
        description,
        link: `${process.env.NEXT_PUBLIC_APP_URL || ""}${link}`,
      })),
    );
  }
}

/**
 * Create a low ISBN notification
 * AC 20.2.8: ISBN threshold alert
 * AC 20.3.6: Sends emails to users with email preference enabled
 */
export async function createLowIsbnNotificationAdmin(
  tenantId: string,
  options: {
    threshold: number;
    currentCount: number;
  },
): Promise<void> {
  const { threshold, currentCount } = options;

  const type: NotificationType = "action_low_isbn";
  const title = "Low ISBN inventory";
  const description = `Only ${currentCount} ISBNs remaining (threshold: ${threshold})`;
  const link = "/settings/isbn";

  // Create tenant-wide in-app notification (userId=null)
  await adminDb.insert(notifications).values({
    tenantId,
    userId: null,
    type,
    title,
    description,
    link,
    metadata: {
      threshold,
      currentCount,
    },
  });

  // Send emails to users with email preference enabled for this type
  const usersWithEmail = await getUsersWithEmailPreference(tenantId, type);
  if (usersWithEmail.length > 0) {
    await sendNotificationEmailBatch(
      usersWithEmail.map((user) => ({
        to: user.email,
        title,
        description,
        link: `${process.env.NEXT_PUBLIC_APP_URL || ""}${link}`,
      })),
    );
  }
}
