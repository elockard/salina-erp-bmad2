"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { titles } from "@/db/schema/titles";
import { getCurrentTenantId, getDb, requirePermission } from "@/lib/auth";
import { CREATE_AUTHORS_TITLES } from "@/lib/permissions";
import type { ActionResult } from "@/lib/types";
import { webhookEvents } from "@/modules/api/webhooks/dispatcher";
import { getTitleById, getTitles } from "./queries";
import {
  accessibilitySchema,
  asinSchema,
  bisacSchema,
  createTitleSchema,
  updateTitleSchema,
} from "./schema";
import type { PublicationStatus, TitleWithAuthor } from "./types";

/**
 * Server Action wrapper for getTitles query
 * Used by client components to fetch titles with filters
 *
 * AC 2, 3: Fetch titles with author relations
 */
export async function fetchTitles(options?: {
  status?: PublicationStatus;
  search?: string;
}): Promise<TitleWithAuthor[]> {
  return getTitles({
    status: options?.status,
    search: options?.search,
  });
}

/**
 * Server Action wrapper for getTitleById query
 * Used by client components to fetch a single title
 */
export async function fetchTitleById(
  id: string,
): Promise<TitleWithAuthor | null> {
  return getTitleById(id);
}

/**
 * Create a new title
 * Permission: CREATE_AUTHORS_TITLES (owner, admin, editor)
 *
 * AC 5: Submit creates title via Server Action
 * AC 6: Server Actions return 403 if permission denied
 */
export async function createTitle(
  data: unknown,
): Promise<ActionResult<TitleWithAuthor>> {
  try {
    // Check permission
    await requirePermission(CREATE_AUTHORS_TITLES);

    // Validate input
    const validated = createTitleSchema.parse(data);

    // Get tenant context
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Prepare insert values
    // Story 7.6: Removed eisbn - ISBNs are unified without type distinction
    // Story 7.3: Use contact_id instead of deprecated author_id
    const insertValues: Record<string, unknown> = {
      tenant_id: tenantId,
      title: validated.title,
      subtitle: validated.subtitle || null,
      contact_id: validated.author_id, // author_id from form is now a contact ID
      genre: validated.genre || null,
      word_count: validated.word_count || null,
      publication_status: validated.publication_status || "draft",
      isbn: validated.isbn || null,
      publication_date: validated.publication_date || null,
    };

    // Insert title
    const [title] = await db
      .insert(titles)
      .values(insertValues as typeof titles.$inferInsert)
      .returning();

    // Revalidate cache
    revalidatePath("/dashboard/titles");

    // Fetch the complete title with author relation
    const titleWithAuthor = await getTitleById(title.id);

    if (!titleWithAuthor) {
      return { success: false, error: "Failed to fetch created title" };
    }

    // Fire-and-forget webhook dispatch (Story 15.5)
    webhookEvents
      .titleCreated(tenantId, {
        id: titleWithAuthor.id,
        title: titleWithAuthor.title,
        isbn: titleWithAuthor.isbn,
      })
      .catch(() => {}); // Ignore errors

    return { success: true, data: titleWithAuthor };
  } catch (error) {
    // Permission denied
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to create titles",
      };
    }

    // Zod validation error
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid input",
      };
    }

    console.error("createTitle error:", error);
    return {
      success: false,
      error: "Failed to create title. Please try again.",
    };
  }
}

/**
 * Update an existing title
 * Permission: CREATE_AUTHORS_TITLES (owner, admin, editor)
 *
 * AC 3: Inline edit capability
 * AC 6: Server Actions return 403 if permission denied
 */
