/**
 * Sales API - List and Create
 *
 * Story 15.2 - Task 4
 * AC6: GET/POST /api/v1/sales
 *
 * NOTE: Sales are IMMUTABLE (append-only ledger). No UPDATE operations.
 */

import Decimal from "decimal.js";
import { and, desc, eq, gt, gte, inArray, lt, lte, or, sql } from "drizzle-orm";
import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/db";
import {
  sales,
  salesChannelValues,
  salesFormatValues,
} from "@/db/schema/sales";
import { titles } from "@/db/schema/titles";
import {
  authenticateApiRequest,
  requireScope,
} from "@/modules/api/middleware/auth-middleware";
import { checkRateLimit } from "@/modules/api/middleware/rate-limiter";
import {
  DEFAULT_LIMIT,
  decodeCursor,
  encodeCursor,
  MAX_LIMIT,
} from "@/modules/api/utils/pagination";
import { addRateLimitHeaders } from "@/modules/api/utils/rate-limit-headers";
import {
  apiError,
  apiSuccess,
  validationError,
} from "@/modules/api/utils/response";
import { getApiSystemUser } from "@/modules/api/utils/system-user";

/**
 * Query params validation schema
 * AC6: Filtering by title_id, date range, channel, format
 */
const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  title_id: z.string().uuid().optional(),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format")
    .optional(),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format")
    .optional(),
  channel: z.enum(salesChannelValues).optional(),
  format: z.enum(salesFormatValues).optional(),
});

/**
 * Single sale validation schema
 */
const saleSchema = z.object({
  title_id: z.string().uuid("Title ID must be a valid UUID"),
  format: z.enum(salesFormatValues),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
  unit_price: z
    .number()
    .positive("Unit price must be positive")
    .transform((v) => new Decimal(v).toFixed(2)),
  sale_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  channel: z.enum(salesChannelValues),
});

/**
 * Create sales validation schema
 * AC6: Supports both single and bulk (max 100)
 */
const createSalesSchema = z.union([
  saleSchema,
  z
    .array(saleSchema)
    .min(1)
    .max(100, "Bulk create limited to 100 transactions"),
]);

