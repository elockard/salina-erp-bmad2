"use server";

/**
 * Webhook Server Actions
 *
 * Story 15.4 - Server actions for webhook management
 * Story 15.5 - Delivery history actions
 *
 * Security: All create/delete/secret-regenerate operations are audit logged
 */

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { adminDb } from "@/db";
import { auditLogs } from "@/db/schema/audit-logs";
import { webhookDeliveries } from "@/db/schema/webhook-deliveries";
import { getCurrentTenantId, getCurrentUser, getDb } from "@/lib/auth";
import * as service from "./subscription-service";

// Audit log helper for webhook security events
async function logWebhookEvent(
  tenantId: string,
  userId: string,
  action: string,
  resourceId: string,
  details?: Record<string, unknown>,
) {
  await adminDb.insert(auditLogs).values({
    tenant_id: tenantId,
    user_id: userId,
    action_type: action,
    resource_type: "webhook_subscription",
    resource_id: resourceId,
    metadata: details ? details : null,
  });
}

export interface WebhookSubscription {
  id: string;
  name: string;
  description?: string | null;
  url_domain: string;
  events: string[];
  is_active: boolean;
  last_delivery_at?: Date | null;
  last_delivery_status?: string | null;
  consecutive_failures: number;
  created_at: Date;
}

export async function listWebhooks(): Promise<{
  webhooks: WebhookSubscription[];
}> {
  const tenantId = await getCurrentTenantId();
  const subscriptions = await service.listSubscriptions(tenantId);

  return {
    webhooks: subscriptions.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      url_domain: new URL(s.url).hostname,
      events: s.events as string[],
      is_active: s.isActive,
      last_delivery_at: s.lastDeliveryAt,
      last_delivery_status: s.lastDeliveryStatus,
      consecutive_failures: s.consecutiveFailures,
      created_at: s.createdAt,
    })),
  };
}

export async function createWebhook(data: {
  name: string;
  description?: string;
  url: string;
  events: string[];
}): Promise<{ id: string; secret: string }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const result = await service.createSubscription({
    tenantId: user.tenant_id,
    name: data.name,
    description: data.description,
    url: data.url,
    events: data.events,
    createdBy: user.id,
  });

  // Audit log: webhook created (security event)
  await logWebhookEvent(
    user.tenant_id,
    user.id,
    "CREATE",
    result.subscription.id,
    {
      name: data.name,
      url_domain: new URL(data.url).hostname,
      events: data.events,
    },
  );

  revalidatePath("/settings/webhooks");

  return {
    id: result.subscription.id,
    secret: result.secret,
  };
}

export async function updateWebhook(
  id: string,
  data: {
    name?: string;
    description?: string;
    url?: string;
    events?: string[];
    is_active?: boolean;
  },
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // Get subscription before update for audit log
  const subscription = await service.getSubscription(id, user.tenant_id);

  await service.updateSubscription(id, user.tenant_id, {
    name: data.name,
    description: data.description,
    url: data.url,
    events: data.events,
    isActive: data.is_active,
  });

  // Audit log: webhook updated (track configuration changes)
  if (subscription) {
    await logWebhookEvent(user.tenant_id, user.id, "UPDATE", id, {
      name: subscription.name,
      changes: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.url !== undefined && { url_changed: true }),
        ...(data.events !== undefined && { events: data.events }),
        ...(data.is_active !== undefined && { is_active: data.is_active }),
      },
    });
  }

  revalidatePath("/settings/webhooks");
}

export async function deleteWebhook(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // Get subscription name before deletion for audit log
  const subscription = await service.getSubscription(id, user.tenant_id);

  await service.deleteSubscription(id, user.tenant_id);

  // Audit log: webhook deleted (security event)
  if (subscription) {
    await logWebhookEvent(user.tenant_id, user.id, "DELETE", id, {
      name: subscription.name,
    });
  }

  revalidatePath("/settings/webhooks");
}

export async function testWebhook(id: string): Promise<{
  success: boolean;
  status_code?: number;
  error?: string;
}> {
  const tenantId = await getCurrentTenantId();
  return service.testWebhook(id, tenantId);
}

export async function regenerateWebhookSecret(
  id: string,
): Promise<{ secret: string }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // Get subscription for audit log
  const subscription = await service.getSubscription(id, user.tenant_id);

  const result = await service.regenerateSecret(id, user.tenant_id);

  if (!result) {
    throw new Error("Webhook not found");
  }

  // Audit log: secret regenerated (security event - important for compliance)
  await logWebhookEvent(user.tenant_id, user.id, "UPDATE", id, {
    name: subscription?.name,
    action: "secret_regenerated",
  });

  return result;
}

/**
 * Webhook delivery record for history display
 * Story 15.5 - FR148/FR149
 */
export interface WebhookDelivery {
  id: string;
  eventId: string;
  eventType: string;
  status: string;
  responseStatusCode: number | null;
  errorMessage: string | null;
  attemptCount: number;
  maxAttempts: number;
  durationMs: number | null;
  deliveredAt: Date | null;
  createdAt: Date;
}

