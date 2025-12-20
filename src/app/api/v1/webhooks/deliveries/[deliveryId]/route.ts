/**
 * Webhook Delivery Detail API
 *
 * Story 15.5 - AC8: REST API for delivery details
 *
 * GET /api/v1/webhooks/deliveries/:deliveryId - Get delivery details with payload
 */

import { and, eq } from "drizzle-orm";
import type { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/db";
import { webhookDeliveries } from "@/db/schema/webhook-deliveries";
import {
  authenticateApiRequest,
  requireScope,
} from "@/modules/api/middleware/auth-middleware";
import { checkRateLimit } from "@/modules/api/middleware/rate-limiter";
import { addRateLimitHeaders } from "@/modules/api/utils/rate-limit-headers";
import { apiError, apiSuccess, notFound } from "@/modules/api/utils/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deliveryId: string }> },
): Promise<NextResponse> {
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  const scopeError = requireScope(authResult.context, "read");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  const { deliveryId } = await params;

  try {
    // Fetch delivery with tenant isolation
    const delivery = await adminDb.query.webhookDeliveries.findFirst({
      where: and(
        eq(webhookDeliveries.id, deliveryId),
        eq(webhookDeliveries.tenantId, authResult.context.tenantId),
      ),
    });

    if (!delivery) {
      return addRateLimitHeaders(notFound("Webhook delivery"), rateLimit.state);
    }

    // Parse payload to return as object
    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(delivery.payload);
    } catch {
      parsedPayload = delivery.payload;
    }

    return addRateLimitHeaders(
      apiSuccess({
        id: delivery.id,
        subscription_id: delivery.subscriptionId,
        event_id: delivery.eventId,
        event_type: delivery.eventType,
        status: delivery.status,
        response_status_code: delivery.responseStatusCode,
        response_body: delivery.responseBody,
        error_message: delivery.errorMessage,
        attempt_count: delivery.attemptCount,
        max_attempts: delivery.maxAttempts,
        duration_ms: delivery.durationMs,
        delivered_at: delivery.deliveredAt,
        created_at: delivery.createdAt,
        payload: parsedPayload,
      }),
      rateLimit.state,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch delivery";
    console.error("[API] Get delivery error:", error);
    return addRateLimitHeaders(
      apiError("server_error", message, 500),
      rateLimit.state,
    );
  }
}
