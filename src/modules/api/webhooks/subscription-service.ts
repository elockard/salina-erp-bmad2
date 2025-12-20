/**
 * Webhook Subscription Service
 *
 * Story 15.4 - FR147: Webhook subscription management
 */

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  MAX_SUBSCRIPTIONS_PER_TENANT,
  WEBHOOK_EVENT_TYPES,
  type WebhookEventType,
  type WebhookSubscription,
  webhookSubscriptions,
} from "@/db/schema/webhook-subscriptions";

const BCRYPT_ROUNDS = 10;
const SECRET_BYTES = 32; // 256 bits

export interface CreateSubscriptionInput {
  tenantId: string;
  name: string;
  description?: string;
  url: string;
  events: string[]; // Validated via validateEventTypes before calling
  createdBy: string;
}

export interface UpdateSubscriptionInput {
  name?: string;
  description?: string;
  url?: string;
  events?: string[]; // Validated via validateEventTypes before calling
  isActive?: boolean;
}

export interface CreateSubscriptionResult {
  subscription: WebhookSubscription;
  secret: string; // Plain text secret - shown only once
}

/**
 * Generate a cryptographically secure webhook secret
 */
function generateSecret(): string {
  return crypto.randomBytes(SECRET_BYTES).toString("hex");
}

/**
 * Check if an IP address is internal/private (SSRF protection)
 */
function isInternalIP(hostname: string): boolean {
  // Cloud metadata endpoints
  if (
    hostname === "169.254.169.254" ||
    hostname === "metadata.google.internal"
  ) {
    return true;
  }

  // IPv4 private ranges
  const ipv4Match = hostname.match(
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/,
  );
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    // 10.0.0.0/8
    if (a === 10) return true;
    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16
    if (a === 192 && b === 168) return true;
    // 127.0.0.0/8 (loopback) - allowed for localhost dev
    if (a === 127) return false;
    // 169.254.0.0/16 (link-local)
    if (a === 169 && b === 254) return true;
  }

  return false;
}

/**
 * Validate webhook URL
 * - HTTPS required for production
 * - HTTP allowed for localhost/test environments only
 * - Blocks internal IPs and cloud metadata endpoints (SSRF protection)
 */
export function validateWebhookUrl(
  url: string,
  isTest = false,
): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    // Must be http or https
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, error: "URL must use HTTP or HTTPS protocol" };
    }

    // SSRF protection: block internal IPs and cloud metadata endpoints
    if (isInternalIP(parsed.hostname)) {
      return {
        valid: false,
        error:
          "Internal IP addresses and cloud metadata endpoints are not allowed",
      };
    }

    // HTTPS required for non-localhost in production
    const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(
      parsed.hostname,
    );
    if (!isTest && !isLocalhost && parsed.protocol !== "https:") {
      return {
        valid: false,
        error:
          "HTTPS required for webhook endpoints (HTTP only allowed for localhost)",
      };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

/**
 * Validate event types
 */
export function validateEventTypes(events: string[]): {
  valid: boolean;
  invalid: string[];
} {
  const invalid = events.filter(
    (e) => !WEBHOOK_EVENT_TYPES.includes(e as WebhookEventType),
  );
  return { valid: invalid.length === 0, invalid };
}

/**
 * Create a new webhook subscription
 */
export async function createSubscription(
  input: CreateSubscriptionInput,
): Promise<CreateSubscriptionResult> {
  // Check subscription limit
  const [existing] = await db
    .select({ count: count() })
    .from(webhookSubscriptions)
    .where(eq(webhookSubscriptions.tenantId, input.tenantId));

  if (existing.count >= MAX_SUBSCRIPTIONS_PER_TENANT) {
    throw new Error(
      `Maximum of ${MAX_SUBSCRIPTIONS_PER_TENANT} webhook subscriptions per tenant`,
    );
  }

  // Validate URL
  const urlValidation = validateWebhookUrl(input.url);
  if (!urlValidation.valid) {
    throw new Error(urlValidation.error);
  }

  // Validate events
  const eventValidation = validateEventTypes(input.events);
  if (!eventValidation.valid) {
    throw new Error(
      `Invalid event types: ${eventValidation.invalid.join(", ")}`,
    );
  }

  // Generate and hash secret
  const secret = generateSecret();
  const secretHash = await bcrypt.hash(secret, BCRYPT_ROUNDS);

  // Insert subscription
  const [subscription] = await db
    .insert(webhookSubscriptions)
    .values({
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      url: input.url,
      secretHash,
      events: input.events,
      createdBy: input.createdBy,
    })
    .returning();

  return { subscription, secret };
}

/**
 * Get subscription by ID (with tenant check)
 */
export async function getSubscription(
  id: string,
  tenantId: string,
): Promise<WebhookSubscription | null> {
  const subscription = await db.query.webhookSubscriptions.findFirst({
    where: and(
      eq(webhookSubscriptions.id, id),
      eq(webhookSubscriptions.tenantId, tenantId),
    ),
  });
  return subscription ?? null;
}

/**
 * List subscriptions for a tenant
 */
export async function listSubscriptions(
  tenantId: string,
): Promise<WebhookSubscription[]> {
  return db.query.webhookSubscriptions.findMany({
    where: eq(webhookSubscriptions.tenantId, tenantId),
    orderBy: (subscriptions, { desc }) => [desc(subscriptions.createdAt)],
  });
}

/**
 * Update a webhook subscription
 */
export async function updateSubscription(
  id: string,
  tenantId: string,
  updates: UpdateSubscriptionInput,
): Promise<WebhookSubscription | null> {
  // Validate URL if being updated
  if (updates.url) {
    const urlValidation = validateWebhookUrl(updates.url);
    if (!urlValidation.valid) {
      throw new Error(urlValidation.error);
    }
  }

  // Validate events if being updated
  if (updates.events) {
    const eventValidation = validateEventTypes(updates.events);
    if (!eventValidation.valid) {
      throw new Error(
        `Invalid event types: ${eventValidation.invalid.join(", ")}`,
      );
    }
  }

  const [updated] = await db
    .update(webhookSubscriptions)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(webhookSubscriptions.id, id),
        eq(webhookSubscriptions.tenantId, tenantId),
      ),
    )
    .returning();

  return updated ?? null;
}