export async function updateTitle(
  id: string,
  data: unknown,
): Promise<ActionResult<TitleWithAuthor>> {
  try {
    // Check permission
    await requirePermission(CREATE_AUTHORS_TITLES);

    // Validate input
    const validated = updateTitleSchema.parse(data);

    // Get tenant context
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Get existing title to verify ownership
    const existing = await db.query.titles.findFirst({
      where: and(eq(titles.id, id), eq(titles.tenant_id, tenantId)),
    });

    if (!existing) {
      return { success: false, error: "Title not found" };
    }

    // Prepare update values
    const updateValues: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (validated.title !== undefined) {
      updateValues.title = validated.title;
    }
    if (validated.subtitle !== undefined) {
      updateValues.subtitle = validated.subtitle || null;
    }
    // Story 7.3: Use contact_id instead of deprecated author_id
    if (validated.author_id !== undefined) {
      updateValues.contact_id = validated.author_id;
    }
    if (validated.genre !== undefined) {
      updateValues.genre = validated.genre || null;
    }
    if (validated.word_count !== undefined) {
      updateValues.word_count = validated.word_count;
    }
    if (validated.publication_status !== undefined) {
      updateValues.publication_status = validated.publication_status;
    }
    if (validated.isbn !== undefined) {
      updateValues.isbn = validated.isbn || null;
    }
    // Story 7.6: Removed eisbn - ISBNs are unified without type distinction
    if (validated.publication_date !== undefined) {
      updateValues.publication_date = validated.publication_date || null;
    }

    // Update title
    await db
      .update(titles)
      .set(updateValues)
      .where(and(eq(titles.id, id), eq(titles.tenant_id, tenantId)));

    // Revalidate cache
    revalidatePath("/dashboard/titles");

    // Fetch updated title with author relation
    const titleWithAuthor = await getTitleById(id);

    if (!titleWithAuthor) {
      return { success: false, error: "Failed to fetch updated title" };
    }

    // Fire-and-forget webhook dispatch (Story 15.5)
    // Build list of changed fields for webhook payload
    const changedFields = Object.keys(updateValues).filter(
      (k) => k !== "updated_at",
    );
    webhookEvents
      .titleUpdated(tenantId, {
        id: titleWithAuthor.id,
        title: titleWithAuthor.title,
        changes: changedFields,
      })
      .catch(() => {}); // Ignore errors

    return { success: true, data: titleWithAuthor };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to update titles",
      };
    }

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid input",
      };
    }

    console.error("updateTitle error:", error);
    return {
      success: false,
      error: "Failed to update title. Please try again.",
    };
  }
}

/**
 * Update title accessibility metadata
 * Permission: CREATE_AUTHORS_TITLES (owner, admin, editor)
 *
 * Story 14.3 - AC1, AC2, AC3: Accessibility metadata configuration
 * Task 7: Server actions for accessibility
 */
export async function updateTitleAccessibility(
  id: string,
  data: unknown,
): Promise<ActionResult<TitleWithAuthor>> {
  try {
    // Check permission
    await requirePermission(CREATE_AUTHORS_TITLES);

    // Validate input
    const validated = accessibilitySchema.parse(data);

    // Get tenant context
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Get existing title to verify ownership
    const existing = await db.query.titles.findFirst({
      where: and(eq(titles.id, id), eq(titles.tenant_id, tenantId)),
    });

    if (!existing) {
      return { success: false, error: "Title not found" };
    }

    // Update accessibility fields
    await db
      .update(titles)
      .set({
        epub_accessibility_conformance:
          validated.epub_accessibility_conformance ?? null,
        accessibility_features: validated.accessibility_features ?? null,
        accessibility_hazards: validated.accessibility_hazards ?? null,
        accessibility_summary: validated.accessibility_summary ?? null,
        updated_at: new Date(),
      })
      .where(and(eq(titles.id, id), eq(titles.tenant_id, tenantId)));

    // Revalidate cache
    revalidatePath("/dashboard/titles");

    // Fetch updated title with author relation
    const titleWithAuthor = await getTitleById(id);

    if (!titleWithAuthor) {
      return { success: false, error: "Failed to fetch updated title" };
    }

    // Fire-and-forget webhook dispatch (Story 15.5)
    webhookEvents
      .titleUpdated(tenantId, {
        id: titleWithAuthor.id,
        title: titleWithAuthor.title,
        changes: ["accessibility_metadata"],
      })
      .catch(() => {}); // Ignore errors

    return { success: true, data: titleWithAuthor };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to update titles",
      };
    }

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid accessibility data",
      };
    }

    console.error("updateTitleAccessibility error:", error);
    return {
      success: false,
      error: "Failed to update accessibility metadata. Please try again.",
    };
  }
}

/**
 * Update title ASIN
 * Permission: CREATE_AUTHORS_TITLES (owner, admin, editor)
 *
 * Story 17.4 - Link Titles to ASINs
 * AC2: Manually Enter ASIN
 */
