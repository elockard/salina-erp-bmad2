/**
 * Webhook Secret Regeneration API
 *
 * POST /api/v1/webhooks/:id/secret - Regenerate secret
 */

import type { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/db";
import { auditLogs } from "@/db/schema/audit-logs";
import {
  authenticateApiRequest,
  requireScope,
} from "@/modules/api/middleware/auth-middleware";
import { checkRateLimit } from "@/modules/api/middleware/rate-limiter";
import { addRateLimitHeaders } from "@/modules/api/utils/rate-limit-headers";
import { apiSuccess, notFound } from "@/modules/api/utils/response";
import {
  getSubscription,
  regenerateSecret,
} from "@/modules/api/webhooks/subscription-service";

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

  // Get subscription for audit log
  const subscription = await getSubscription(id, authResult.context.tenantId);

  const result = await regenerateSecret(id, authResult.context.tenantId);

  if (!result) {
    return addRateLimitHeaders(
      notFound("Webhook subscription"),
      rateLimit.state,
    );
  }

  // Audit log: secret regenerated via API (security event)
  await adminDb.insert(auditLogs).values({
    tenant_id: authResult.context.tenantId,
    user_id: authResult.context.keyId,
    action_type: "UPDATE",
    resource_type: "webhook_subscription",
    resource_id: id,
    metadata: {
      name: subscription?.name,
      action: "secret_regenerated",
      via: "api",
    },
  });

  return addRateLimitHeaders(
    apiSuccess({
      secret: result.secret,
      warning:
        "Store this secret securely. It cannot be retrieved again. Previous secret is now invalid.",
    }),
    rateLimit.state,
  );
}