/**
 * GET /api/v1/sales
 *
 * AC6: List sales with filtering
 * AC8: Tenant isolation
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  // Story 15.3: Rate limit check
  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  const scopeError = requireScope(authResult.context, "read");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  const { searchParams } = new URL(request.url);
  const queryResult = listQuerySchema.safeParse(
    Object.fromEntries(searchParams),
  );

  if (!queryResult.success) {
    return addRateLimitHeaders(
      validationError(
        Object.fromEntries(
          queryResult.error.issues.map((e) => [e.path.join("."), e.message]),
        ),
      ),
      rateLimit.state,
    );
  }

  const { cursor, limit, title_id, start_date, end_date, channel, format } =
    queryResult.data;
  const tenantId = authResult.context.tenantId;

  try {
    // Build query conditions - AC8: tenant isolation
    const conditions = [eq(sales.tenant_id, tenantId)];

    if (title_id) {
      conditions.push(eq(sales.title_id, title_id));
    }

    if (start_date) {
      conditions.push(gte(sales.sale_date, start_date));
    }

    if (end_date) {
      conditions.push(lte(sales.sale_date, end_date));
    }

    if (channel) {
      conditions.push(eq(sales.channel, channel));
    }

    if (format) {
      conditions.push(eq(sales.format, format));
    }

    // Cursor-based pagination
    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded) {
        const cursorCondition = or(
          lt(sales.created_at, decoded.ts),
          and(eq(sales.created_at, decoded.ts), gt(sales.id, decoded.id)),
        );
        if (cursorCondition) {
          conditions.push(cursorCondition);
        }
      }
    }

    // Fetch sales with title info
    const result = await adminDb.query.sales.findMany({
      where: and(...conditions),
      with: {
        title: {
          columns: {
            id: true,
            title: true,
            isbn: true,
          },
        },
      },
      orderBy: [desc(sales.created_at)],
      limit: limit + 1,
    });

    const hasMore = result.length > limit;
    const data = result.slice(0, limit);
    const lastItem = data[data.length - 1];

    // Transform response
    const transformed = data.map((s) => ({
      id: s.id,
      title_id: s.title_id,
      title: s.title
        ? {
            id: s.title.id,
            name: s.title.title,
            isbn: s.title.isbn,
          }
        : null,
      format: s.format,
      quantity: s.quantity,
      unit_price: s.unit_price,
      total_amount: s.total_amount,
      sale_date: s.sale_date,
      channel: s.channel,
      created_at: s.created_at,
    }));

    // Get total count with same filters (excluding cursor for accurate filtered count)
    const countConditions = [eq(sales.tenant_id, tenantId)];

    if (title_id) {
      countConditions.push(eq(sales.title_id, title_id));
    }

    if (start_date) {
      countConditions.push(gte(sales.sale_date, start_date));
    }

    if (end_date) {
      countConditions.push(lte(sales.sale_date, end_date));
    }

    if (channel) {
      countConditions.push(eq(sales.channel, channel));
    }

    if (format) {
      countConditions.push(eq(sales.format, format));
    }

    const countResult = await adminDb
      .select({ count: sql`count(*)` })
      .from(sales)
      .where(and(...countConditions));

    const response = apiSuccess({
      data: transformed,
      pagination: {
        cursor:
          hasMore && lastItem
            ? encodeCursor(lastItem.id, lastItem.created_at)
            : null,
        has_more: hasMore,
        total_count: Number(countResult[0]?.count || 0),
      },
    });

    return addRateLimitHeaders(response, rateLimit.state);
  } catch (error) {
    console.error("[API] GET /api/v1/sales error:", error);
    return addRateLimitHeaders(
      apiError("server_error", "Failed to fetch sales", 500),
      rateLimit.state,
    );
  }
}

/**
 * POST /api/v1/sales
 *
 * AC6: Create sale(s) - single or bulk (max 100)
 * Sales are immutable - no updates after creation.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  // Story 15.3: Rate limit check
  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  const scopeError = requireScope(authResult.context, "write");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  try {
    const body = await request.json();
    const validation = createSalesSchema.safeParse(body);

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

    const tenantId = authResult.context.tenantId;

    // Normalize to array for uniform processing
    const salesData = Array.isArray(validation.data)
      ? validation.data
      : [validation.data];

    // Validate all title_ids belong to this tenant (tenant isolation)
    const titleIds = [...new Set(salesData.map((s) => s.title_id))];
    const validTitles = await adminDb.query.titles.findMany({
      where: and(inArray(titles.id, titleIds), eq(titles.tenant_id, tenantId)),
      columns: { id: true },
    });

    const validTitleIds = new Set(validTitles.map((t) => t.id));
    const invalidTitleIds = titleIds.filter((id) => !validTitleIds.has(id));

    if (invalidTitleIds.length > 0) {
      return addRateLimitHeaders(
        validationError({
          title_id: `Title(s) not found: ${invalidTitleIds.join(", ")}`,
        }),
        rateLimit.state,
      );
    }

    // Get system user for API-created sales
    const systemUserId = await getApiSystemUser(tenantId);

    // Prepare records with computed total_amount
    const records = salesData.map((sale) => {
      const unitPrice = new Decimal(sale.unit_price);
      const totalAmount = unitPrice.times(sale.quantity).toFixed(2);

      return {
        tenant_id: tenantId,
        title_id: sale.title_id,
        format: sale.format,
        quantity: sale.quantity,
        unit_price: sale.unit_price,
        total_amount: totalAmount,
        sale_date: sale.sale_date,
        channel: sale.channel,
        created_by_user_id: systemUserId,
      };
    });

    // Insert sales records
    const created = await adminDb.insert(sales).values(records).returning();

    // Transform response
    const transformed = created.map((s) => ({
      id: s.id,
      title_id: s.title_id,
      format: s.format,
      quantity: s.quantity,
      unit_price: s.unit_price,
      total_amount: s.total_amount,
      sale_date: s.sale_date,
      channel: s.channel,
      created_at: s.created_at,
    }));

    // Return single object if single input, array if bulk
    const responseData = Array.isArray(body) ? transformed : transformed[0];

    const response = apiSuccess({ data: responseData }, 201);
    return addRateLimitHeaders(response, rateLimit.state);
  } catch (error) {
    console.error("[API] POST /api/v1/sales error:", error);

    // Handle foreign key violations
    if (
      error instanceof Error &&
      error.message.includes("violates foreign key constraint")
    ) {
      if (error.message.includes("title_id")) {
        return addRateLimitHeaders(
          validationError({ title_id: "Title not found" }),
          rateLimit.state,
        );
      }
    }

    return addRateLimitHeaders(
      apiError("server_error", "Failed to create sale(s)", 500),
      rateLimit.state,
    );
  }
}