export async function updateTitleAsin(
  titleId: string,
  asin: string | null,
): Promise<ActionResult<TitleWithAuthor>> {
  try {
    // Check permission (same as updateTitle)
    await requirePermission(CREATE_AUTHORS_TITLES);

    // Validate ASIN format
    let validatedAsin: string | null = null;
    if (asin !== null && asin !== "") {
      const validated = asinSchema.parse(asin);
      validatedAsin = validated ?? null;
    }

    // Get tenant context
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Get existing title to verify ownership
    const existing = await db.query.titles.findFirst({
      where: and(eq(titles.id, titleId), eq(titles.tenant_id, tenantId)),
    });

    if (!existing) {
      return { success: false, error: "Title not found" };
    }

    // Check ASIN uniqueness (global - use adminDb for cross-tenant check)
    if (validatedAsin) {
      const { adminDb } = await import("@/db");
      const existingAsin = await adminDb.query.titles.findFirst({
        where: eq(titles.asin, validatedAsin),
      });

      if (existingAsin && existingAsin.id !== titleId) {
        return {
          success: false,
          error: "This ASIN is already linked to another title",
        };
      }
    }

    // Update ASIN
    await db
      .update(titles)
      .set({
        asin: validatedAsin,
        updated_at: new Date(),
      })
      .where(and(eq(titles.id, titleId), eq(titles.tenant_id, tenantId)));

    // Revalidate cache
    revalidatePath("/dashboard/titles");

    // Fetch updated title
    const titleWithAuthor = await getTitleById(titleId);

    if (!titleWithAuthor) {
      return { success: false, error: "Failed to fetch updated title" };
    }

    // Fire-and-forget webhook dispatch (Story 15.5)
    webhookEvents
      .titleUpdated(tenantId, {
        id: titleWithAuthor.id,
        title: titleWithAuthor.title,
        changes: ["asin"],
      })
      .catch(() => {}); // Ignore errors

    return { success: true, data: titleWithAuthor };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to update titles",
      };
    }

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid ASIN format",
      };
    }

    console.error("updateTitleAsin error:", error);
    return {
      success: false,
      error: "Failed to update ASIN. Please try again.",
    };
  }
}

/**
 * Update BISAC subject codes for a title
 *
 * Story 19.5: BISAC Code Suggestions
 *
 * @param titleId - Title ID to update
 * @param bisacCode - Primary BISAC code
 * @param bisacCodes - Secondary BISAC codes array (max 2)
 */
export async function updateTitleBisac(
  titleId: string,
  bisacCode: string | null,
  bisacCodes: string[] | null,
): Promise<ActionResult<TitleWithAuthor>> {
  try {
    // Check permission
    await requirePermission(CREATE_AUTHORS_TITLES);

    // Validate BISAC data
    const validated = bisacSchema.parse({
      bisac_code: bisacCode,
      bisac_codes: bisacCodes,
    });

    // Get tenant context
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Get existing title to verify ownership
    const existing = await db.query.titles.findFirst({
      where: and(eq(titles.id, titleId), eq(titles.tenant_id, tenantId)),
    });

    if (!existing) {
      return { success: false, error: "Title not found" };
    }

    // Update BISAC codes
    await db
      .update(titles)
      .set({
        bisac_code: validated.bisac_code ?? null,
        bisac_codes: validated.bisac_codes ?? null,
        updated_at: new Date(),
      })
      .where(and(eq(titles.id, titleId), eq(titles.tenant_id, tenantId)));

    // Revalidate cache
    revalidatePath("/dashboard/titles");

    // Fetch updated title
    const titleWithAuthor = await getTitleById(titleId);

    if (!titleWithAuthor) {
      return { success: false, error: "Failed to fetch updated title" };
    }

    // Fire-and-forget webhook dispatch
    webhookEvents
      .titleUpdated(tenantId, {
        id: titleWithAuthor.id,
        title: titleWithAuthor.title,
        changes: ["bisac_code", "bisac_codes"],
      })
      .catch(() => {}); // Ignore errors

    return { success: true, data: titleWithAuthor };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to update titles",
      };
    }

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid BISAC code format",
      };
    }

    console.error("updateTitleBisac error:", error);
    return {
      success: false,
      error: "Failed to update BISAC codes. Please try again.",
    };
  }
}
