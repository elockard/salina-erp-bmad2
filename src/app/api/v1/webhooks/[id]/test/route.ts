/**
 * Webhook Test Delivery API
 *
 * POST /api/v1/webhooks/:id/test - Send test event
 */

import type { NextRequest, NextResponse } from "next/server";
import {
  authenticateApiRequest,
  requireScope,
} from "@/modules/api/middleware/auth-middleware";
import { checkRateLimit } from "@/modules/api/middleware/rate-limiter";
import { addRateLimitHeaders } from "@/modules/api/utils/rate-limit-headers";
import { apiSuccess, notFound } from "@/modules/api/utils/response";
import { testWebhook } from "@/modules/api/webhooks/subscription-service";

export async function POST(
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
  const result = await testWebhook(id, authResult.context.tenantId);

  if (result.error === "Subscription not found") {
    return addRateLimitHeaders(
      notFound("Webhook subscription"),
      rateLimit.state,
    );
  }

  return addRateLimitHeaders(
    apiSuccess({
      success: result.success,
      status_code: result.statusCode,
      error: result.error,
    }),
    rateLimit.state,
  );
}
