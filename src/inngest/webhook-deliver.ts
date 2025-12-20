/**
 * Webhook Delivery Inngest Function
 *
 * Story 15.5 - FR148/FR149: Reliable webhook delivery with HMAC signatures
 *
 * Delivers webhooks with:
 * - HMAC-SHA256 signatures
 * - Exponential backoff retries (30s, 1m, 2m, 4m, 8m)
 * - onFailure callback for final failure handling
 * - Subscription stats updates
 * - Auto-disable after 10 consecutive failures
 *
 * Note: Uses adminDb because Inngest jobs run outside HTTP request context
 */

import { eq } from "drizzle-orm";
import { adminDb } from "@/db";
import { auditLogs } from "@/db/schema/audit-logs";
import { webhookDeliveries } from "@/db/schema/webhook-deliveries";
import { webhookSubscriptions } from "@/db/schema/webhook-subscriptions";
import {
  deriveSigningKey,
  signWebhookPayload,
} from "@/modules/api/webhooks/dispatcher";
import { inngest } from "./client";

const MAX_CONSECUTIVE_FAILURES = 10;
const DELIVERY_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Webhook delivery function with retry and onFailure handling
 */
export const webhookDeliver = inngest.createFunction(
  {
    id: "webhook-deliver",
    // AC4: 5 retries with Inngest's default exponential backoff (~15 min window)
    // Inngest v3 automatically applies exponential backoff for retries
    retries: 5,
    onFailure: async ({ event }) => {
      // Called after ALL retries exhausted - mark as final failure
      // Note: Inngest's onFailure event types require explicit casting through unknown
      const { deliveryId, subscriptionId, tenantId } =
        event.data as unknown as {
          deliveryId: string;
          subscriptionId: string;
          tenantId: string;
        };
      const now = new Date();

      // Mark delivery as failed
      await adminDb
        .update(webhookDeliveries)
        .set({
          status: "failed",
          errorMessage: "All retry attempts exhausted",
        })
        .where(eq(webhookDeliveries.id, deliveryId));

      // Get subscription to update stats
      const sub = await adminDb.query.webhookSubscriptions.findFirst({
        where: eq(webhookSubscriptions.id, subscriptionId),
      });
      if (!sub) return;

      const newFailures = (sub.consecutiveFailures ?? 0) + 1;
      const shouldDisable = newFailures >= MAX_CONSECUTIVE_FAILURES;

      // Update subscription stats
      await adminDb
        .update(webhookSubscriptions)
        .set({
          lastDeliveryAt: now,
          lastDeliveryStatus: "failed",
          consecutiveFailures: newFailures,
          isActive: shouldDisable ? false : sub.isActive,
          updatedAt: now,
        })
        .where(eq(webhookSubscriptions.id, subscriptionId));

      // Log auto-disable event to audit log
      if (shouldDisable) {
        await adminDb.insert(auditLogs).values({
          tenant_id: tenantId,
          user_id: null, // System action
          action_type: "UPDATE",
          resource_type: "webhook_subscription",
          resource_id: subscriptionId,
          changes: {
            before: { is_active: true, consecutive_failures: newFailures - 1 },
            after: { is_active: false, consecutive_failures: newFailures },
          },
          metadata: {
            reason: "webhook.auto_disabled",
            threshold: MAX_CONSECUTIVE_FAILURES,
            delivery_id: deliveryId,
          },
          status: "success",
        });
      }
    },
  },
  { event: "webhook/deliver" },
  async ({ event, step, attempt }) => {
    const { deliveryId, subscriptionId, url, payload } = event.data;

    // Get subscription to check if still active
    const subscription = await step.run("get-subscription", async () => {
      return adminDb.query.webhookSubscriptions.findFirst({
        where: eq(webhookSubscriptions.id, subscriptionId),
      });
    });

    // Subscription deleted or disabled - mark delivery as cancelled
    if (!subscription || !subscription.isActive) {
      await step.run("mark-cancelled", async () => {
        await adminDb
          .update(webhookDeliveries)
          .set({
            status: "failed",
            errorMessage: "Subscription not found or disabled",
            attemptCount: attempt,
          })
          .where(eq(webhookDeliveries.id, deliveryId));
      });
      return { status: "cancelled", reason: "subscription_unavailable" };
    }

    // Update attempt count
    await step.run("update-attempt", async () => {
      await adminDb
        .update(webhookDeliveries)
        .set({ attemptCount: attempt })
        .where(eq(webhookDeliveries.id, deliveryId));
    });

    // Deliver the webhook
    const result = await step.run("deliver", async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signingKey = deriveSigningKey(subscriptionId);
      const signature = signWebhookPayload(payload, signingKey, timestamp);
      const startTime = Date.now();

      try {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          DELIVERY_TIMEOUT_MS,
        );

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Salina-Webhook/1.0",
            "X-Webhook-Id": deliveryId,
            "X-Webhook-Timestamp": timestamp.toString(),
            "X-Webhook-Signature": signature,
          },
          body: payload,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        const durationMs = Date.now() - startTime;
        let responseBody: string | null = null;

        try {
          const text = await response.text();
          responseBody = text.slice(0, 1000); // First 1000 chars
        } catch {
          // Ignore response body read errors
        }

        return {
          success: response.ok,
          statusCode: response.status,
          responseBody,
          durationMs,
          error: response.ok ? null : `HTTP ${response.status}`,
        };
      } catch (error) {
        const durationMs = Date.now() - startTime;
        const message =
          error instanceof Error ? error.message : "Unknown error";
        const isTimeout = message.includes("abort");

        return {
          success: false,
          statusCode: null,
          responseBody: null,
          durationMs,
          error: isTimeout ? "Request timed out (30s)" : message,
        };
      }
    });

    if (result.success) {
      // Success! Update delivery and subscription stats
      await step.run("record-success", async () => {
        const now = new Date();

        // Update delivery record
        await adminDb
          .update(webhookDeliveries)
          .set({
            status: "delivered",
            responseStatusCode: result.statusCode,
            responseBody: result.responseBody,
            durationMs: result.durationMs,
            deliveredAt: now,
            attemptCount: attempt,
          })
          .where(eq(webhookDeliveries.id, deliveryId));

        // Update subscription stats - reset consecutive failures
        await adminDb
          .update(webhookSubscriptions)
          .set({
            lastDeliveryAt: now,
            lastDeliveryStatus: "success",
            consecutiveFailures: 0,
            updatedAt: now,
          })
          .where(eq(webhookSubscriptions.id, subscriptionId));
      });

      return { status: "delivered", statusCode: result.statusCode };
    }

    // Delivery failed - throw to trigger Inngest retry
    // onFailure handles final failure after all retries exhausted
    throw new Error(`Webhook delivery failed: ${result.error}`);
  },
);
