/**
 * Title Authors Module Server Actions
 *
 * Server actions for managing title-author relationships with ownership percentages.
 * Supports multiple authors per title for co-authored books with royalty splits.
 *
 * Story: 10.1 - Add Multiple Authors Per Title with Ownership Percentages
 * Related FRs: FR111 (Multiple authors per title), FR118 (Co-author relationship history)
 *
 * AC-10.1.2: Ownership percentage validation (sum to 100%)
 * AC-10.1.3: Backward compatibility for single-author titles
 * AC-10.1.6: Audit trail for ownership changes
 */

"use server";

import Decimal from "decimal.js";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { contacts } from "@/db/schema/contacts";
import { titleAuthors } from "@/db/schema/title-authors";
import { titles } from "@/db/schema/titles";
import { logAuditEvent } from "@/lib/audit";
import {
  getCurrentTenantId,
  getCurrentUser,
  getDb,
  requirePermission,
} from "@/lib/auth";
import { CREATE_AUTHORS_TITLES } from "@/lib/permissions";
import type { ActionResult } from "@/lib/types";
import { type TitleAuthorInputType, titleAuthorsArraySchema } from "./schema";
import type { TitleAuthorWithContact } from "./types";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validates that the title exists and belongs to the current tenant
 */
async function validateTitleAccess(
  db: Awaited<ReturnType<typeof getDb>>,
  titleId: string,
  tenantId: string,
): Promise<{ valid: boolean; error?: string }> {
  const [title] = await db
    .select({ id: titles.id })
    .from(titles)
    .where(and(eq(titles.id, titleId), eq(titles.tenant_id, tenantId)));

  if (!title) {
    return { valid: false, error: "Title not found or access denied" };
  }
  return { valid: true };
}

/**
 * Validates that the contact exists and belongs to the current tenant
 */
async function validateContactAccess(
  db: Awaited<ReturnType<typeof getDb>>,
  contactId: string,
  tenantId: string,
): Promise<{ valid: boolean; error?: string }> {
  const [contact] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.tenant_id, tenantId)));

  if (!contact) {
    return { valid: false, error: "Contact not found or access denied" };
  }
  return { valid: true };
}

/**
 * Gets current title authors for validation
 */
async function getCurrentTitleAuthors(
  db: Awaited<ReturnType<typeof getDb>>,
  titleId: string,
) {
  return db
    .select()
    .from(titleAuthors)
    .where(eq(titleAuthors.title_id, titleId));
}

// =============================================================================
// Add Author to Title
// =============================================================================

/**
 * Add a new author to a title
 * Permission: CREATE_AUTHORS_TITLES (owner, admin, editor)
 *
 * AC-10.1.2: Validates ownership percentage (1-100)
 * AC-10.1.6: Logs audit event for the addition
 *
 * NOTE: This action does NOT validate the 100% sum - use updateTitleAuthors for batch updates
 * This is intended for adding an author when percentages will be adjusted afterward
 */
export async function addAuthorToTitle(
  titleId: string,
  contactId: string,
  ownershipPercentage: string,
  isPrimary: boolean = false,
): Promise<ActionResult<TitleAuthorWithContact>> {
  try {
    // Check permission
    await requirePermission(CREATE_AUTHORS_TITLES);

    // Validate percentage range
    const pct = new Decimal(ownershipPercentage);
    if (pct.lt(1) || pct.gt(100)) {
      return {
        success: false,
        error: "Ownership percentage must be between 1 and 100",
      };
    }

    // Get tenant context and user
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();
    const db = await getDb();

    // Validate title access
    const titleCheck = await validateTitleAccess(db, titleId, tenantId);
    if (!titleCheck.valid) {
      return {
        success: false,
        error: titleCheck.error ?? "Title access denied",
      };
    }

    // Validate contact access
    const contactCheck = await validateContactAccess(db, contactId, tenantId);
    if (!contactCheck.valid) {
      return {
        success: false,
        error: contactCheck.error ?? "Contact access denied",
      };
    }

    // Check if author already exists on this title
    const existing = await db
      .select()
      .from(titleAuthors)
      .where(
        and(
          eq(titleAuthors.title_id, titleId),
          eq(titleAuthors.contact_id, contactId),
        ),
      );

    if (existing.length > 0) {
      return {
        success: false,
        error: "This author is already assigned to this title",
      };
    }

    // If setting as primary, unset any existing primary
    if (isPrimary) {
      await db
        .update(titleAuthors)
        .set({ is_primary: false })
        .where(eq(titleAuthors.title_id, titleId));
    }

    // Insert new title author
    const [newTitleAuthor] = await db
      .insert(titleAuthors)
      .values({
        title_id: titleId,
        contact_id: contactId,
        ownership_percentage: ownershipPercentage,
        is_primary: isPrimary,
        created_by: user?.id,
      })
      .returning();

    // Get contact for response
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, contactId));

    // Log audit event
    logAuditEvent({
      tenantId,
      userId: user?.id || null,
      actionType: "CREATE",
      resourceType: "title",
      resourceId: titleId,
      changes: {
        after: {
          action: "add_author",
          contact_id: contactId,
          ownership_percentage: ownershipPercentage,
          is_primary: isPrimary,
        },
      },
    });

    // Revalidate cache
    revalidatePath(`/titles/${titleId}`);
    revalidatePath("/titles");

    return {
      success: true,
      data: { ...newTitleAuthor, contact },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to manage titles",
      };
    }
    console.error("Error adding author to title:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add author",
    };
  }
}

