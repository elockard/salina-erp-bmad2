/**
 * Notification Email Service
 *
 * Story 20.3 - FR178: Configure Notification Preferences
 *
 * Service for sending notification emails via Resend.
 * AC 20.3.6: Email delivery based on preferences.
 */

import { getDefaultFromEmail, sendEmail } from "@/lib/email";
import {
  type NotificationEmailProps,
  renderNotificationEmail,
} from "./notification-email-template";

/**
 * Input for sending a notification email
 */
export interface SendNotificationEmailInput {
  /** Recipient email address */
  to: string;
  /** Notification title */
  title: string;
  /** Notification description */
  description: string;
  /** Optional deep link URL */
  link?: string;
  /** Optional link button text */
  linkText?: string;
  /** Optional recipient name for greeting */
  recipientName?: string;
  /** Optional publisher/tenant name */
  publisherName?: string;
}

/**
 * Result of sending a notification email
 */
export interface SendNotificationEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a notification email
 *
 * AC 20.3.6: Sends email via Resend if email preference is enabled.
 */
export async function sendNotificationEmail(
  input: SendNotificationEmailInput,
): Promise<SendNotificationEmailResult> {
  try {
    const emailProps: NotificationEmailProps = {
      title: input.title,
      description: input.description,
      link: input.link,
      linkText: input.linkText,
      recipientName: input.recipientName,
      publisherName: input.publisherName,
    };

    const html = await renderNotificationEmail(emailProps);

    const result = await sendEmail({
      from: getDefaultFromEmail(),
      to: input.to,
      subject: input.title,
      html,
      tags: [{ name: "type", value: "notification" }],
    });

    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown email error";
    console.error("[NotificationEmail] Send failed:", message);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Send notification emails to multiple recipients (batch)
 *
 * Limits emails per batch to avoid rate limiting.
 * Batch size configurable via NOTIFICATION_EMAIL_BATCH_SIZE env var (default: 10).
 * Used by Inngest jobs for tenant-wide notifications.
 *
 * NOTE: Emails beyond the batch limit are NOT sent. For high-volume scenarios,
 * consider implementing a queue-based approach with Inngest.
 */
export async function sendNotificationEmailBatch(
  inputs: SendNotificationEmailInput[],
): Promise<{
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
}> {
  const MAX_BATCH_SIZE = parseInt(
    process.env.NOTIFICATION_EMAIL_BATCH_SIZE || "10",
    10,
  );
  const batch = inputs.slice(0, MAX_BATCH_SIZE);
  const skipped = Math.max(0, inputs.length - MAX_BATCH_SIZE);

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const input of batch) {
    const result = await sendNotificationEmail(input);
    if (result.success) {
      sent++;
    } else {
      failed++;
      if (result.error) {
        errors.push(`${input.to}: ${result.error}`);
      }
    }
  }

  if (skipped > 0) {
    const skippedEmails = inputs.slice(MAX_BATCH_SIZE).map((i) => i.to);
    console.warn(
      `[NotificationEmail] Batch limited to ${MAX_BATCH_SIZE} emails. ` +
        `${skipped} emails skipped: ${skippedEmails.join(", ")}`,
    );
    errors.push(
      `Batch limit reached: ${skipped} recipients did not receive email`,
    );
  }

  return { sent, failed, skipped, errors };
}
