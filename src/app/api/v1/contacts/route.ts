/**
 * Contacts API - List and Create
 *
 * Story 15.2 - Task 3
 * AC5: GET/POST /api/v1/contacts
 */

import { and, desc, eq, exists, gt, ilike, lt, or, sql } from "drizzle-orm";
import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/db";
import {
  contactRoles,
  contactRoleValues,
  contactStatusValues,
  contacts,
} from "@/db/schema/contacts";
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
import { sanitizeContact } from "@/modules/api/utils/sanitize";

/**
 * Query params validation schema
 */
const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  role: z.enum(contactRoleValues).optional(),
  status: z.enum(contactStatusValues).optional(),
  search: z.string().optional(),
});

/**
 * Create contact validation schema
 */
const createContactSchema = z.object({
  // Required
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),

  // Contact info
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),

  // Address
  address_line1: z.string().max(200).optional().nullable(),
  address_line2: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  country: z.string().max(100).default("USA"),

  // Status
  status: z.enum(contactStatusValues).default("active"),

  // Notes
  notes: z.string().optional().nullable(),
});

/**
 * GET /api/v1/contacts
 *
 * AC5: List contacts with filtering
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

  const { cursor, limit, role, status, search } = queryResult.data;
  const tenantId = authResult.context.tenantId;

  try {
    // Build query conditions
    const conditions = [eq(contacts.tenant_id, tenantId)];

    if (status) {
      conditions.push(eq(contacts.status, status));
    }

    if (search) {
      const searchCondition = or(
        ilike(contacts.first_name, `%${search}%`),
        ilike(contacts.last_name, `%${search}%`),
        ilike(contacts.email, `%${search}%`),
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    // Role filter using EXISTS subquery (proper SQL filtering for correct pagination)
    if (role) {
      conditions.push(
        exists(
          adminDb
            .select({ one: sql`1` })
            .from(contactRoles)
            .where(
              and(
                eq(contactRoles.contact_id, contacts.id),
                eq(contactRoles.role, role),
              ),
            ),
        ),
      );
    }

    // Cursor-based pagination
    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded) {
        const cursorCondition = or(
          lt(contacts.updated_at, decoded.ts),
          and(eq(contacts.updated_at, decoded.ts), gt(contacts.id, decoded.id)),
        );
        if (cursorCondition) {
          conditions.push(cursorCondition);
        }
      }
    }

    // Fetch contacts with roles (role filter applied in SQL via EXISTS)
    const result = await adminDb.query.contacts.findMany({
      where: and(...conditions),
      with: {
        roles: true,
      },
      orderBy: [desc(contacts.updated_at)],
      limit: limit + 1,
    });

    const hasMore = result.length > limit;
    const data = result.slice(0, limit);
    const lastItem = data[data.length - 1];

    // Transform response with sanitization (AC5: exclude sensitive fields)
    const transformed = data.map((c) => {
      const sanitized = sanitizeContact(c);
      return {
        ...sanitized,
        roles:
          c.roles?.map((r) => ({
            role: r.role,
            assigned_at: r.assigned_at,
          })) || [],
      };
    });

    // Get total count with same filters (excluding cursor for accurate filtered count)
    const countConditions = [eq(contacts.tenant_id, tenantId)];

    if (status) {
      countConditions.push(eq(contacts.status, status));
    }

    if (search) {
      const searchCondition = or(
        ilike(contacts.first_name, `%${search}%`),
        ilike(contacts.last_name, `%${search}%`),
        ilike(contacts.email, `%${search}%`),
      );
      if (searchCondition) {
        countConditions.push(searchCondition);
      }
    }

    if (role) {
      countConditions.push(
        exists(
          adminDb
            .select({ one: sql`1` })
            .from(contactRoles)
            .where(
              and(
                eq(contactRoles.contact_id, contacts.id),
                eq(contactRoles.role, role),
              ),
            ),
        ),
      );
    }

    const countResult = await adminDb
      .select({ count: sql`count(*)` })
      .from(contacts)
      .where(and(...countConditions));

    const response = apiSuccess({
      data: transformed,
      pagination: {
        cursor:
          hasMore && lastItem
            ? encodeCursor(lastItem.id, lastItem.updated_at)
            : null,
        has_more: hasMore,
        total_count: Number(countResult[0]?.count || 0),
      },
    });

    return addRateLimitHeaders(response, rateLimit.state);
  } catch (error) {
    console.error("[API] GET /api/v1/contacts error:", error);
    return addRateLimitHeaders(
      apiError("server_error", "Failed to fetch contacts", 500),
      rateLimit.state,
    );
  }
}

/**
 * POST /api/v1/contacts
 *
 * AC5: Create new contact
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
    const validation = createContactSchema.safeParse(body);

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
    const data = validation.data;

    const [created] = await adminDb
      .insert(contacts)
      .values({
        ...data,
        tenant_id: tenantId,
      })
      .returning();

    // Sanitize response
    const sanitized = sanitizeContact(created);
    const response = apiSuccess({ data: { ...sanitized, roles: [] } }, 201);
    return addRateLimitHeaders(response, rateLimit.state);
  } catch (error) {
    console.error("[API] POST /api/v1/contacts error:", error);

    if (
      error instanceof Error &&
      error.message.includes("unique constraint") &&
      error.message.includes("email")
    ) {
      return addRateLimitHeaders(
        validationError({ email: "Email already exists for this tenant" }),
        rateLimit.state,
      );
    }

    return addRateLimitHeaders(
      apiError("server_error", "Failed to create contact", 500),
      rateLimit.state,
    );
  }
}
