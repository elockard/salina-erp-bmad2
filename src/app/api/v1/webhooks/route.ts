/**
 * Webhook Subscriptions API
 *
 * Story 15.4 - FR147: Webhook subscription management
 *
 * GET /api/v1/webhooks - List subscriptions
 * POST /api/v1/webhooks - Create subscription
 */

import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/db";
import { auditLogs } from "@/db/schema/audit-logs";
import { WEBHOOK_EVENT_TYPES } from "@/db/schema/webhook-subscriptions";
import {
  authenticateApiRequest,
  requireScope,
} from "@/modules/api/middleware/auth-middleware";
import { checkRateLimit } from "@/modules/api/middleware/rate-limiter";
import { addRateLimitHeaders } from "@/modules/api/utils/rate-limit-headers";
import {
  apiError,
  apiSuccess,
  validationError,
} from "@/modules/api/utils/response";
import {
  createSubscription,
  listSubscriptions,
  validateEventTypes,
  validateWebhookUrl,
} from "@/modules/api/webhooks/subscription-service";

const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  const scopeError = requireScope(authResult.context, "read");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  try {
    const subscriptions = await listSubscriptions(authResult.context.tenantId);

    // Mask URLs for security (show only domain)
    const masked = subscriptions.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      url_domain: new URL(s.url).hostname,
      events: s.events,
      is_active: s.isActive,
      last_delivery_at: s.lastDeliveryAt,
      last_delivery_status: s.lastDeliveryStatus,
      consecutive_failures: s.consecutiveFailures,
      created_at: s.createdAt,
    }));

    return addRateLimitHeaders(
      apiSuccess({ subscriptions: masked }),
      rateLimit.state,
    );
  } catch (error) {
    console.error("[API] List webhooks error:", error);
    return addRateLimitHeaders(
      apiError("server_error", "Failed to list webhooks", 500),
      rateLimit.state,
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  const scopeError = requireScope(authResult.context, "admin");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  try {
    const body = await request.json();
    const validation = createSchema.safeParse(body);

    if (!validation.success) {
      return addRateLimitHeaders(
        validationError(
          Object.fromEntries(
            validation.error.issues.map((e) => [e.path.join("."), e.message]),
          ),
        ),
        rateLimit.state,
      );
    }

    const { name, description, url, events } = validation.data;

    // Validate URL - allow HTTP for localhost during development
    const urlValidation = validateWebhookUrl(url);
    if (!urlValidation.valid) {
      return addRateLimitHeaders(
        validationError({ url: urlValidation.error ?? "Invalid URL" }),
        rateLimit.state,
      );
    }

    // Validate events
    const eventValidation = validateEventTypes(events);
    if (!eventValidation.valid) {
      return addRateLimitHeaders(
        validationError({
          events: `Invalid event types: ${eventValidation.invalid.join(", ")}. Valid types: ${WEBHOOK_EVENT_TYPES.join(", ")}`,
        }),
        rateLimit.state,
      );
    }

    const result = await createSubscription({
      tenantId: authResult.context.tenantId,
      name,
      description,
      url,
      events: events,
      createdBy: authResult.context.keyId, // Use API key ID as creator for API-created webhooks
    });

    // Audit log: webhook created via API
    await adminDb.insert(auditLogs).values({
      tenant_id: authResult.context.tenantId,
      user_id: authResult.context.keyId, // API key ID for API-created resources
      action_type: "CREATE",
      resource_type: "webhook_subscription",
      resource_id: result.subscription.id,
      metadata: {
        name,
        url_domain: new URL(url).hostname,
        events,
        via: "api",
      },
    });

    // Return with secret (shown only once!)
    const response = apiSuccess(
      {
        subscription: {
          id: result.subscription.id,
          name: result.subscription.name,
          url_domain: new URL(result.subscription.url).hostname,
          events: result.subscription.events,
          is_active: result.subscription.isActive,
          created_at: result.subscription.createdAt,
        },
        secret: result.secret, // IMPORTANT: Display this to user - cannot be retrieved again
        warning: "Store this secret securely. It cannot be retrieved again.",
      },
      201,
    );

    return addRateLimitHeaders(response, rateLimit.state);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create webhook";
    console.error("[API] Create webhook error:", error);
    return addRateLimitHeaders(
      apiError("server_error", message, 500),
      rateLimit.state,
    );
  }
}
