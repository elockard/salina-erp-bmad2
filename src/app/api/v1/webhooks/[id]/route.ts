/**
 * Webhook Subscription Detail API
 *
 * GET /api/v1/webhooks/:id - Get subscription
 * PUT /api/v1/webhooks/:id - Update subscription
 * DELETE /api/v1/webhooks/:id - Delete subscription
 */

import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/db";
import { auditLogs } from "@/db/schema/audit-logs";
import {
  authenticateApiRequest,
  requireScope,
} from "@/modules/api/middleware/auth-middleware";
import { checkRateLimit } from "@/modules/api/middleware/rate-limiter";
import { addRateLimitHeaders } from "@/modules/api/utils/rate-limit-headers";
import {
  apiError,
  apiSuccess,
  notFound,
  validationError,
} from "@/modules/api/utils/response";
import {
  deleteSubscription,
  getSubscription,
  updateSubscription,
  validateEventTypes,
  validateWebhookUrl,
} from "@/modules/api/webhooks/subscription-service";

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  is_active: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  const scopeError = requireScope(authResult.context, "read");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  const { id } = await params;
  const subscription = await getSubscription(id, authResult.context.tenantId);

  if (!subscription) {
    return addRateLimitHeaders(
      notFound("Webhook subscription"),
      rateLimit.state,
    );
  }

  return addRateLimitHeaders(
    apiSuccess({
      id: subscription.id,
      name: subscription.name,
      description: subscription.description,
      url: subscription.url, // Full URL for owner
      events: subscription.events,
      is_active: subscription.isActive,
      last_delivery_at: subscription.lastDeliveryAt,
      last_delivery_status: subscription.lastDeliveryStatus,
      consecutive_failures: subscription.consecutiveFailures,
      created_at: subscription.createdAt,
      updated_at: subscription.updatedAt,
    }),
    rateLimit.state,
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  const scopeError = requireScope(authResult.context, "admin");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  const { id } = await params;

  try {
    const body = await request.json();
    const validation = updateSchema.safeParse(body);

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

    const { name, description, url, events, is_active } = validation.data;

    // Validate URL if provided
    if (url) {
      const urlValidation = validateWebhookUrl(url);
      if (!urlValidation.valid) {
        return addRateLimitHeaders(
          validationError({ url: urlValidation.error ?? "Invalid URL" }),
          rateLimit.state,
        );
      }
    }

    // Validate events if provided
    if (events) {
      const eventValidation = validateEventTypes(events);
      if (!eventValidation.valid) {
        return addRateLimitHeaders(
          validationError({
            events: `Invalid event types: ${eventValidation.invalid.join(", ")}`,
          }),
          rateLimit.state,
        );
      }
    }

    const updated = await updateSubscription(id, authResult.context.tenantId, {
      name,
      description,
      url,
      events: events,
      isActive: is_active,
    });

    if (!updated) {
      return addRateLimitHeaders(
        notFound("Webhook subscription"),
        rateLimit.state,
      );
    }

    // Audit log: webhook updated via API
    await adminDb.insert(auditLogs).values({
      tenant_id: authResult.context.tenantId,
      user_id: authResult.context.keyId,
      action_type: "UPDATE",
      resource_type: "webhook_subscription",
      resource_id: id,
      metadata: {
        name: updated.name,
        changes: {
          ...(name !== undefined && { name }),
          ...(url !== undefined && { url_changed: true }),
          ...(events !== undefined && { events }),
          ...(is_active !== undefined && { is_active }),
        },
        via: "api",
      },
    });

    return addRateLimitHeaders(
      apiSuccess({
        id: updated.id,
        name: updated.name,
        description: updated.description,
        url: updated.url,
        events: updated.events,
        is_active: updated.isActive,
        updated_at: updated.updatedAt,
      }),
      rateLimit.state,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update webhook";
    console.error("[API] Update webhook error:", error);
    return addRateLimitHeaders(
      apiError("server_error", message, 500),
      rateLimit.state,
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  const scopeError = requireScope(authResult.context, "admin");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  const { id } = await params;

  // Get subscription name before deletion for audit log
  const subscription = await getSubscription(id, authResult.context.tenantId);

  const deleted = await deleteSubscription(id, authResult.context.tenantId);

  if (!deleted) {
    return addRateLimitHeaders(
      notFound("Webhook subscription"),
      rateLimit.state,
    );
  }

  // Audit log: webhook deleted via API
  await adminDb.insert(auditLogs).values({
    tenant_id: authResult.context.tenantId,
    user_id: authResult.context.keyId,
    action_type: "DELETE",
    resource_type: "webhook_subscription",
    resource_id: id,
    metadata: {
      name: subscription?.name,
      via: "api",
    },
  });

  return addRateLimitHeaders(apiSuccess({ deleted: true }), rateLimit.state);
}
