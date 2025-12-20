/**
 * Notifications module service functions
 * Story 20.2: Build Notifications Center
 * Story 20.3: Configure Notification Preferences
 *
 * These functions create notifications for various system events.
 * They are called from HTTP context (Server Actions, API routes).
 * AC 20.3.5: Notifications respect user preference settings.
 */

import { notifications } from "@/db/schema/notifications";
import { getDb } from "@/lib/auth";
import { sendNotificationEmail } from "./email/notification-email-service";
import { getEffectiveUserPreference } from "./preferences/queries";
import {
  type AnnouncementNotificationInput,
  announcementNotificationSchema,
  type FeedNotificationInput,
  feedNotificationSchema,
  type ImportCompleteNotificationInput,
  importCompleteNotificationSchema,
  type LowIsbnNotificationInput,
  lowIsbnNotificationSchema,
  type ReturnNotificationInput,
  returnNotificationSchema,
} from "./schema";
import type {
  FeedNotificationMetadata,
  ImportNotificationMetadata,
  IsbnNotificationMetadata,
  NotificationType,
  ReturnNotificationMetadata,
} from "./types";

/**
 * Options for user-specific notification creation
 */
interface UserNotificationOptions {
  userId?: string;
  userEmail?: string;
  userName?: string;
}

/**
 * Create a feed success or failure notification
 * AC 20.2.6, 20.2.7: Feed notifications for ONIX/channel operations
 * AC 20.3.5: Respects user notification preferences
 */
export async function createFeedNotification(
  input: FeedNotificationInput,
  options?: UserNotificationOptions,
): Promise<string | null> {
  const validated = feedNotificationSchema.parse(input);
  const db = await getDb();

  const type: NotificationType = validated.success
    ? "feed_success"
    : "feed_failed";
  const title = validated.success
    ? `${validated.channel} feed sent successfully`
    : `${validated.channel} feed failed`;
  const description = validated.success
    ? `${validated.productCount} products sent to ${validated.channel}`
    : validated.errorMessage || `Feed to ${validated.channel} failed`;
  const link = `/settings/integrations?feedId=${validated.feedId}`;

  // Check user preferences if userId provided (HTTP context)
  let shouldCreateInApp = true;
  let shouldSendEmail = false;
  if (options?.userId) {
    const prefs = await getEffectiveUserPreference(options.userId, type);
    shouldCreateInApp = prefs.inApp;
    shouldSendEmail = prefs.email && !!options.userEmail;
  }

  const metadata = {
    feedId: validated.feedId,
    channel: validated.channel,
    productCount: validated.productCount,
    ...(validated.errorMessage && { errorMessage: validated.errorMessage }),
  } satisfies FeedNotificationMetadata;

  let notificationId: string | null = null;

  // Create in-app notification if enabled
  if (shouldCreateInApp) {
    const [notification] = await db
      .insert(notifications)
      .values({
        tenantId: validated.tenantId,
        userId: options?.userId || null,
        type,
        title,
        description,
        link,
        metadata: metadata as Record<string, unknown>,
      })
      .returning();
    notificationId = notification.id;
  }

  // Send email notification if enabled
  if (shouldSendEmail && options?.userEmail) {
    await sendNotificationEmail({
      to: options.userEmail,
      title,
      description,
      link: `${process.env.NEXT_PUBLIC_APP_URL || ""}${link}`,
      recipientName: options.userName,
    });
  }

  return notificationId;
}

/**
 * Create a pending return notification
 * AC 20.2.8: Returns pending action notification
 * AC 20.3.5: Respects user notification preferences
 */
export async function createReturnNotification(
  input: ReturnNotificationInput,
  options?: UserNotificationOptions,
): Promise<string | null> {
  const validated = returnNotificationSchema.parse(input);
  const db = await getDb();

  const type: NotificationType = "action_pending_return";
  const title = "Return pending action";
  const description = `Return ${validated.returnNumber} requires your attention`;
  const link = `/returns/${validated.returnId}`;

  // Check user preferences if userId provided (HTTP context)
  let shouldCreateInApp = true;
  let shouldSendEmail = false;
  if (options?.userId) {
    const prefs = await getEffectiveUserPreference(options.userId, type);
    shouldCreateInApp = prefs.inApp;
    shouldSendEmail = prefs.email && !!options.userEmail;
  }

  const metadata = {
    returnId: validated.returnId,
    returnNumber: validated.returnNumber,
  } satisfies ReturnNotificationMetadata;

  let notificationId: string | null = null;

  if (shouldCreateInApp) {
    const [notification] = await db
      .insert(notifications)
      .values({
        tenantId: validated.tenantId,
        userId: options?.userId || null,
        type,
        title,
        description,
        link,
        metadata: metadata as Record<string, unknown>,
      })
      .returning();
    notificationId = notification.id;
  }

  if (shouldSendEmail && options?.userEmail) {
    await sendNotificationEmail({
      to: options.userEmail,
      title,
      description,
      link: `${process.env.NEXT_PUBLIC_APP_URL || ""}${link}`,
      recipientName: options.userName,
    });
  }

  return notificationId;
}

