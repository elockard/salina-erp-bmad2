"use server";

/**
 * Returns Server Actions
 *
 * Server-side actions for returns management.
 * Creates return requests with "pending" status for Finance approval.
 *
 * Story 3.5: Build Return Request Entry Form
 * Related ACs: 2 (title search), 11 (record return), 12 (permissions), 13 (validation)
 *
 * Permission: RECORD_RETURNS (owner, admin, editor, finance)
 *
 * Approval Workflow:
 * - Returns are created with status='pending'
 * - Finance approves/rejects (Story 3.6)
 * - Only approved returns affect royalty calculations
 */

import Decimal from "decimal.js";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { returns } from "@/db/schema/returns";
import { logAuditEvent } from "@/lib/audit";
import {
  getCurrentTenantId,
  getCurrentUser,
  getDb,
  requirePermission,
} from "@/lib/auth";
import {
  APPROVE_RETURNS,
  RECORD_RETURNS,
  VIEW_RETURNS,
} from "@/lib/permissions";
import type { ActionResult } from "@/lib/types";
import { createReturnNotification } from "@/modules/notifications/service";
import {
  getPendingReturns,
  getReturnById,
  getReturnsHistory,
  getTitleForReturn,
  searchTitlesForReturns,
} from "./queries";
import { createReturnSchema, RETURN_REASON_LABELS } from "./schema";
import type {
  PaginatedReturns,
  PendingReturn,
  ReturnRecordResult,
  ReturnsHistoryFilters,
  ReturnWithRelations,
  TitleForReturnSelect,
} from "./types";

/**
 * Search titles for returns autocomplete
 *
 * AC 2: Debounced search (300ms) using Server Action
 * Returns titles with at least one format available (ISBN or eISBN)
 *
 * @param searchTerm - Search query for title/author name
 * @returns Array of matching titles with ISBN availability
 */
export async function searchTitlesForReturnsAction(
  searchTerm: string,
): Promise<ActionResult<TitleForReturnSelect[]>> {
  try {
    // Permission check - must be able to record returns
    await requirePermission(RECORD_RETURNS);

    const results = await searchTitlesForReturns(searchTerm, 10);
    return { success: true, data: results };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to search titles",
      };
    }

    console.error("searchTitlesForReturnsAction error:", error);
    return {
      success: false,
      error: "Failed to search titles",
    };
  }
}

/**
 * Record a new return request
 *
 * AC 11: Server Action creates return with status='pending'
 * AC 12: Permission check for Editor/Finance/Admin/Owner
 * AC 13: Server-side Zod validation
 *
 * FR32: Returns created with "pending" status awaiting approval
 *
 * @param data - Return data from form
 * @returns ActionResult with return details on success
 */
export async function recordReturn(
  data: unknown,
): Promise<ActionResult<ReturnRecordResult>> {
  try {
    // 1. Permission check (AC 12)
    await requirePermission(RECORD_RETURNS);

    // 2. Get current user for audit trail
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // 3. Validate input with Zod (AC 13)
    const validated = createReturnSchema.parse(data);

    // 4. Get tenant context
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // 5. Validate title exists and has the requested format
    const title = await getTitleForReturn(validated.title_id);
    if (!title) {
      return {
        success: false,
        error: "Selected title no longer available",
      };
    }

    // Story 7.6: Validate format and ISBN assignment (unified ISBN, no type distinction)
    // All formats require an ISBN to be assigned
    if (!title.has_isbn) {
      return {
        success: false,
        error: "This title does not have an ISBN assigned",
      };
    }
    // Audiobook format validation - for future when audiobook ISBNs are tracked
    if (validated.format === "audiobook") {
      return {
        success: false,
        error: "Audiobook format not yet supported",
      };
    }

    // 6. Compute total_amount server-side using Decimal.js
    // CRITICAL: Never use JavaScript arithmetic for currency
    const totalAmount = new Decimal(validated.unit_price)
      .times(validated.quantity)
      .toFixed(2);

    // 7. Build reason string - combine enum label with "other" text if applicable
    let reasonText = RETURN_REASON_LABELS[validated.reason];
    if (validated.reason === "other" && validated.reason_other) {
      reasonText = `Other: ${validated.reason_other}`;
    }

    // 8. Insert return record with status='pending' (AC 11, FR32)
    const [returnRecord] = await db
      .insert(returns)
      .values({
        tenant_id: tenantId,
        title_id: validated.title_id,
        format: validated.format,
        quantity: validated.quantity,
        unit_price: validated.unit_price,
        total_amount: totalAmount,
        return_date: validated.return_date,
        reason: reasonText,
        status: "pending", // FR32: Always pending on creation
        created_by_user_id: user.id,
      })
      .returning();

    // 9. Log audit event (fire and forget - non-blocking)
    logAuditEvent({
      tenantId,
      userId: user.id,
      actionType: "CREATE",
      resourceType: "return",
      resourceId: returnRecord.id,
      changes: {
        after: {
          id: returnRecord.id,
          title_id: returnRecord.title_id,
          title_name: title.title,
          format: returnRecord.format,
          quantity: returnRecord.quantity,
          unit_price: returnRecord.unit_price,
          total_amount: returnRecord.total_amount,
          return_date: validated.return_date,
          reason: reasonText,
          status: "pending",
        },
      },
    });

    // 10. Create notification for pending return (Story 20.2)
    // Fire-and-forget - don't block return creation on notification
    createReturnNotification({
      tenantId,
      returnId: returnRecord.id,
      returnNumber: `RTN-${returnRecord.id.slice(0, 8).toUpperCase()}`,
    }).catch((error) => {
      console.error("Failed to create return notification:", error);
    });

    // 11. Revalidate returns-related paths
    revalidatePath("/returns");
    revalidatePath("/dashboard");

    // 12. Return success with return details for toast message (AC 11)
    return {
      success: true,
      data: {
        id: returnRecord.id,
        title_name: title.title,
        quantity: returnRecord.quantity,
        total_amount: returnRecord.total_amount,
        status: "pending",
      },
    };
  } catch (error) {
    // Permission denied
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to record returns",
      };
    }

    // Zod validation error (AC 13)
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      error.issues.forEach((issue) => {
        const field = issue.path[0]?.toString() || "unknown";
        fieldErrors[field] = issue.message;
      });

      return {
        success: false,
        error: error.issues[0]?.message || "Invalid input",
        fields: fieldErrors,
      };
    }

    console.error("recordReturn error:", error);
    return {
      success: false,
      error: "Failed to record return. Please try again.",
    };
  }
}

