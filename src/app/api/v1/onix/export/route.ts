/**
 * ONIX Export API
 *
 * Story 15.2 - Task 5
 * AC7: GET /api/v1/onix/export - ONIX 3.0/3.1 XML export
 */

import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/db";
import { tenants } from "@/db/schema/tenants";
import { titleAuthors } from "@/db/schema/title-authors";
import { titles } from "@/db/schema/titles";
import {
  authenticateApiRequest,
  requireScope,
} from "@/modules/api/middleware/auth-middleware";
import { checkRateLimit } from "@/modules/api/middleware/rate-limiter";
import { addRateLimitHeaders } from "@/modules/api/utils/rate-limit-headers";
import { apiError, validationError } from "@/modules/api/utils/response";
import { ONIXMessageBuilder } from "@/modules/onix/builder/message-builder";
import type { TitleWithAuthors } from "@/modules/title-authors/queries";
import type { TitleAuthorWithContact } from "@/modules/title-authors/types";

/**
 * Query params validation schema
 * AC7: Filtering by title_ids, version, since
 */
const querySchema = z.object({
  title_ids: z.string().optional(), // comma-separated UUIDs
  version: z.enum(["3.1", "3.0"]).default("3.1"),
  since: z
    .string()
    .datetime({ message: "Since must be ISO-8601 datetime" })
    .optional(),
});

/**
 * GET /api/v1/onix/export
 *
 * AC7: ONIX 3.0/3.1 XML export
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
  const queryResult = querySchema.safeParse(Object.fromEntries(searchParams));

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

  const { title_ids, version, since } = queryResult.data;
  const tenantId = authResult.context.tenantId;

  try {
    // Build conditions - AC8: tenant isolation
    const conditions = [eq(titles.tenant_id, tenantId)];

    // Filter by specific title IDs if provided
    if (title_ids) {
      const ids = title_ids.split(",").filter(Boolean);
      // Validate UUID format for each ID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const invalidIds = ids.filter((id) => !uuidRegex.test(id));
      if (invalidIds.length > 0) {
        return addRateLimitHeaders(
          validationError({
            title_ids: `Invalid UUID format: ${invalidIds.join(", ")}`,
          }),
          rateLimit.state,
        );
      }
      if (ids.length > 0) {
        conditions.push(inArray(titles.id, ids));
      }
    }

    // Filter by updated since if provided
    if (since) {
      conditions.push(gt(titles.updated_at, new Date(since)));
    }

    // Fetch titles
    const titlesData = await adminDb.query.titles.findMany({
      where: and(...conditions),
      orderBy: [desc(titles.updated_at)],
    });

    // AC7: For large catalogs (>500 titles), warn (actual streaming would be a future enhancement)
    if (titlesData.length > 500) {
      console.warn(
        `[API] ONIX export for tenant ${tenantId} has ${titlesData.length} titles - consider pagination`,
      );
    }

    // Batch fetch all authors for the titles
    const titleIds = titlesData.map((t) => t.id);
    let allAuthors: TitleAuthorWithContact[] = [];

    if (titleIds.length > 0) {
      const authorsResult = await adminDb.query.titleAuthors.findMany({
        where: inArray(titleAuthors.title_id, titleIds),
        with: {
          contact: true,
        },
        orderBy: [
          desc(titleAuthors.is_primary),
          desc(titleAuthors.ownership_percentage),
        ],
      });
      allAuthors = authorsResult as TitleAuthorWithContact[];
    }

    // Group authors by title_id for O(1) lookup
    const authorsByTitleId = new Map<string, TitleAuthorWithContact[]>();
    for (const author of allAuthors) {
      const existing = authorsByTitleId.get(author.title_id) || [];
      existing.push(author);
      authorsByTitleId.set(author.title_id, existing);
    }

    // Get tenant info for ONIX header
    const tenant = await adminDb.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return apiError("server_error", "Tenant not found", 500);
    }

    // Build ONIX message - version passed to constructor
    const builder = new ONIXMessageBuilder(tenantId, tenant, version);

    // Transform titles to TitleWithAuthors format and add to builder
    for (const title of titlesData) {
      const authors = authorsByTitleId.get(title.id) || [];
      const primaryAuthor = authors.find((a) => a.is_primary) || null;

      const titleWithAuthors: TitleWithAuthors = {
        id: title.id,
        title: title.title,
        subtitle: title.subtitle,
        isbn: title.isbn,
        tenant_id: title.tenant_id,
        publication_status: title.publication_status,
        created_at: title.created_at,
        updated_at: title.updated_at,
        authors,
        primaryAuthor,
        isSoleAuthor: authors.length === 1,
        epub_accessibility_conformance: title.epub_accessibility_conformance,
        accessibility_features: title.accessibility_features,
        accessibility_hazards: title.accessibility_hazards,
        accessibility_summary: title.accessibility_summary,
        bisac_code: title.bisac_code,
        bisac_codes: title.bisac_codes,
      };

      builder.addTitle(titleWithAuthors);
    }

    // Generate ONIX XML
    const xml = builder.toXML();

    // Return XML response
    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="onix-export-${new Date().toISOString().slice(0, 10)}.xml"`,
        // Include count in custom header for debugging
        "X-Title-Count": titlesData.length.toString(),
      },
    });
  } catch (error) {
    console.error("[API] GET /api/v1/onix/export error:", error);
    return apiError("server_error", "Failed to generate ONIX export", 500);
  }
}
