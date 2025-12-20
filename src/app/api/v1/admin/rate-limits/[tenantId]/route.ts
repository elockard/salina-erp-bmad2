/**
 * Admin API - Rate Limit Management
 *
 * Story 15.3 - Task 4
 * GET /api/v1/admin/rate-limits/:tenantId - View tenant limits
 * PUT /api/v1/admin/rate-limits/:tenantId - Update tenant limits
 *
 * Requires admin scope
 */

import { eq } from "drizzle-orm";
import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/db";
import {
  type RateLimitOverride,
  rateLimitOverrides,
} from "@/db/schema/rate-limit-overrides";
import { tenants } from "@/db/schema/tenants";
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

/**
 * Update rate limits validation schema
 */
const updateLimitsSchema = z.object({
  requests_per_minute: z.number().int().min(1).max(10000).optional(),
  requests_per_hour: z.number().int().min(1).max(100000).optional(),
});

interface RouteParams {
  params: Promise<{ tenantId: string }>;
}

// Default rate limits
const DEFAULT_LIMITS = {
  requests_per_minute: 100,
  requests_per_hour: 1000,
};

/**
 * GET /api/v1/admin/rate-limits/:tenantId
 *
 * View rate limits for a tenant
 * Requires admin scope
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { tenantId } = await params;

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenantId)) {
    return notFound("Tenant");
  }

  // Authenticate
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  // Rate limit check
  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  // Require admin scope
  const scopeError = requireScope(authResult.context, "admin");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  // Tenant isolation: Admin can only manage their own tenant's rate limits
  if (authResult.context.tenantId !== tenantId) {
    return addRateLimitHeaders(
      apiError(
        "forbidden",
        "Cannot access rate limits for another tenant",
        403,
      ),
      rateLimit.state,
    );
  }

  try {
    // Verify tenant exists
    const tenant = await adminDb.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return addRateLimitHeaders(notFound("Tenant"), rateLimit.state);
    }

    // Get custom limits if they exist
    const override = await adminDb.query.rateLimitOverrides.findFirst({
      where: eq(rateLimitOverrides.tenantId, tenantId),
    });

    const response = apiSuccess({
      data: {
        tenant_id: tenantId,
        tenant_name: tenant.name,
        limits: {
          requests_per_minute:
            override?.requestsPerMinute ?? DEFAULT_LIMITS.requests_per_minute,
          requests_per_hour:
            override?.requestsPerHour ?? DEFAULT_LIMITS.requests_per_hour,
        },
        is_custom: !!override,
        updated_at: override?.updatedAt ?? null,
      },
    });

    return addRateLimitHeaders(response, rateLimit.state);
  } catch (error) {
    console.error(
      "[API] GET /api/v1/admin/rate-limits/:tenantId error:",
      error,
    );
    return addRateLimitHeaders(
      apiError("server_error", "Failed to fetch rate limits", 500),
      rateLimit.state,
    );
  }
}

/**
 * PUT /api/v1/admin/rate-limits/:tenantId
 *
 * Update rate limits for a tenant
 * Requires admin scope
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { tenantId } = await params;

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenantId)) {
    return notFound("Tenant");
  }

  // Authenticate
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  // Rate limit check
  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  // Require admin scope
  const scopeError = requireScope(authResult.context, "admin");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  // Tenant isolation: Admin can only manage their own tenant's rate limits
  if (authResult.context.tenantId !== tenantId) {
    return addRateLimitHeaders(
      apiError(
        "forbidden",
        "Cannot modify rate limits for another tenant",
        403,
      ),
      rateLimit.state,
    );
  }

  try {
    const body = await request.json();
    const validation = updateLimitsSchema.safeParse(body);

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

    const { requests_per_minute, requests_per_hour } = validation.data;

    // Check at least one field is provided
    if (requests_per_minute === undefined && requests_per_hour === undefined) {
      return addRateLimitHeaders(
        validationError({
          body: "At least one of requests_per_minute or requests_per_hour is required",
        }),
        rateLimit.state,
      );
    }

    // Verify tenant exists
    const tenant = await adminDb.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return addRateLimitHeaders(notFound("Tenant"), rateLimit.state);
    }

    // Check if override already exists
    const existing = await adminDb.query.rateLimitOverrides.findFirst({
      where: eq(rateLimitOverrides.tenantId, tenantId),
    });

    let result: RateLimitOverride;

    if (existing) {
      // Update existing override
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      if (requests_per_minute !== undefined) {
        updateData.requestsPerMinute = requests_per_minute;
      }
      if (requests_per_hour !== undefined) {
        updateData.requestsPerHour = requests_per_hour;
      }

      [result] = await adminDb
        .update(rateLimitOverrides)
        .set(updateData)
        .where(eq(rateLimitOverrides.tenantId, tenantId))
        .returning();
    } else {
      // Create new override
      [result] = await adminDb
        .insert(rateLimitOverrides)
        .values({
          tenantId,
          requestsPerMinute:
            requests_per_minute ?? DEFAULT_LIMITS.requests_per_minute,
          requestsPerHour:
            requests_per_hour ?? DEFAULT_LIMITS.requests_per_hour,
        })
        .returning();
    }

    const response = apiSuccess({
      data: {
        tenant_id: tenantId,
        tenant_name: tenant.name,
        limits: {
          requests_per_minute: result.requestsPerMinute,
          requests_per_hour: result.requestsPerHour,
        },
        is_custom: true,
        updated_at: result.updatedAt,
      },
    });

    return addRateLimitHeaders(response, rateLimit.state);
  } catch (error) {
    console.error(
      "[API] PUT /api/v1/admin/rate-limits/:tenantId error:",
      error,
    );
    return addRateLimitHeaders(
      apiError("server_error", "Failed to update rate limits", 500),
      rateLimit.state,
    );
  }
}

/**
 * DELETE /api/v1/admin/rate-limits/:tenantId
 *
 * Reset rate limits to default for a tenant
 * Requires admin scope
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { tenantId } = await params;

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenantId)) {
    return notFound("Tenant");
  }

  // Authenticate
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  // Rate limit check
  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  // Require admin scope
  const scopeError = requireScope(authResult.context, "admin");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  // Tenant isolation: Admin can only manage their own tenant's rate limits
  if (authResult.context.tenantId !== tenantId) {
    return addRateLimitHeaders(
      apiError("forbidden", "Cannot reset rate limits for another tenant", 403),
      rateLimit.state,
    );
  }

  try {
    // Verify tenant exists
    const tenant = await adminDb.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return addRateLimitHeaders(notFound("Tenant"), rateLimit.state);
    }

    // Delete override if exists (resets to default)
    await adminDb
      .delete(rateLimitOverrides)
      .where(eq(rateLimitOverrides.tenantId, tenantId));

    const response = apiSuccess({
      data: {
        tenant_id: tenantId,
        tenant_name: tenant.name,
        limits: {
          requests_per_minute: DEFAULT_LIMITS.requests_per_minute,
          requests_per_hour: DEFAULT_LIMITS.requests_per_hour,
        },
        is_custom: false,
        updated_at: null,
      },
      message: "Rate limits reset to default",
    });

    return addRateLimitHeaders(response, rateLimit.state);
  } catch (error) {
    console.error(
      "[API] DELETE /api/v1/admin/rate-limits/:tenantId error:",
      error,
    );
    return addRateLimitHeaders(
      apiError("server_error", "Failed to reset rate limits", 500),
      rateLimit.state,
    );
  }
}
