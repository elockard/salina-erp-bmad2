/**
 * Webhook Delivery History API
 *
 * Story 15.5 - AC8: REST API for delivery history
 *
 * GET /api/v1/webhooks/:id/deliveries - List recent deliveries for a subscription
 */

import { and, desc, eq } from "drizzle-orm";
import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/db";
import { webhookDeliveries } from "@/db/schema/webhook-deliveries";
import { webhookSubscriptions } from "@/db/schema/webhook-subscriptions";
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

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  status: z.enum(["pending", "delivered", "failed"]).optional(),
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

  try {
    // Parse query parameters
    const url = new URL(request.url);
    const validation = querySchema.safeParse({
      limit: url.searchParams.get("limit") ?? 50,
      status: url.searchParams.get("status") ?? undefined,
    });

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

    const { limit, status } = validation.data;

    // Verify subscription exists and belongs to tenant
    const subscription = await adminDb.query.webhookSubscriptions.findFirst({
      where: and(
        eq(webhookSubscriptions.id, id),
        eq(webhookSubscriptions.tenantId, authResult.context.tenantId),
      ),
    });

    if (!subscription) {
      return addRateLimitHeaders(
        notFound("Webhook subscription"),
        rateLimit.state,
      );
    }

    // Build query conditions
    const conditions = [
      eq(webhookDeliveries.subscriptionId, id),
      eq(webhookDeliveries.tenantId, authResult.context.tenantId),
    ];

    if (status) {
      conditions.push(eq(webhookDeliveries.status, status));
    }

    // Fetch deliveries
    const deliveries = await adminDb
      .select({
        id: webhookDeliveries.id,
        event_id: webhookDeliveries.eventId,
        event_type: webhookDeliveries.eventType,
        status: webhookDeliveries.status,
        response_status_code: webhookDeliveries.responseStatusCode,
        error_message: webhookDeliveries.errorMessage,
        attempt_count: webhookDeliveries.attemptCount,
        duration_ms: webhookDeliveries.durationMs,
        delivered_at: webhookDeliveries.deliveredAt,
        created_at: webhookDeliveries.createdAt,
      })
      .from(webhookDeliveries)
      .where(and(...conditions))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(limit);

    return addRateLimitHeaders(
      apiSuccess({
        deliveries,
        pagination: {
          total: deliveries.length,
          limit,
        },
      }),
      rateLimit.state,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch deliveries";
    console.error("[API] Get deliveries error:", error);
    return addRateLimitHeaders(
      apiError("server_error", message, 500),
      rateLimit.state,
    );
  }
}
