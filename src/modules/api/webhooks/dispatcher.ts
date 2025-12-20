/**
 * Webhook Dispatcher
 *
 * Story 15.5 - FR148: Webhook delivery with HMAC-SHA256 signatures
 *
 * Dispatches events to matching active subscriptions via Inngest queue.
 * Uses deterministic key derivation for signing (secrets are bcrypt-hashed).
 */

import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { webhookDeliveries } from "@/db/schema/webhook-deliveries";
import type { WebhookEventType } from "@/db/schema/webhook-subscriptions";
import { webhookSubscriptions } from "@/db/schema/webhook-subscriptions";
import { inngest } from "@/inngest/client";

/**
 * Server-side signing key for webhook HMAC signatures.
 * Story 15.4 stores bcrypt-hashed secrets (cannot be used for signing).
 * We derive per-subscription signing keys from this master key + subscription ID.
 */
const WEBHOOK_SIGNING_KEY =
  process.env.WEBHOOK_SIGNING_KEY || "dev-webhook-key-change-in-prod";

/**
 * Webhook event payload structure
 */
export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  tenantId: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Derive signing key from server secret + subscription ID
 * This provides unique per-subscription signatures without storing plaintext secrets.
 */
export function deriveSigningKey(subscriptionId: string): string {
  return crypto
    .createHmac("sha256", WEBHOOK_SIGNING_KEY)
    .update(subscriptionId)
    .digest("hex");
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 * Format: t={timestamp},v1={signature}
 *
 * @param payload - JSON stringified payload
 * @param secret - Signing key (derived from subscription ID)
 * @param timestamp - Unix timestamp in seconds
 * @returns Signature string in format "t={ts},v1={hex}"
 */
export function signWebhookPayload(
  payload: string,
  secret: string,
  timestamp: number,
): string {
  const signaturePayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signaturePayload)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Verify webhook signature (utility for receivers)
 *
 * @param payload - Raw request body
 * @param signature - X-Webhook-Signature header value
 * @param secret - Webhook secret (from subscription creation)
 * @param toleranceSeconds - Max age of signature in seconds (default 5 min)
 * @returns true if signature is valid and not expired
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  toleranceSeconds = 300,
): boolean {
  const parts = signature.split(",");
  const timestampPart = parts.find((p) => p.startsWith("t="));
  const signaturePart = parts.find((p) => p.startsWith("v1="));

  if (!timestampPart || !signaturePart) {
    return false;
  }

  const timestamp = parseInt(timestampPart.slice(2), 10);
  const receivedSig = signaturePart.slice(3);

  // Check timestamp tolerance (prevent replay attacks)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return false;
  }

  // Compute expected signature
  const signaturePayload = `${timestamp}.${payload}`;
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(signaturePayload)
    .digest("hex");

  // Timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(receivedSig),
    Buffer.from(expectedSig),
  );
}

/**
 * Dispatch an event to all matching active subscriptions.
 * Creates delivery records and queues Inngest jobs for reliable delivery.
 *
 * This is fire-and-forget - errors do not propagate to caller.
 *
 * @param event - Webhook event to dispatch
 * @returns Number of subscriptions that will receive the event
 */
export async function dispatchWebhookEvent(
  event: WebhookEvent,
): Promise<number> {
  // Find all active subscriptions for this tenant
  const subscriptions = await db.query.webhookSubscriptions.findMany({
    where: and(
      eq(webhookSubscriptions.tenantId, event.tenantId),
      eq(webhookSubscriptions.isActive, true),
    ),
  });

  // Filter to subscriptions that include this event type
  const matchingSubscriptions = subscriptions.filter((sub) =>
    (sub.events as string[]).includes(event.type),
  );

  if (matchingSubscriptions.length === 0) {
    return 0;
  }

  // Build the event payload
  const payload = {
    id: event.id,
    type: event.type,
    created_at: event.timestamp.toISOString(),
    data: event.data,
  };
  const payloadJson = JSON.stringify(payload);

  // Create delivery records and queue Inngest jobs
  for (const subscription of matchingSubscriptions) {
    const deliveryId = crypto.randomUUID();

    // Create pending delivery record
    await db.insert(webhookDeliveries).values({
      id: deliveryId,
      tenantId: event.tenantId,
      subscriptionId: subscription.id,
      eventId: event.id,
      eventType: event.type,
      status: "pending",
      payload: payloadJson,
    });

    // Queue Inngest job for delivery
    await inngest.send({
      name: "webhook/deliver",
      data: {
        deliveryId,
        subscriptionId: subscription.id,
        tenantId: event.tenantId,
        url: subscription.url,
        payload: payloadJson,
        eventId: event.id,
        eventType: event.type,
      },
    });
  }

  return matchingSubscriptions.length;
}

/**
 * Helper functions for common webhook events.
 * All are fire-and-forget - catch any errors silently.
 */
export const webhookEvents = {
  /**
   * Dispatch title.created event
   */
  titleCreated: (
    tenantId: string,
    title: { id: string; title: string; isbn?: string | null },
  ) =>
    dispatchWebhookEvent({
      id: crypto.randomUUID(),
      type: "title.created",
      tenantId,
      data: {
        title_id: title.id,
        title: title.title,
        isbn: title.isbn,
      },
      timestamp: new Date(),
    }),

  /**
   * Dispatch title.updated event
   */
  titleUpdated: (
    tenantId: string,
    title: { id: string; title: string; changes: string[] },
  ) =>
    dispatchWebhookEvent({
      id: crypto.randomUUID(),
      type: "title.updated",
      tenantId,
      data: {
        title_id: title.id,
        title: title.title,
        changed_fields: title.changes,
      },
      timestamp: new Date(),
    }),

  /**
   * Dispatch sale.created event
   */
  saleCreated: (
    tenantId: string,
    sale: { id: string; titleId: string; quantity: number; amount: string },
  ) =>
    dispatchWebhookEvent({
      id: crypto.randomUUID(),
      type: "sale.created",
      tenantId,
      data: {
        sale_id: sale.id,
        title_id: sale.titleId,
        quantity: sale.quantity,
        amount: sale.amount,
      },
      timestamp: new Date(),
    }),

  /**
   * Dispatch statement.generated event
   */
  statementGenerated: (
    tenantId: string,
    stmt: {
      id: string;
      authorId: string;
      periodStart: string;
      periodEnd: string;
    },
  ) =>
    dispatchWebhookEvent({
      id: crypto.randomUUID(),
      type: "statement.generated",
      tenantId,
      data: {
        statement_id: stmt.id,
        author_id: stmt.authorId,
        period_start: stmt.periodStart,
        period_end: stmt.periodEnd,
      },
      timestamp: new Date(),
    }),

  /**
   * Dispatch onix.exported event
   */
  onixExported: (
    tenantId: string,
    exp: {
      id: string;
      channel?: string;
      format: string;
      titleCount: number;
      fileName?: string;
    },
  ) =>
    dispatchWebhookEvent({
      id: crypto.randomUUID(),
      type: "onix.exported",
      tenantId,
      data: {
        export_id: exp.id,
        channel: exp.channel,
        format: exp.format,
        title_count: exp.titleCount,
        file_name: exp.fileName,
      },
      timestamp: new Date(),
    }),
};
