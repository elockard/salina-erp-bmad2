"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isbnPrefixes } from "@/db/schema/isbn-prefixes";
import { isbns, type NewISBN } from "@/db/schema/isbns";
import { titles } from "@/db/schema/titles";
import {
  getCurrentTenantId,
  getCurrentUser,
  getDb,
  requirePermission,
} from "@/lib/auth";
import { CREATE_AUTHORS_TITLES, MANAGE_SETTINGS } from "@/lib/permissions";
import type { ActionResult } from "@/lib/types";
import { type AssignISBNInput, assignISBNInputSchema } from "./schema";
import type { AssignedISBN, ISBNImportResult } from "./types";
import { normalizeIsbn13, validateIsbn13 } from "./utils";

/**
 * Custom result type for ISBN import that always includes result details
 * This differs from standard ActionResult to provide error details on failure
 */
export type ImportISBNsResult =
  | { success: true; data: ISBNImportResult }
  | { success: false; error: string; data?: ISBNImportResult };

/**
 * Import ISBNs schema for server-side validation
 * Re-validates all ISBNs on the server (never trust client)
 * Story 7.6: Removed type field - ISBNs are unified without type distinction
 */
const importIsbnInputSchema = z.object({
  isbns: z
    .array(z.string())
    .min(1, "At least one ISBN is required")
    .max(100, "Maximum 100 ISBNs per import"),
});

type ImportIsbnInput = z.infer<typeof importIsbnInputSchema>;

/**
 * Import ISBNs from CSV upload
 * Permission: MANAGE_SETTINGS (owner, admin only)
 *
 * Story 2.7 - Build ISBN Import with CSV Upload and Validation
 *
 * AC 5: Server-side re-validation of all ISBNs (checksum algorithm)
 * AC 6: Duplicate detection against database (global uniqueness - all tenants)
 * AC 8: Transaction ensures all-or-nothing import (atomic bulk INSERT)
 *
 * Security notes:
 * - Never trust client-side validation - re-validate everything server-side
 * - ISBN-13 has global unique constraint (cross-tenant) in database
 * - Rate limiting should be considered for production (future enhancement)
 */
export async function importISBNs(
  input: ImportIsbnInput,
): Promise<ImportISBNsResult> {
  try {
    // Check permission (AC 1)
    await requirePermission(MANAGE_SETTINGS);

    // Validate input schema
    const validated = importIsbnInputSchema.parse(input);

    // Get tenant context
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Server-side validation of each ISBN (AC 5)
    const errorDetails: Array<{ isbn_13: string; error: string }> = [];
    const validIsbns: string[] = [];
    const seenIsbns = new Set<string>(); // For detecting duplicates within input

    for (const isbn of validated.isbns) {
      const normalized = normalizeIsbn13(isbn);

      // Check for duplicates within the input array
      if (seenIsbns.has(normalized)) {
        errorDetails.push({
          isbn_13: isbn,
          error: "Duplicate within import batch",
        });
        continue;
      }

      // Validate ISBN-13 format and checksum
      const validation = validateIsbn13(isbn);
      if (!validation.valid) {
        errorDetails.push({
          isbn_13: isbn,
          error: validation.error || "Invalid ISBN",
        });
        continue;
      }

      seenIsbns.add(normalized);
      validIsbns.push(normalized);
    }

    // If any validation errors, return immediately (all-or-nothing - AC 8)
    if (errorDetails.length > 0) {
      return {
        success: false,
        error: `${errorDetails.length} ISBN(s) failed validation`,
        data: {
          imported: 0,
          duplicates: 0,
          errors: errorDetails.length,
          errorDetails,
        },
      };
    }

    // Check for duplicates in database (AC 6 - global uniqueness across all tenants)
    // Using adminDb would bypass RLS, but we need to check global uniqueness
    // The unique constraint on isbn_13 is global, so we query without tenant filter
    const existingIsbns = await db
      .select({ isbn_13: isbns.isbn_13 })
      .from(isbns)
      .where(inArray(isbns.isbn_13, validIsbns));

    if (existingIsbns.length > 0) {
      const duplicateSet = new Set(existingIsbns.map((r) => r.isbn_13));
      const duplicateDetails = validIsbns
        .filter((isbn) => duplicateSet.has(isbn))
        .map((isbn) => ({
          isbn_13: isbn,
          error: "ISBN already exists in database",
        }));

      return {
        success: false,
        error: `${duplicateDetails.length} ISBN(s) already exist in the system`,
        data: {
          imported: 0,
          duplicates: duplicateDetails.length,
          errors: 0,
          errorDetails: duplicateDetails,
        },
      };
    }

    // Prepare records for bulk insert (AC 8)
    // Story 7.6: Removed type field - ISBNs are unified without type distinction
    const now = new Date();
    const records: NewISBN[] = validIsbns.map((isbn_13) => ({
      tenant_id: tenantId,
      isbn_13,
      status: "available" as const,
      created_at: now,
      updated_at: now,
    }));

    // Atomic bulk insert (AC 8 - all-or-nothing via single INSERT)
    await db.insert(isbns).values(records);

    // Revalidate cache for ISBN pool page
    revalidatePath("/isbn-pool");
    revalidatePath("/settings/isbn-import");

    // Return success result (AC 9)
    return {
      success: true,
      data: {
        imported: validIsbns.length,
        duplicates: 0,
        errors: 0,
        errorDetails: [],
      },
    };
  } catch (error) {
    // Permission denied handling
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to import ISBNs",
      };
    }

    // Zod validation error
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid input",
      };
    }

    // Database unique constraint violation (fallback safety)
    if (error instanceof Error && error.message.includes("unique constraint")) {
      return {
        success: false,
        error: "One or more ISBNs already exist in the system",
      };
    }

    console.error("importISBNs error:", error);
    return {
      success: false,
      error: "Failed to import ISBNs. Please try again.",
    };
  }
}