/**
 * Create a low ISBN pool notification
 * AC 20.2.8: ISBN threshold alert notification
 * AC 20.3.5: Respects user notification preferences
 */
export async function createLowIsbnNotification(
  input: LowIsbnNotificationInput,
  options?: UserNotificationOptions,
): Promise<string | null> {
  const validated = lowIsbnNotificationSchema.parse(input);
  const db = await getDb();

  const type: NotificationType = "action_low_isbn";
  const title = "Low ISBN inventory";
  const description = `Only ${validated.currentCount} ISBNs remaining (threshold: ${validated.threshold})`;
  const link = "/settings/isbn";

  // Check user preferences if userId provided (HTTP context)
  let shouldCreateInApp = true;
  let shouldSendEmail = false;
  if (options?.userId) {
    const prefs = await getEffectiveUserPreference(options.userId, type);
    shouldCreateInApp = prefs.inApp;
    shouldSendEmail = prefs.email && !!options.userEmail;
  }

  const metadata = {
    threshold: validated.threshold,
    currentCount: validated.currentCount,
  } satisfies IsbnNotificationMetadata;

  let notificationId: string | null = null;

  if (shouldCreateInApp) {
    const [notification] = await db
      .insert(notifications)
      .values({
        tenantId: validated.tenantId,
        userId: options?.userId || null,
        type,
        title,
        description,
        link,
        metadata: metadata as Record<string, unknown>,
      })
      .returning();
    notificationId = notification.id;
  }

  if (shouldSendEmail && options?.userEmail) {
    await sendNotificationEmail({
      to: options.userEmail,
      title,
      description,
      link: `${process.env.NEXT_PUBLIC_APP_URL || ""}${link}`,
      recipientName: options.userName,
    });
  }

  return notificationId;
}

/**
 * Create an import complete notification
 * AC 20.2.6: Import completion notification
 * AC 20.3.5: Respects user notification preferences
 */
export async function createImportCompleteNotification(
  input: ImportCompleteNotificationInput,
  options?: UserNotificationOptions,
): Promise<string | null> {
  const validated = importCompleteNotificationSchema.parse(input);
  const db = await getDb();

  const type: NotificationType = "import_complete";
  const title = "Import complete";
  const description = validated.filename
    ? `${validated.recordCount} records imported from ${validated.filename}`
    : `${validated.recordCount} records imported successfully`;
  const link = `/titles/import?importId=${validated.importId}`;

  // Check user preferences if userId provided (HTTP context)
  let shouldCreateInApp = true;
  let shouldSendEmail = false;
  if (options?.userId) {
    const prefs = await getEffectiveUserPreference(options.userId, type);
    shouldCreateInApp = prefs.inApp;
    shouldSendEmail = prefs.email && !!options.userEmail;
  }

  const metadata = {
    importId: validated.importId,
    recordCount: validated.recordCount,
    ...(validated.filename && { filename: validated.filename }),
  } satisfies ImportNotificationMetadata;

  let notificationId: string | null = null;

  if (shouldCreateInApp) {
    const [notification] = await db
      .insert(notifications)
      .values({
        tenantId: validated.tenantId,
        userId: options?.userId || null,
        type,
        title,
        description,
        link,
        metadata: metadata as Record<string, unknown>,
      })
      .returning();
    notificationId = notification.id;
  }

  if (shouldSendEmail && options?.userEmail) {
    await sendNotificationEmail({
      to: options.userEmail,
      title,
      description,
      link: `${process.env.NEXT_PUBLIC_APP_URL || ""}${link}`,
      recipientName: options.userName,
    });
  }

  return notificationId;
}

/**
 * Create a system announcement notification
 * AC 20.2.9: System-wide announcements (tenant-wide, no userId)
 *
 * NOTE: System announcements intentionally bypass user preferences.
 * They are critical platform-wide messages that all users should see.
 * Email delivery for announcements should use a separate admin workflow.
 */
export async function createAnnouncementNotification(
  input: AnnouncementNotificationInput,
): Promise<string> {
  const validated = announcementNotificationSchema.parse(input);
  const db = await getDb();

  const [notification] = await db
    .insert(notifications)
    .values({
      tenantId: validated.tenantId,
      userId: null, // Tenant-wide notification
      type: "system_announcement",
      title: validated.title,
      description: validated.description || null,
      link: validated.link || null,
      metadata: null,
    })
    .returning();

  return notification.id;
}
