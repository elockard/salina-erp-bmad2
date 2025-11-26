"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { titles } from "@/db/schema/titles";
import { getCurrentTenantId, getDb, requirePermission } from "@/lib/auth";
import { CREATE_AUTHORS_TITLES } from "@/lib/permissions";
import type { ActionResult } from "@/lib/types";
import { getTitleById, getTitles } from "./queries";
import { createTitleSchema, updateTitleSchema } from "./schema";
import type { PublicationStatus, Title, TitleWithAuthor } from "./types";

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
    const insertValues: Record<string, unknown> = {
      tenant_id: tenantId,
      title: validated.title,
      subtitle: validated.subtitle || null,
      author_id: validated.author_id,
      genre: validated.genre || null,
      word_count: validated.word_count || null,
      publication_status: validated.publication_status || "draft",
      isbn: validated.isbn || null,
      eisbn: validated.eisbn || null,
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
    if (validated.author_id !== undefined) {
      updateValues.author_id = validated.author_id;
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
    if (validated.eisbn !== undefined) {
      updateValues.eisbn = validated.eisbn || null;
    }
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