// =============================================================================
// Remove Author from Title
// =============================================================================

/**
 * Remove an author from a title
 * Permission: CREATE_AUTHORS_TITLES (owner, admin, editor)
 *
 * AC-10.1.4: System prevents removing the last author
 * AC-10.1.6: Logs audit event for the removal
 *
 * NOTE: This action does NOT validate the 100% sum after removal
 * Use updateTitleAuthors for batch updates that maintain the 100% constraint
 */
export async function removeAuthorFromTitle(
  titleId: string,
  contactId: string,
): Promise<ActionResult<{ removed: boolean }>> {
  try {
    // Check permission
    await requirePermission(CREATE_AUTHORS_TITLES);

    // Get tenant context and user
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();
    const db = await getDb();

    // Validate title access
    const titleCheck = await validateTitleAccess(db, titleId, tenantId);
    if (!titleCheck.valid) {
      return {
        success: false,
        error: titleCheck.error ?? "Title access denied",
      };
    }

    // Get current authors
    const currentAuthors = await getCurrentTitleAuthors(db, titleId);

    // Prevent removing the last author (AC-10.1.4)
    if (currentAuthors.length <= 1) {
      return {
        success: false,
        error:
          "Cannot remove the last author. Title must have at least one author.",
      };
    }

    // Find the author to remove
    const authorToRemove = currentAuthors.find(
      (a) => a.contact_id === contactId,
    );
    if (!authorToRemove) {
      return {
        success: false,
        error: "Author not found on this title",
      };
    }

    // Delete the author
    await db
      .delete(titleAuthors)
      .where(
        and(
          eq(titleAuthors.title_id, titleId),
          eq(titleAuthors.contact_id, contactId),
        ),
      );

    // If removed author was primary, make the first remaining author primary
    if (authorToRemove.is_primary) {
      const remainingAuthors = currentAuthors.filter(
        (a) => a.contact_id !== contactId,
      );
      if (remainingAuthors.length > 0) {
        await db
          .update(titleAuthors)
          .set({ is_primary: true })
          .where(
            and(
              eq(titleAuthors.title_id, titleId),
              eq(titleAuthors.contact_id, remainingAuthors[0].contact_id),
            ),
          );
      }
    }

    // Log audit event
    logAuditEvent({
      tenantId,
      userId: user?.id || null,
      actionType: "DELETE",
      resourceType: "title",
      resourceId: titleId,
      changes: {
        before: {
          action: "remove_author",
          contact_id: contactId,
          ownership_percentage: authorToRemove.ownership_percentage,
          is_primary: authorToRemove.is_primary,
        },
      },
    });

    // Revalidate cache
    revalidatePath(`/titles/${titleId}`);
    revalidatePath("/titles");

    return {
      success: true,
      data: { removed: true },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to manage titles",
      };
    }
    console.error("Error removing author from title:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove author",
    };
  }
}

// =============================================================================
// Update Title Authors (Batch)
// =============================================================================

/**
 * Update all authors for a title (batch operation)
 * Permission: CREATE_AUTHORS_TITLES (owner, admin, editor)
 *
 * AC-10.1.2: Validates 100% sum using Decimal.js
 * AC-10.1.4: At least one author required
 * AC-10.1.5: Exactly one primary author
 * AC-10.1.6: Logs audit event for the update
 *
 * Uses transaction for atomicity: delete existing + insert new
 */