/**
 * Get delivery history for a webhook subscription
 *
 * Story 15.5 - AC8: View delivery history per subscription
 *
 * @param subscriptionId - Webhook subscription UUID
 * @param options - Filter options (status, limit)
 * @returns Array of delivery records, most recent first
 */
export async function getDeliveryHistory(
  subscriptionId: string,
  options?: { status?: "pending" | "delivered" | "failed"; limit?: number },
): Promise<{ deliveries: WebhookDelivery[] }> {
  const tenantId = await getCurrentTenantId();
  const dbInstance = await getDb();
  const limit = options?.limit ?? 50;

  // Build conditions
  const conditions = [
    eq(webhookDeliveries.subscriptionId, subscriptionId),
    eq(webhookDeliveries.tenantId, tenantId),
  ];

  // Add status filter if provided
  if (options?.status) {
    conditions.push(eq(webhookDeliveries.status, options.status));
  }

  const deliveries = await dbInstance
    .select()
    .from(webhookDeliveries)
    .where(and(...conditions))
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(limit);

  return {
    deliveries: deliveries.map((d: typeof webhookDeliveries.$inferSelect) => ({
      id: d.id,
      eventId: d.eventId,
      eventType: d.eventType,
      status: d.status,
      responseStatusCode: d.responseStatusCode,
      errorMessage: d.errorMessage,
      attemptCount: d.attemptCount,
      maxAttempts: d.maxAttempts,
      durationMs: d.durationMs,
      deliveredAt: d.deliveredAt,
      createdAt: d.createdAt,
    })),
  };
}

/**
 * Get a single delivery by ID for detailed view
 *
 * Story 15.5 - AC8: Delivery detail modal
 *
 * @param deliveryId - Delivery UUID
 * @returns Delivery record with response body
 */
export async function getDeliveryById(deliveryId: string): Promise<{
  delivery: WebhookDelivery & { payload: string; responseBody: string | null };
} | null> {
  const tenantId = await getCurrentTenantId();
  const dbInstance = await getDb();

  const delivery = await dbInstance.query.webhookDeliveries.findFirst({
    where: and(
      eq(webhookDeliveries.id, deliveryId),
      eq(webhookDeliveries.tenantId, tenantId),
    ),
  });

  if (!delivery) return null;

  return {
    delivery: {
      id: delivery.id,
      eventId: delivery.eventId,
      eventType: delivery.eventType,
      status: delivery.status,
      responseStatusCode: delivery.responseStatusCode,
      errorMessage: delivery.errorMessage,
      attemptCount: delivery.attemptCount,
      maxAttempts: delivery.maxAttempts,
      durationMs: delivery.durationMs,
      deliveredAt: delivery.deliveredAt,
      createdAt: delivery.createdAt,
      payload: delivery.payload,
      responseBody: delivery.responseBody,
    },
  };
}

/**
 * Retry a failed webhook delivery
 *
 * Story 15.5 - AC8: Manual retry for failed deliveries
 *
 * Creates a new delivery record and queues it for processing.
 * Original delivery record is preserved for audit trail.
 *
 * @param deliveryId - Failed delivery UUID to retry
 * @returns New delivery ID
 */
export async function retryDelivery(
  deliveryId: string,
): Promise<{ success: boolean; newDeliveryId?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const dbInstance = await getDb();

  // Get original delivery with subscription
  const delivery = await dbInstance.query.webhookDeliveries.findFirst({
    where: and(
      eq(webhookDeliveries.id, deliveryId),
      eq(webhookDeliveries.tenantId, user.tenant_id),
    ),
  });

  if (!delivery) {
    return { success: false, error: "Delivery not found" };
  }

  if (delivery.status !== "failed") {
    return { success: false, error: "Can only retry failed deliveries" };
  }

  // Get subscription to verify it's active and get URL
  const subscription = await service.getSubscription(
    delivery.subscriptionId,
    user.tenant_id,
  );

  if (!subscription) {
    return { success: false, error: "Subscription not found" };
  }

  if (!subscription.isActive) {
    return { success: false, error: "Subscription is disabled" };
  }

  // Create new delivery record
  const crypto = await import("node:crypto");
  const newDeliveryId = crypto.randomUUID();

  await dbInstance.insert(webhookDeliveries).values({
    id: newDeliveryId,
    tenantId: user.tenant_id,
    subscriptionId: delivery.subscriptionId,
    eventId: delivery.eventId,
    eventType: delivery.eventType,
    status: "pending",
    payload: delivery.payload,
  });

  // Queue for delivery via Inngest
  const { inngest } = await import("@/inngest/client");
  await inngest.send({
    name: "webhook/deliver",
    data: {
      deliveryId: newDeliveryId,
      subscriptionId: delivery.subscriptionId,
      tenantId: user.tenant_id,
      url: subscription.url,
      payload: delivery.payload,
      eventId: delivery.eventId,
      eventType: delivery.eventType,
    },
  });

  // Audit log the retry
  await logWebhookEvent(user.tenant_id, user.id, "RETRY", delivery.id, {
    original_delivery_id: deliveryId,
    new_delivery_id: newDeliveryId,
    event_type: delivery.eventType,
  });

  return { success: true, newDeliveryId };
}