/**
 * Regenerate webhook secret
 * Returns new plaintext secret (shown only once)
 */
export async function regenerateSecret(
  id: string,
  tenantId: string,
): Promise<{ secret: string } | null> {
  const secret = generateSecret();
  const secretHash = await bcrypt.hash(secret, BCRYPT_ROUNDS);

  const [updated] = await db
    .update(webhookSubscriptions)
    .set({
      secretHash,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(webhookSubscriptions.id, id),
        eq(webhookSubscriptions.tenantId, tenantId),
      ),
    )
    .returning();

  if (!updated) return null;
  return { secret };
}

/**
 * Delete a webhook subscription
 */
export async function deleteSubscription(
  id: string,
  tenantId: string,
): Promise<boolean> {
  const result = await db
    .delete(webhookSubscriptions)
    .where(
      and(
        eq(webhookSubscriptions.id, id),
        eq(webhookSubscriptions.tenantId, tenantId),
      ),
    )
    .returning({ id: webhookSubscriptions.id });

  return result.length > 0;
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 * NOTE: For test events, we use a temporary signing key so developers can verify their implementation
 */
function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Test webhook delivery
 * Sends a test event to the endpoint with signature headers
 * so developers can verify their signature validation works
 */
export async function testWebhook(
  id: string,
  tenantId: string,
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const subscription = await getSubscription(id, tenantId);
  if (!subscription) {
    return { success: false, error: "Subscription not found" };
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const testPayload = {
    id: crypto.randomUUID(),
    type: "test",
    test: true,
    created_at: new Date().toISOString(),
    data: {
      message: "This is a test webhook from Salina ERP",
      subscription_id: subscription.id,
      subscription_name: subscription.name,
    },
  };

  const body = JSON.stringify(testPayload);

  // For test events, generate signature using a test key
  // Real events (Story 15.5) will use the actual stored secret
  const testSigningKey = `test_${subscription.id}`;
  const signaturePayload = `${timestamp}.${body}`;
  const signature = signPayload(signaturePayload, testSigningKey);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(subscription.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Salina-Webhook/1.0",
        "X-Webhook-Test": "true",
        "X-Webhook-Timestamp": timestamp.toString(),
        "X-Webhook-Signature": `sha256=${signature}`,
        // Include test signing key so developer can verify signature
        "X-Webhook-Test-Key": testSigningKey,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    return {
      success: response.ok,
      statusCode: response.status,
      error: response.ok
        ? undefined
        : `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: message.includes("abort") ? "Request timed out (10s)" : message,
    };
  }
}
