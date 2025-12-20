/**
 * Titles API - List and Create
 *
 * Story 15.2 - Task 2
 * AC1: GET /api/v1/titles - paginated list
 * AC3: POST /api/v1/titles - create new title
 */

import { and, desc, eq, exists, gt, ilike, lt, or, sql } from "drizzle-orm";
import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/db";
import { contacts } from "@/db/schema/contacts";
import { titleAuthors } from "@/db/schema/title-authors";
import { publicationStatusValues, titles } from "@/db/schema/titles";
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

/**
 * Query params validation schema
 * AC1: Filtering and pagination
 */
const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  status: z.enum(publicationStatusValues).optional(),
  search: z.string().optional(),
  author_id: z.string().uuid().optional(),
});

/**
 * Create title validation schema
 * AC3: Field validation
 */
const createTitleSchema = z.object({
  // Required
  title: z.string().min(1, "Title is required").max(500),

  // Basic metadata
  subtitle: z.string().max(500).optional(),
  genre: z.string().max(100).optional(),
  word_count: z.number().int().positive().optional(),

  // Identifiers
  isbn: z
    .string()
    .regex(/^97[89]\d{10}$/, "ISBN must be valid ISBN-13 format")
    .optional(),
  asin: z
    .string()
    .regex(/^[A-Z0-9]{10}$/, "ASIN must be 10 alphanumeric characters")
    .optional(),

  // Publishing info
  publication_status: z.enum(publicationStatusValues).default("draft"),
  publication_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format")
    .optional(),

  // Contact/Author reference
  contact_id: z.string().uuid().optional(),

  // Accessibility (Story 14.3)
  epub_accessibility_conformance: z.string().optional(),
  accessibility_features: z.array(z.string()).optional(),
  accessibility_hazards: z.array(z.string()).optional(),
  accessibility_summary: z.string().optional(),
});

/**
 * GET /api/v1/titles
 *
 * AC1: Paginated list with filtering
 * AC8: Tenant isolation
 * AC10: Rate limit headers
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // AC8: Authenticate
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  // Story 15.3: Rate limit check
  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  // Check read scope
  const scopeError = requireScope(authResult.context, "read");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  // Parse query params
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

  const { cursor, limit, status, search, author_id } = queryResult.data;
  const tenantId = authResult.context.tenantId;

  try {
    // Build query conditions - AC8: tenant isolation
    const conditions = [eq(titles.tenant_id, tenantId)];

    // Status filter
    if (status) {
      conditions.push(eq(titles.publication_status, status));
    }

    // Search filter (title or ISBN)
    if (search) {
      const searchCondition = or(
        ilike(titles.title, `%${search}%`),
        ilike(titles.isbn, `%${search}%`),
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    // Author filter using EXISTS subquery (proper SQL filtering for correct pagination)
    if (author_id) {
      conditions.push(
        exists(
          adminDb
            .select({ one: sql`1` })
            .from(titleAuthors)
            .where(
              and(
                eq(titleAuthors.title_id, titles.id),
                eq(titleAuthors.contact_id, author_id),
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
          lt(titles.updated_at, decoded.ts),
          and(eq(titles.updated_at, decoded.ts), gt(titles.id, decoded.id)),
        );
        if (cursorCondition) {
          conditions.push(cursorCondition);
        }
      }
    }

    // Fetch titles with authors (author_id filter applied in SQL via EXISTS)
    const result = await adminDb.query.titles.findMany({
      where: and(...conditions),
      with: {
        titleAuthors: {
          with: { contact: true },
          orderBy: [desc(titleAuthors.is_primary)],
        },
      },
      orderBy: [desc(titles.updated_at)],
      limit: limit + 1, // Fetch one extra to check has_more
    });

    const hasMore = result.length > limit;
    const data = result.slice(0, limit);
    const lastItem = data[data.length - 1];

    // Transform response per AC1
    const transformed = data.map((t) => ({
      id: t.id,
      title: t.title,
      subtitle: t.subtitle,
      isbn: t.isbn,
      asin: t.asin,
      genre: t.genre,
      publication_status: t.publication_status,
      publication_date: t.publication_date,
      word_count: t.word_count,
      authors:
        t.titleAuthors?.map((ta) => ({
          contactId: ta.contact_id,
          name: ta.contact
            ? `${ta.contact.first_name || ""} ${ta.contact.last_name || ""}`.trim()
            : "Unknown",
          isPrimary: ta.is_primary,
        })) || [],
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));

    // Get total count with same filters (excluding cursor for accurate filtered count)
    const countConditions = [eq(titles.tenant_id, tenantId)];

    if (status) {
      countConditions.push(eq(titles.publication_status, status));
    }

    if (search) {
      const searchCondition = or(
        ilike(titles.title, `%${search}%`),
        ilike(titles.isbn, `%${search}%`),
      );
      if (searchCondition) {
        countConditions.push(searchCondition);
      }
    }

    if (author_id) {
      countConditions.push(
        exists(
          adminDb
            .select({ one: sql`1` })
            .from(titleAuthors)
            .where(
              and(
                eq(titleAuthors.title_id, titles.id),
                eq(titleAuthors.contact_id, author_id),
              ),
            ),
        ),
      );
    }

    const countResult = await adminDb
      .select({ count: sql`count(*)` })
      .from(titles)
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

    // AC10: Rate limit headers with actual state from Story 15.3
    return addRateLimitHeaders(response, rateLimit.state);
  } catch (error) {
    console.error("[API] GET /api/v1/titles error:", error);
    return addRateLimitHeaders(
      apiError("server_error", "Failed to fetch titles", 500),
      rateLimit.state,
    );
  }
}

/**
 * POST /api/v1/titles
 *
 * AC3: Create new title
 * AC8: Tenant isolation
 * AC9: Error response format
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // AC8: Authenticate
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  // Story 15.3: Rate limit check
  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  // Check write scope
  const scopeError = requireScope(authResult.context, "write");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  try {
    const body = await request.json();
    const validation = createTitleSchema.safeParse(body);

    // AC9: Validation error format
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

    // Validate contact_id belongs to this tenant (tenant isolation)
    if (data.contact_id) {
      const contact = await adminDb.query.contacts.findFirst({
        where: and(
          eq(contacts.id, data.contact_id),
          eq(contacts.tenant_id, tenantId),
        ),
        columns: { id: true },
      });

      if (!contact) {
        return addRateLimitHeaders(
          validationError({ contact_id: "Contact not found" }),
          rateLimit.state,
        );
      }
    }

    // Create title with tenant_id
    const [created] = await adminDb
      .insert(titles)
      .values({
        ...data,
        tenant_id: tenantId,
      })
      .returning();

    const response = apiSuccess({ data: created }, 201);
    return addRateLimitHeaders(response, rateLimit.state);
  } catch (error) {
    console.error("[API] POST /api/v1/titles error:", error);

    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes("unique constraint")) {
      if (error.message.includes("isbn")) {
        return addRateLimitHeaders(
          validationError({ isbn: "ISBN already exists" }),
          rateLimit.state,
        );
      }
      if (error.message.includes("asin")) {
        return addRateLimitHeaders(
          validationError({ asin: "ASIN already exists" }),
          rateLimit.state,
        );
      }
    }

    return addRateLimitHeaders(
      apiError("server_error", "Failed to create title", 500),
      rateLimit.state,
    );
  }
}