/**
 * Get returns history with filtering, sorting, and pagination
 *
 * Story 3.7: Returns History View with Status Filtering
 * AC 12: Permission check for VIEW_RETURNS
 *
 * @param filters - Filter, sort, and pagination parameters
 * @returns Paginated returns with related data
 */
export async function getReturnsHistoryAction(
  filters: ReturnsHistoryFilters = {},
): Promise<ActionResult<PaginatedReturns>> {
  try {
    // Permission check (AC 12)
    await requirePermission(VIEW_RETURNS);

    const result = await getReturnsHistory(filters);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to view returns",
      };
    }

    console.error("getReturnsHistoryAction error:", error);
    return {
      success: false,
      error: "Failed to fetch returns history",
    };
  }
}

/**
 * Get a single return by ID
 *
 * Story 3.7: Return Detail Page (AC 10)
 * AC 12: Permission check for VIEW_RETURNS
 *
 * @param returnId - Return UUID
 * @returns Return with relations or error
 */
export async function getReturnByIdAction(
  returnId: string,
): Promise<ActionResult<ReturnWithRelations>> {
  try {
    // Permission check (AC 12)
    await requirePermission(VIEW_RETURNS);

    const result = await getReturnById(returnId);

    if (!result) {
      return {
        success: false,
        error: "Return not found",
      };
    }

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to view this return",
      };
    }

    console.error("getReturnByIdAction error:", error);
    return {
      success: false,
      error: "Failed to fetch return details",
    };
  }
}

/**
 * Approve a pending return request
 *
 * Story 3.6: AC 6 (approval confirmation)
 * - Updates return status to "approved"
 * - Records reviewed_by_user_id with current user
 * - Records reviewed_at with current timestamp
 * - Stores internal note if provided
 *
 * FR35: System tracks who approved/rejected returns and when
 * FR36: Only approved returns affect royalty calculations
 *
 * @param data - Approval data with return_id and optional internal_note
 * @returns ActionResult with updated return ID
 */
export async function approveReturn(data: {
  return_id: string;
  internal_note?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. Permission check (AC 11)
    await requirePermission(APPROVE_RETURNS);

    // 2. Get current user for audit trail (FR35)
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // 3. Validate UUID format
    const returnId = data.return_id;
    if (!returnId || typeof returnId !== "string") {
      return { success: false, error: "Invalid return ID" };
    }

    // 4. Get tenant context and verify return exists and is pending
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Check if return exists and is still pending (handles concurrent approval)
    const existingReturn = await db.query.returns.findFirst({
      where: and(
        eq(returns.id, returnId),
        eq(returns.tenant_id, tenantId),
        eq(returns.status, "pending"),
      ),
    });

    if (!existingReturn) {
      return {
        success: false,
        error: "Return not found or already processed",
      };
    }

    // 5. Update return status to approved (AC 6)
    // Store internal note if provided
    const internalNote = data.internal_note?.trim() || null;

    await db
      .update(returns)
      .set({
        status: "approved",
        reviewed_by_user_id: user.id,
        reviewed_at: new Date(),
        internal_note: internalNote,
        updated_at: new Date(),
      })
      .where(eq(returns.id, returnId));

    // 6. Log audit event (fire and forget - non-blocking)
    logAuditEvent({
      tenantId,
      userId: user.id,
      actionType: "APPROVE",
      resourceType: "return",
      resourceId: returnId,
      changes: {
        before: { status: "pending" },
        after: { status: "approved", internal_note: internalNote },
      },
      metadata: {
        reviewed_by_user_id: user.id,
      },
    });

    // 7. Revalidate paths
    revalidatePath("/returns");
    revalidatePath("/returns/pending");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { id: returnId },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to approve returns",
      };
    }

    console.error("approveReturn error:", error);
    return {
      success: false,
      error: "Failed to approve return. Please try again.",
    };
  }
}

