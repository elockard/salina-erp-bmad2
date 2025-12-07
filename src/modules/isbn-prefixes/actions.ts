/**
 * ISBN Prefixes Server Actions
 *
 * Server-side actions for ISBN prefix operations.
 * Story 7.4: Implement Publisher ISBN Prefix System
 */

"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isbnPrefixes, type NewIsbnPrefix } from "@/db/schema/isbn-prefixes";
import { isbns, type NewISBN } from "@/db/schema/isbns";
import { inngest } from "@/inngest/client";
import { logAuditEvent } from "@/lib/audit";
import {
  getCurrentTenantId,
  getCurrentUser,
  getDb,
  requirePermission,
} from "@/lib/auth";
import { MANAGE_SETTINGS } from "@/lib/permissions";
import type { ActionResult } from "@/lib/types";
import { checkPrefixExists } from "./queries";
import { createIsbnPrefixSchema } from "./schema";
import type { CreateIsbnPrefixInput } from "./types";
import {
  formatBlockSize,
  formatPrefix,
  generateIsbn13,
  validateIsbnPrefix,
} from "./utils";

/**
 * Sync generation threshold
 * Block sizes <= this value are generated synchronously
 * Block sizes > this value are queued for async generation via Inngest
 */
const SYNC_GENERATION_THRESHOLD = 1000;

/**
 * Batch size for ISBN inserts
 * Prevents transaction timeout for large batches
 */
const INSERT_BATCH_SIZE = 1000;

/**
 * Result of creating an ISBN prefix
 */
export interface CreatePrefixResult {
  id: string;
  prefix: string;
  formattedPrefix: string;
  blockSize: number;
  generationStatus: "pending" | "generating" | "completed";
  message: string;
}

/**
 * Create a new ISBN prefix and generate ISBNs
 * Permission: MANAGE_SETTINGS (Admin/Owner only)
 *
 * Story 7.4 AC-7.4.3: Prefix Registration Form
 * - Validates prefix format and uniqueness
 * - For block_size <= 1000: Generates ISBNs synchronously
 * - For block_size > 1000: Queues Inngest job for async generation
 *
 * @param input - Prefix creation input
 * @returns Created prefix ID and status
 */
export async function createIsbnPrefix(
  input: CreateIsbnPrefixInput,
): Promise<ActionResult<CreatePrefixResult>> {
  try {
    await requirePermission(MANAGE_SETTINGS);

    // Validate input
    // Story 7.6: Removed type field - ISBNs are unified without type distinction
    const validated = createIsbnPrefixSchema.parse(input);
    const { prefix, block_size, description } = validated;

    // Validate prefix format
    const prefixValidation = validateIsbnPrefix(prefix);
    if (!prefixValidation.valid || !prefixValidation.normalizedPrefix) {
      return {
        success: false,
        error: prefixValidation.error ?? "Invalid prefix format",
      };
    }

    const normalizedPrefix = prefixValidation.normalizedPrefix;

    // Check prefix uniqueness for tenant
    const exists = await checkPrefixExists(normalizedPrefix);
    if (exists) {
      return {
        success: false,
        error: `Prefix ${formatPrefix(normalizedPrefix)} is already registered`,
      };
    }

    // Get context
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();
    const db = await getDb();

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Create prefix record
    // Story 7.6: Removed type field - ISBNs are unified without type distinction
    const now = new Date();
    const prefixRecord: NewIsbnPrefix = {
      tenant_id: tenantId,
      prefix: normalizedPrefix,
      block_size: block_size,
      description: description || null,
      total_isbns: block_size,
      available_count: 0, // Will be updated after generation
      assigned_count: 0,
      generation_status: "pending",
      generation_error: null,
      created_by_user_id: user.id,
      created_at: now,
      updated_at: now,
    };

    const [insertedPrefix] = await db
      .insert(isbnPrefixes)
      .values(prefixRecord)
      .returning({ id: isbnPrefixes.id });

    const prefixId = insertedPrefix.id;

    // Determine sync vs async generation
    // Story 7.6: Removed type parameter - ISBNs are unified without type distinction
    if (block_size <= SYNC_GENERATION_THRESHOLD) {
      // Sync generation for small blocks
      try {
        await generateIsbnsSynchronously(
          db,
          prefixId,
          normalizedPrefix,
          block_size,
          tenantId,
        );

        // Update prefix status to completed
        await db
          .update(isbnPrefixes)
          .set({
            generation_status: "completed",
            available_count: block_size,
            updated_at: new Date(),
          })
          .where(eq(isbnPrefixes.id, prefixId));

        // Audit log
        // Story 7.6: Removed type from audit log - ISBNs are unified
        logAuditEvent({
          tenantId,
          userId: user.id,
          actionType: "CREATE",
          resourceType: "isbn_prefix",
          resourceId: prefixId,
          changes: {
            after: {
              prefix: normalizedPrefix,
              block_size,
              generation_method: "sync",
            },
          },
        });

        revalidatePath("/settings/isbn-prefixes");
        revalidatePath("/isbn-pool");

        return {
          success: true,
          data: {
            id: prefixId,
            prefix: normalizedPrefix,
            formattedPrefix: formatPrefix(normalizedPrefix),
            blockSize: block_size,
            generationStatus: "completed",
            message: `Successfully generated ${formatBlockSize(block_size as 10 | 100 | 1000 | 10000 | 100000 | 1000000)} ISBNs`,
          },
        };
      } catch (genError) {
        // Mark as failed
        await db
          .update(isbnPrefixes)
          .set({
            generation_status: "failed",
            generation_error:
              genError instanceof Error
                ? genError.message
                : "Unknown generation error",
            updated_at: new Date(),
          })
          .where(eq(isbnPrefixes.id, prefixId));

        console.error("ISBN generation failed:", genError);
        return {
          success: false,
          error: "Failed to generate ISBNs. Please try again.",
        };
      }
    } else {
      // Async generation for large blocks
      await db
        .update(isbnPrefixes)
        .set({
          generation_status: "generating",
          updated_at: new Date(),
        })
        .where(eq(isbnPrefixes.id, prefixId));

      // Queue Inngest job
      // Story 7.6: Removed type from job data - ISBNs are unified
      await inngest.send({
        name: "isbn-prefix/generate",
        data: {
          prefixId,
          tenantId,
          prefix: normalizedPrefix,
          blockSize: block_size,
        },
      });

      // Audit log
      // Story 7.6: Removed type from audit log - ISBNs are unified
      logAuditEvent({
        tenantId,
        userId: user.id,
        actionType: "CREATE",
        resourceType: "isbn_prefix",
        resourceId: prefixId,
        changes: {
          after: {
            prefix: normalizedPrefix,
            block_size,
            generation_method: "async",
          },
        },
      });

      revalidatePath("/settings/isbn-prefixes");

      return {
        success: true,
        data: {
          id: prefixId,
          prefix: normalizedPrefix,
          formattedPrefix: formatPrefix(normalizedPrefix),
          blockSize: block_size,
          generationStatus: "generating",
          message: `ISBN generation queued for ${formatBlockSize(block_size as 10 | 100 | 1000 | 10000 | 100000 | 1000000)} ISBNs. This may take a few minutes.`,
        },
      };
    }
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to create ISBN prefixes",
      };
    }

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid input",
      };
    }

    // Handle unique constraint violation
    if (
      error instanceof Error &&
      error.message.includes("isbn_prefixes_tenant_prefix_unique")
    ) {
      return {
        success: false,
        error: "This prefix is already registered",
      };
    }

    console.error("createIsbnPrefix error:", error);
    return { success: false, error: "Failed to create ISBN prefix" };
  }
}

