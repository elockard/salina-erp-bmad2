/**
 * Titles API - Single Title Operations
 *
 * Story 15.2 - Task 2
 * AC2: GET /api/v1/titles/:id - get single title
 * AC4: PUT /api/v1/titles/:id - update title
 */

import { and, desc, eq } from "drizzle-orm";
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
import { addRateLimitHeaders } from "@/modules/api/utils/rate-limit-headers";
import {
  apiError,
  apiSuccess,
  notFound,
  validationError,
} from "@/modules/api/utils/response";

/**
 * Update title validation schema
 * AC4: Partial updates supported
 */
const updateTitleSchema = z.object({
  // Basic metadata
  title: z.string().min(1).max(500).optional(),
  subtitle: z.string().max(500).optional().nullable(),
  genre: z.string().max(100).optional().nullable(),
  word_count: z.number().int().positive().optional().nullable(),

  // Identifiers
  isbn: z
    .string()
    .regex(/^97[89]\d{10}$/, "ISBN must be valid ISBN-13 format")
    .optional()
    .nullable(),
  asin: z
    .string()
    .regex(/^[A-Z0-9]{10}$/, "ASIN must be 10 alphanumeric characters")
    .optional()
    .nullable(),

  // Publishing info
  publication_status: z.enum(publicationStatusValues).optional(),
  publication_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format")
    .optional()
    .nullable(),

  // Contact/Author reference
  contact_id: z.string().uuid().optional().nullable(),

  // Accessibility (Story 14.3)
  epub_accessibility_conformance: z.string().optional().nullable(),
  accessibility_features: z.array(z.string()).optional().nullable(),
  accessibility_hazards: z.array(z.string()).optional().nullable(),
  accessibility_summary: z.string().optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/titles/:id
 *
 * AC2: Get single title with full details
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
    return notFound("Title");
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
    // Fetch title with tenant isolation
    const title = await adminDb.query.titles.findFirst({
      where: and(eq(titles.id, id), eq(titles.tenant_id, tenantId)),
      with: {
        titleAuthors: {
          with: { contact: true },
          orderBy: [desc(titleAuthors.is_primary)],
        },
      },
    });

    // AC8: Return 404 for not found OR wrong tenant
    if (!title) {
      return addRateLimitHeaders(notFound("Title"), rateLimit.state);
    }

    // Transform response with full details
    const transformed = {
      id: title.id,
      title: title.title,
      subtitle: title.subtitle,
      isbn: title.isbn,
      eisbn: title.eisbn,
      asin: title.asin,
      genre: title.genre,
      word_count: title.word_count,
      publication_status: title.publication_status,
      publication_date: title.publication_date,
      contact_id: title.contact_id,
      // Accessibility metadata
      epub_accessibility_conformance: title.epub_accessibility_conformance,
      accessibility_features: title.accessibility_features,
      accessibility_hazards: title.accessibility_hazards,
      accessibility_summary: title.accessibility_summary,
      // Authors
      authors:
        title.titleAuthors?.map((ta) => ({
          contactId: ta.contact_id,
          name: ta.contact
            ? `${ta.contact.first_name || ""} ${ta.contact.last_name || ""}`.trim()
            : "Unknown",
          isPrimary: ta.is_primary,
          ownershipPercentage: ta.ownership_percentage,
        })) || [],
      created_at: title.created_at,
      updated_at: title.updated_at,
    };

    const response = apiSuccess({ data: transformed });
    return addRateLimitHeaders(response, rateLimit.state);
  } catch (error) {
    console.error("[API] GET /api/v1/titles/:id error:", error);
    return addRateLimitHeaders(
      apiError("server_error", "Failed to fetch title", 500),
      rateLimit.state,
    );
  }
}

/**
 * PUT /api/v1/titles/:id
 *
 * AC4: Update title with partial updates
 * AC8: Tenant isolation
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return notFound("Title");
  }

  // Authenticate
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  // Story 15.3: Rate limit check
  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  const scopeError = requireScope(authResult.context, "write");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  const tenantId = authResult.context.tenantId;

  try {
    const body = await request.json();
    const validation = updateTitleSchema.safeParse(body);

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

    // Check title exists and belongs to tenant
    const existing = await adminDb.query.titles.findFirst({
      where: and(eq(titles.id, id), eq(titles.tenant_id, tenantId)),
    });

    if (!existing) {
      return addRateLimitHeaders(notFound("Title"), rateLimit.state);
    }

    // Validate contact_id belongs to this tenant (tenant isolation)
    if (validation.data.contact_id) {
      const contact = await adminDb.query.contacts.findFirst({
        where: and(
          eq(contacts.id, validation.data.contact_id),
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

    // Update title
    const updateData = {
      ...validation.data,
      updated_at: new Date(),
    };

    const [updated] = await adminDb
      .update(titles)
      .set(updateData)
      .where(and(eq(titles.id, id), eq(titles.tenant_id, tenantId)))
      .returning();

    // Fetch with authors for response
    const titleWithAuthors = await adminDb.query.titles.findFirst({
      where: eq(titles.id, id),
      with: {
        titleAuthors: {
          with: { contact: true },
          orderBy: [desc(titleAuthors.is_primary)],
        },
      },
    });

    const transformed = {
      id: updated.id,
      title: updated.title,
      subtitle: updated.subtitle,
      isbn: updated.isbn,
      eisbn: updated.eisbn,
      asin: updated.asin,
      genre: updated.genre,
      word_count: updated.word_count,
      publication_status: updated.publication_status,
      publication_date: updated.publication_date,
      contact_id: updated.contact_id,
      epub_accessibility_conformance: updated.epub_accessibility_conformance,
      accessibility_features: updated.accessibility_features,
      accessibility_hazards: updated.accessibility_hazards,
      accessibility_summary: updated.accessibility_summary,
      authors:
        titleWithAuthors?.titleAuthors?.map((ta) => ({
          contactId: ta.contact_id,
          name: ta.contact
            ? `${ta.contact.first_name || ""} ${ta.contact.last_name || ""}`.trim()
            : "Unknown",
          isPrimary: ta.is_primary,
        })) || [],
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };

    const response = apiSuccess({ data: transformed });
    return addRateLimitHeaders(response, rateLimit.state);
  } catch (error) {
    console.error("[API] PUT /api/v1/titles/:id error:", error);

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
      apiError("server_error", "Failed to update title", 500),
      rateLimit.state,
    );
  }
}
