"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
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
import {
  type AssignISBNInput,
  assignISBNInputSchema,
  isbnTypeSchema,
} from "./schema";
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
 */
const importIsbnInputSchema = z.object({
  isbns: z
    .array(z.string())
    .min(1, "At least one ISBN is required")
    .max(100, "Maximum 100 ISBNs per import"),
  type: isbnTypeSchema,
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
    const now = new Date();
    const records: NewISBN[] = validIsbns.map((isbn_13) => ({
      tenant_id: tenantId,
      isbn_13,
      type: validated.type,
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
    const validated = assignISBNInputSchema.parse(input);
    const { titleId, format } = validated;

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

    // AC 8: Check if title already has ISBN assigned for this format
    const existingIsbn = format === "physical" ? title.isbn : title.eisbn;
    if (existingIsbn) {
      return {
        success: false,
        error: `This title already has a ${format === "physical" ? "Physical" : "Ebook"} ISBN assigned: ${existingIsbn}`,
      };
    }

    // AC 4: Retry logic for race condition handling
    let attempts = 0;
    let lastError: string | null = null;

    while (attempts < MAX_RETRY_ATTEMPTS) {
      attempts++;

      try {
        // AC 2, 3: Transaction with row-level locking
        const result = await db.transaction(async (tx) => {
          // Step 1: Find and lock available ISBN (AC 2 - FOR UPDATE row lock)
          const availableISBNs = await tx
            .select()
            .from(isbns)
            .where(
              and(
                eq(isbns.tenant_id, tenantId),
                eq(isbns.status, "available"),
                eq(isbns.type, format),
              ),
            )
            .limit(1)
            .for("update", { skipLocked: true }); // Skip locked rows to avoid waiting

          if (availableISBNs.length === 0) {
            // AC 5: Clear error message when no ISBNs available
            throw new Error(
              `No ${format === "physical" ? "Physical" : "Ebook"} ISBNs available. Import an ISBN block first.`,
            );
          }

          const selectedISBN = availableISBNs[0];
          const now = new Date();

          // Step 2: Update ISBN status (AC 3)
          await tx
            .update(isbns)
            .set({
              status: "assigned",
              assigned_to_title_id: titleId,
              assigned_at: now,
              assigned_by_user_id: user.id,
              updated_at: now,
            })
            .where(eq(isbns.id, selectedISBN.id));

          // Step 3: Update title with ISBN (AC 3)
          const updateField =
            format === "physical"
              ? { isbn: selectedISBN.isbn_13 }
              : { eisbn: selectedISBN.isbn_13 };
          await tx
            .update(titles)
            .set({
              ...updateField,
              updated_at: now,
            })
            .where(and(eq(titles.id, titleId), eq(titles.tenant_id, tenantId)));

          return {
            isbn: selectedISBN,
            assignedAt: now,
          };
        });

        // AC 6: Audit trail logging
        console.info("ISBN assigned to title", {
          isbn_id: result.isbn.id,
          isbn_13: result.isbn.isbn_13,
          title_id: titleId,
          title_name: title.title,
          format,
          assigned_by: user.id,
          assigned_by_email: user.email,
          tenant_id: tenantId,
          timestamp: result.assignedAt.toISOString(),
          attempts,
        });

        // Revalidate cache for affected pages
        revalidatePath("/isbn-pool");
        revalidatePath("/titles");
        revalidatePath(`/titles/${titleId}`);

        return {
          success: true,
          data: {
            id: result.isbn.id,
            isbn_13: result.isbn.isbn_13,
            type: result.isbn.type as "physical" | "ebook",
            titleId,
            titleName: title.title,
            assignedAt: result.assignedAt,
            assignedByUserId: user.id,
          },
        };
      } catch (txError) {
        // Check if this is a "no available ISBNs" error (not retryable)
        if (
          txError instanceof Error &&
          txError.message.includes("ISBNs available")
        ) {
          return { success: false, error: txError.message };
        }

        // AC 4: If row was taken by concurrent request, retry
        lastError =
          txError instanceof Error ? txError.message : "Transaction failed";
        console.warn(
          `ISBN assignment attempt ${attempts} failed, retrying...`,
          {
            titleId,
            format,
            error: lastError,
          },
        );

        // Small delay before retry to reduce contention
        if (attempts < MAX_RETRY_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, 100 * attempts));
        }
      }
    }

    // All retries exhausted
    console.error("ISBN assignment failed after max retries", {
      titleId,
      format,
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