/**
 * Reject a pending return request
 *
 * Story 3.6: AC 8 (rejection confirmation)
 * - Updates return status to "rejected"
 * - Records reviewed_by_user_id with current user
 * - Records reviewed_at with current timestamp
 * - Records rejection reason (required)
 *
 * FR35: System tracks who approved/rejected returns and when
 * FR37: Rejected returns are excluded from all financial calculations
 *
 * @param data - Rejection data with return_id and required reason
 * @returns ActionResult with updated return ID
 */
export async function rejectReturn(data: {
  return_id: string;
  reason: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. Permission check (AC 11)
    await requirePermission(APPROVE_RETURNS);

    // 2. Get current user for audit trail (FR35)
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // 3. Validate input (AC 12 - rejection reason required)
    const returnId = data.return_id;
    const reason = data.reason?.trim();

    if (!returnId || typeof returnId !== "string") {
      return { success: false, error: "Invalid return ID" };
    }

    if (!reason || reason.length === 0) {
      return {
        success: false,
        error: "Rejection reason is required",
        fields: { reason: "Please provide a reason for rejection" },
      };
    }

    if (reason.length > 500) {
      return {
        success: false,
        error: "Rejection reason is too long",
        fields: { reason: "Reason cannot exceed 500 characters" },
      };
    }

    // 4. Get tenant context and verify return exists and is pending
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Check if return exists and is still pending (handles concurrent rejection)
    const existingReturn = await db.query.returns.findFirst({
      where: and(
        eq(returns.id, returnId),
        eq(returns.tenant_id, tenantId),
        eq(returns.status, "pending"),
      ),
    });

    if (!existingReturn) {
      return {
        success: false,
        error: "Return not found or already processed",
      };
    }

    // 5. Update return status to rejected (AC 8)
    // Note: We store rejection reason in the existing reason column
    // by appending "REJECTED: [reason]" to preserve original reason
    const originalReason = existingReturn.reason;
    const updatedReason = originalReason
      ? `${originalReason}\n\nREJECTED: ${reason}`
      : `REJECTED: ${reason}`;

    await db
      .update(returns)
      .set({
        status: "rejected",
        reason: updatedReason,
        reviewed_by_user_id: user.id,
        reviewed_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(returns.id, returnId));

    // 6. Log audit event (fire and forget - non-blocking)
    logAuditEvent({
      tenantId,
      userId: user.id,
      actionType: "REJECT",
      resourceType: "return",
      resourceId: returnId,
      changes: {
        before: { status: "pending", reason: originalReason },
        after: { status: "rejected", reason: updatedReason },
      },
      metadata: {
        reviewed_by_user_id: user.id,
        rejection_reason: reason,
      },
    });

    // 7. Revalidate paths
    revalidatePath("/returns");
    revalidatePath("/returns/pending");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { id: returnId },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to reject returns",
      };
    }

    console.error("rejectReturn error:", error);
    return {
      success: false,
      error: "Failed to reject return. Please try again.",
    };
  }
}

/**
 * Get next pending return after approval/rejection
 *
 * Story 3.6: AC 6, AC 8 (auto-load next pending return)
 * Used after approving/rejecting to continue batch processing
 *
 * @param excludeId - Optional ID to exclude (the just-processed return)
 * @returns ActionResult with next pending return or null if none
 */
export async function getNextPendingReturn(
  excludeId?: string,
): Promise<ActionResult<PendingReturn | null>> {
  try {
    // Permission check
    await requirePermission(APPROVE_RETURNS);

    // Get all pending returns sorted by date (oldest first)
    const pendingReturns = await getPendingReturns();

    // Filter out the excluded ID if provided
    const filtered = excludeId
      ? pendingReturns.filter((r) => r.id !== excludeId)
      : pendingReturns;

    // Return the first one (oldest) or null
    return {
      success: true,
      data: filtered.length > 0 ? filtered[0] : null,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to view pending returns",
      };
    }

    console.error("getNextPendingReturn error:", error);
    return {
      success: false,
      error: "Failed to fetch next pending return",
    };
  }
}

/**
 * Get all pending returns for approval queue
 *
 * Story 3.6: AC 2 (left panel queue)
 * Server Action wrapper for getPendingReturns query
 *
 * @returns ActionResult with array of pending returns
 */
export async function getPendingReturnsAction(): Promise<
  ActionResult<PendingReturn[]>
> {
  try {
    // Permission check
    await requirePermission(APPROVE_RETURNS);

    const pendingReturns = await getPendingReturns();
    return { success: true, data: pendingReturns };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to view pending returns",
      };
    }

    console.error("getPendingReturnsAction error:", error);
    return {
      success: false,
      error: "Failed to fetch pending returns",
    };
  }
}