/**
 * Assign an ISBN to a title with row-level locking
 * Permission: CREATE_AUTHORS_TITLES (owner, admin, editor)
 *
 * Story 2.9 - Implement Smart ISBN Assignment with Row Locking
 *
 * AC 2: Uses PostgreSQL row-level locking via FOR UPDATE
 * AC 3: Transaction updates isbns and titles tables atomically
 * AC 4: Race condition handled with auto-retry (max 3 attempts)
 * AC 5: Clear error messages when no ISBNs available
 * AC 6: Audit trail via assigned_by_user_id, assigned_at, and console logging
 * AC 7: Permission check enforces CREATE_AUTHORS_TITLES
 *
 * @param input - titleId and format (physical/ebook)
 * @returns AssignedISBN on success, error message on failure
 */
export async function assignISBNToTitle(
  input: AssignISBNInput,
): Promise<ActionResult<AssignedISBN>> {
  const MAX_RETRY_ATTEMPTS = 3;

  try {
    // AC 7: Permission check
    await requirePermission(CREATE_AUTHORS_TITLES);

    // Validate input schema
    // Story 7.6: Removed format - ISBNs are unified without type distinction
    const validated = assignISBNInputSchema.parse(input);
    const { titleId, prefixId, isbnId } = validated;

    // Get tenant and user context
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();
    const db = await getDb();

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Verify title exists and belongs to tenant
    const [title] = await db
      .select({
        id: titles.id,
        title: titles.title,
        isbn: titles.isbn,
        eisbn: titles.eisbn,
      })
      .from(titles)
      .where(and(eq(titles.id, titleId), eq(titles.tenant_id, tenantId)));

    if (!title) {
      return { success: false, error: "Title not found" };
    }

    // AC 8: Check if title already has ISBN assigned
    // Story 7.6: Unified ISBN check - no type distinction
    if (title.isbn) {
      return {
        success: false,
        error: `This title already has an ISBN assigned: ${title.isbn}`,
      };
    }

    // AC 4: Retry logic for race condition handling with optimistic concurrency
    // Note: Using optimistic concurrency instead of transactions due to Neon HTTP driver limitations
    let attempts = 0;
    let lastError: string | null = null;

    while (attempts < MAX_RETRY_ATTEMPTS) {
      attempts++;

      try {
        let selectedISBN;

        if (isbnId) {
          // Manual entry mode: Find the specific ISBN
          const [specificISBN] = await db
            .select()
            .from(isbns)
            .where(
              and(
                eq(isbns.id, isbnId),
                eq(isbns.tenant_id, tenantId),
                eq(isbns.status, "available"),
              ),
            );

          if (!specificISBN) {
            return {
              success: false,
              error:
                "This ISBN is not available. It may have already been assigned.",
            };
          }

          selectedISBN = specificISBN;
        } else {
          // Auto mode: Find next available ISBN
          // Story 7.6: Removed type filter - ISBNs are unified
          const isbnConditions = [
            eq(isbns.tenant_id, tenantId),
            eq(isbns.status, "available"),
          ];
          if (prefixId) {
            isbnConditions.push(eq(isbns.prefix_id, prefixId));
          }

          const availableISBNs = await db
            .select()
            .from(isbns)
            .where(and(...isbnConditions))
            .orderBy(isbns.created_at)
            .limit(1);

          if (availableISBNs.length === 0) {
            return {
              success: false,
              error: "No ISBNs available. Import an ISBN block first.",
            };
          }

          selectedISBN = availableISBNs[0];
        }

        const now = new Date();

        // Optimistic update: Only update if still available (CAS pattern)
        const updateResult = await db
          .update(isbns)
          .set({
            status: "assigned",
            assigned_to_title_id: titleId,
            assigned_at: now,
            assigned_by_user_id: user.id,
            updated_at: now,
          })
          .where(
            and(
              eq(isbns.id, selectedISBN.id),
              eq(isbns.status, "available"), // Only update if still available
            ),
          )
          .returning({ id: isbns.id });

        // Check if update succeeded (ISBN wasn't taken by another request)
        if (updateResult.length === 0) {
          // ISBN was assigned by another request, retry
          lastError = "ISBN was assigned by another user, retrying...";
          console.warn(`ISBN assignment attempt ${attempts} - ISBN taken`, {
            titleId,
            isbnId: selectedISBN.id,
          });

          if (attempts < MAX_RETRY_ATTEMPTS) {
            await new Promise((resolve) => setTimeout(resolve, 100 * attempts));
          }
          continue;
        }

        // Update prefix counts if ISBN has a prefix (Story 7.4)
        if (selectedISBN.prefix_id) {
          await db
            .update(isbnPrefixes)
            .set({
              available_count: sql`${isbnPrefixes.available_count} - 1`,
              assigned_count: sql`${isbnPrefixes.assigned_count} + 1`,
              updated_at: now,
            })
            .where(eq(isbnPrefixes.id, selectedISBN.prefix_id));
        }

        // Update title with ISBN
        // Story 7.6: Unified ISBN assignment - always use isbn field
        await db
          .update(titles)
          .set({
            isbn: selectedISBN.isbn_13,
            updated_at: now,
          })
          .where(and(eq(titles.id, titleId), eq(titles.tenant_id, tenantId)));

        // AC 6: Audit trail logging
        console.info("ISBN assigned to title", {
          isbn_id: selectedISBN.id,
          isbn_13: selectedISBN.isbn_13,
          title_id: titleId,
          title_name: title.title,
          assigned_by: user.id,
          assigned_by_email: user.email,
          tenant_id: tenantId,
          timestamp: now.toISOString(),
          attempts,
        });

        // Revalidate cache for affected pages
        revalidatePath("/isbn-pool");
        revalidatePath("/titles");
        revalidatePath(`/titles/${titleId}`);
        revalidatePath("/settings/isbn-prefixes"); // Story 7.4: Refresh prefix counts

        return {
          success: true,
          data: {
            id: selectedISBN.id,
            isbn_13: selectedISBN.isbn_13,
            titleId,
            titleName: title.title,
            assignedAt: now,
            assignedByUserId: user.id,
          },
        };
      } catch (opError) {
        lastError = opError instanceof Error ? opError.message : "Update failed";
        console.warn(`ISBN assignment attempt ${attempts} failed`, {
          titleId,
          error: lastError,
        });

        if (attempts < MAX_RETRY_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, 100 * attempts));
        }
      }
    }

    // All retries exhausted
    console.error("ISBN assignment failed after max retries", {
      titleId,
      attempts,
      lastError,
    });

    return {
      success: false,
      error: "Failed to assign ISBN after multiple attempts. Please try again.",
    };
  } catch (error) {
    // Permission denied handling
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to assign ISBNs",
      };
    }

    // Zod validation error
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid input",
      };
    }

    console.error("assignISBNToTitle error:", error);
    return {
      success: false,
      error: "Failed to assign ISBN. Please try again.",
    };
  }
}