/**
 * Generate ISBNs synchronously (for small blocks)
 * Story 7.6: Removed type parameter - ISBNs are unified without type distinction
 */
async function generateIsbnsSynchronously(
  db: Awaited<ReturnType<typeof getDb>>,
  prefixId: string,
  prefix: string,
  blockSize: number,
  tenantId: string,
): Promise<void> {
  const now = new Date();
  const isbnRecords: NewISBN[] = [];

  // Generate all ISBNs - Story 7.6: No type field
  for (let i = 0; i < blockSize; i++) {
    const isbn13 = generateIsbn13(prefix, i);
    isbnRecords.push({
      tenant_id: tenantId,
      isbn_13: isbn13,
      status: "available",
      prefix_id: prefixId,
      created_at: now,
      updated_at: now,
    });
  }

  // Insert in batches to avoid transaction timeout
  for (let i = 0; i < isbnRecords.length; i += INSERT_BATCH_SIZE) {
    const batch = isbnRecords.slice(i, i + INSERT_BATCH_SIZE);
    await db.insert(isbns).values(batch);
  }
}

/**
 * Delete an ISBN prefix
 * Permission: MANAGE_SETTINGS (Admin/Owner only)
 *
 * Story 7.4 AC-7.4.4: Delete action only enabled when all ISBNs unassigned
 *
 * @param prefixId - Prefix UUID to delete
 * @returns Success or error
 */
export async function deleteIsbnPrefix(
  prefixId: string,
): Promise<ActionResult<{ deleted: boolean }>> {
  try {
    await requirePermission(MANAGE_SETTINGS);

    // Validate UUID
    const uuidSchema = z.string().uuid("Invalid prefix ID");
    uuidSchema.parse(prefixId);

    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();
    const db = await getDb();

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Get prefix with counts
    const prefix = await db.query.isbnPrefixes.findFirst({
      where: and(
        eq(isbnPrefixes.id, prefixId),
        eq(isbnPrefixes.tenant_id, tenantId),
      ),
    });

    if (!prefix) {
      return { success: false, error: "ISBN prefix not found" };
    }

    // Check if any ISBNs are assigned
    if (prefix.assigned_count > 0) {
      return {
        success: false,
        error: `Cannot delete prefix with ${prefix.assigned_count} assigned ISBN(s). Unassign all ISBNs first.`,
      };
    }

    // Check if generation is in progress
    if (prefix.generation_status === "generating") {
      return {
        success: false,
        error: "Cannot delete prefix while ISBN generation is in progress",
      };
    }

    // Delete ISBNs first (due to FK constraint)
    await db.delete(isbns).where(eq(isbns.prefix_id, prefixId));

    // Delete prefix
    await db.delete(isbnPrefixes).where(eq(isbnPrefixes.id, prefixId));

    // Audit log
    // Story 7.6: Removed type from audit log - ISBNs are unified
    logAuditEvent({
      tenantId,
      userId: user.id,
      actionType: "DELETE",
      resourceType: "isbn_prefix",
      resourceId: prefixId,
      changes: {
        before: {
          prefix: prefix.prefix,
          block_size: prefix.block_size,
          total_isbns: prefix.total_isbns,
        },
      },
    });

    revalidatePath("/settings/isbn-prefixes");
    revalidatePath("/isbn-pool");

    return {
      success: true,
      data: { deleted: true },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to delete ISBN prefixes",
      };
    }

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid input",
      };
    }

    console.error("deleteIsbnPrefix error:", error);
    return { success: false, error: "Failed to delete ISBN prefix" };
  }
}