export async function updateTitleAuthors(
  titleId: string,
  authors: TitleAuthorInputType[],
): Promise<ActionResult<TitleAuthorWithContact[]>> {
  try {
    // Check permission
    await requirePermission(CREATE_AUTHORS_TITLES);

    // Validate input with Zod (includes 100% sum validation)
    const parseResult = titleAuthorsArraySchema.safeParse(authors);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((i) => i.message);
      return {
        success: false,
        error: errors.join(". "),
      };
    }

    // Get tenant context and user
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();
    const db = await getDb();

    // Validate title access
    const titleCheck = await validateTitleAccess(db, titleId, tenantId);
    if (!titleCheck.valid) {
      return {
        success: false,
        error: titleCheck.error ?? "Title access denied",
      };
    }

    // Validate all contact access
    for (const author of authors) {
      const contactCheck = await validateContactAccess(
        db,
        author.contact_id,
        tenantId,
      );
      if (!contactCheck.valid) {
        return {
          success: false,
          error: contactCheck.error ?? "Contact access denied",
        };
      }
    }

    // Get existing authors for audit log
    const existingAuthors = await getCurrentTitleAuthors(db, titleId);

    // Use a transaction for atomicity
    const newAuthors = await db.transaction(async (tx) => {
      // Delete all existing authors for this title
      await tx.delete(titleAuthors).where(eq(titleAuthors.title_id, titleId));

      // Insert new authors
      const inserted = await tx
        .insert(titleAuthors)
        .values(
          authors.map((a) => ({
            title_id: titleId,
            contact_id: a.contact_id,
            ownership_percentage: a.ownership_percentage,
            is_primary: a.is_primary,
            created_by: user?.id,
          })),
        )
        .returning();

      return inserted;
    });

    // Get contacts for response
    const contactIds = newAuthors.map((a) => a.contact_id);
    const contactRecords = await db
      .select()
      .from(contacts)
      .where(inArray(contacts.id, contactIds));

    const contactMap = new Map(contactRecords.map((c) => [c.id, c]));
    const result: TitleAuthorWithContact[] = newAuthors
      .map((a) => {
        const contact = contactMap.get(a.contact_id);
        if (!contact) return null;
        return { ...a, contact };
      })
      .filter((a): a is TitleAuthorWithContact => a !== null);

    // Log audit event
    logAuditEvent({
      tenantId,
      userId: user?.id || null,
      actionType: "UPDATE",
      resourceType: "title",
      resourceId: titleId,
      changes: {
        before: {
          action: "update_authors",
          authors: existingAuthors.map((a) => ({
            contact_id: a.contact_id,
            ownership_percentage: a.ownership_percentage,
            is_primary: a.is_primary,
          })),
        },
        after: {
          action: "update_authors",
          authors: authors,
        },
      },
    });

    // Revalidate cache
    revalidatePath(`/titles/${titleId}`);
    revalidatePath("/titles");

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to manage titles",
      };
    }
    console.error("Error updating title authors:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update authors",
    };
  }
}

// =============================================================================
// Set Primary Author
// =============================================================================

/**
 * Set the primary author for a title
 * Permission: CREATE_AUTHORS_TITLES (owner, admin, editor)
 *
 * AC-10.1.5: One author can be marked as primary
 * AC-10.1.6: Logs audit event for the change
 *
 * NOTE: Does not affect ownership percentages (AC-10.1.5)
 */
export async function setTitlePrimaryAuthor(
  titleId: string,
  contactId: string,
): Promise<ActionResult<{ updated: boolean }>> {
  try {
    // Check permission
    await requirePermission(CREATE_AUTHORS_TITLES);

    // Get tenant context and user
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();
    const db = await getDb();

    // Validate title access
    const titleCheck = await validateTitleAccess(db, titleId, tenantId);
    if (!titleCheck.valid) {
      return {
        success: false,
        error: titleCheck.error ?? "Title access denied",
      };
    }

    // Check if the contact is an author on this title
    const [targetAuthor] = await db
      .select()
      .from(titleAuthors)
      .where(
        and(
          eq(titleAuthors.title_id, titleId),
          eq(titleAuthors.contact_id, contactId),
        ),
      );

    if (!targetAuthor) {
      return {
        success: false,
        error: "Contact is not an author on this title",
      };
    }

    // Get current primary author for audit log
    const currentAuthors = await getCurrentTitleAuthors(db, titleId);
    const currentPrimary = currentAuthors.find((a) => a.is_primary);

    // Update: unset all primary flags, then set the new one
    await db.transaction(async (tx) => {
      // Unset all primary flags
      await tx
        .update(titleAuthors)
        .set({ is_primary: false })
        .where(eq(titleAuthors.title_id, titleId));

      // Set the new primary
      await tx
        .update(titleAuthors)
        .set({ is_primary: true })
        .where(
          and(
            eq(titleAuthors.title_id, titleId),
            eq(titleAuthors.contact_id, contactId),
          ),
        );
    });

    // Log audit event
    logAuditEvent({
      tenantId,
      userId: user?.id || null,
      actionType: "UPDATE",
      resourceType: "title",
      resourceId: titleId,
      changes: {
        before: {
          action: "set_primary_author",
          primary_contact_id: currentPrimary?.contact_id || null,
        },
        after: {
          action: "set_primary_author",
          primary_contact_id: contactId,
        },
      },
    });

    // Revalidate cache
    revalidatePath(`/titles/${titleId}`);
    revalidatePath("/titles");

    return {
      success: true,
      data: { updated: true },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to manage titles",
      };
    }
    console.error("Error setting primary author:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to set primary author",
    };
  }
}
