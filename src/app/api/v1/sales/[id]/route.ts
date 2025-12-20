/**
 * Sales API - Single Sale Operations
 *
 * Story 15.2 - Task 4
 * AC6: GET /api/v1/sales/:id
 *
 * NOTE: Sales are IMMUTABLE (append-only ledger). No UPDATE or DELETE operations.
 */

import { and, eq } from "drizzle-orm";
import type { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/db";
import { sales } from "@/db/schema/sales";
import {
  authenticateApiRequest,
  requireScope,
} from "@/modules/api/middleware/auth-middleware";
import { checkRateLimit } from "@/modules/api/middleware/rate-limiter";
import { addRateLimitHeaders } from "@/modules/api/utils/rate-limit-headers";
import { apiError, apiSuccess, notFound } from "@/modules/api/utils/response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/sales/:id
 *
 * AC6: Get single sale with full details
 * AC8: Tenant isolation - returns 404 for wrong tenant
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return notFound("Sale");
  }

  // Authenticate
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  // Story 15.3: Rate limit check
  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  const scopeError = requireScope(authResult.context, "read");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  const tenantId = authResult.context.tenantId;

  try {
    // Fetch sale with tenant isolation
    const sale = await adminDb.query.sales.findFirst({
      where: and(eq(sales.id, id), eq(sales.tenant_id, tenantId)),
      with: {
        title: {
          columns: {
            id: true,
            title: true,
            isbn: true,
            asin: true,
          },
        },
      },
    });

    // AC8: Return 404 for not found OR wrong tenant
    if (!sale) {
      return addRateLimitHeaders(notFound("Sale"), rateLimit.state);
    }

    // Transform response with full details
    const transformed = {
      id: sale.id,
      title_id: sale.title_id,
      title: sale.title
        ? {
            id: sale.title.id,
            name: sale.title.title,
            isbn: sale.title.isbn,
            asin: sale.title.asin,
          }
        : null,
      format: sale.format,
      quantity: sale.quantity,
      unit_price: sale.unit_price,
      total_amount: sale.total_amount,
      sale_date: sale.sale_date,
      channel: sale.channel,
      created_at: sale.created_at,
      updated_at: sale.updated_at,
    };

    const response = apiSuccess({ data: transformed });
    return addRateLimitHeaders(response, rateLimit.state);
  } catch (error) {
    console.error("[API] GET /api/v1/sales/:id error:", error);
    return addRateLimitHeaders(
      apiError("server_error", "Failed to fetch sale", 500),
      rateLimit.state,
    );
  }
}
