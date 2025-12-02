"use server";

/**
 * Royalties Server Actions
 *
 * Server-side actions for royalty contract management.
 * Implements atomic contract + tiers creation with transaction.
 *
 * Story 4.2: Build Contract Creation Form with Tiered Royalty Configuration
 * Related FRs: FR38-FR40 (Royalty Contract Management)
 *
 * Permission: MANAGE_CONTRACTS (owner, admin, editor)
 */

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { contracts, contractTiers } from "@/db/schema/contracts";
import {
  getCurrentTenantId,
  getCurrentUser,
  getDb,
  requirePermission,
} from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { CALCULATE_ROYALTIES, MANAGE_CONTRACTS } from "@/lib/permissions";
import type { ActionResult } from "@/lib/types";
import { calculateRoyaltyForPeriod } from "./calculator";
import {
  checkDuplicateContract,
  getAuthorForContract,
  getTitleForContract,
  searchAuthorsForContract,
  searchTitlesForContract,
} from "./queries";
import {
  contractStatusSchema,
  createContractSchema,
  currencySchema,
} from "./schema";
import type {
  AuthorOption,
  Contract,
  ContractCreationResult,
  RoyaltyCalculationResult,
  TitleOption,
} from "./types";

/**
 * Search authors for contract dropdown
 *
 * @param searchTerm - Search query
 * @returns Array of matching authors
 */
export async function searchAuthorsAction(
  searchTerm: string,
): Promise<ActionResult<AuthorOption[]>> {
  try {
    await requirePermission(MANAGE_CONTRACTS);
    const results = await searchAuthorsForContract(searchTerm, 10);
    return { success: true, data: results };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to search authors",
      };
    }
    console.error("searchAuthorsAction error:", error);
    return { success: false, error: "Failed to search authors" };
  }
}

/**
 * Search titles for contract dropdown
 *
 * @param searchTerm - Search query
 * @returns Array of matching titles
 */
export async function searchTitlesAction(
  searchTerm: string,
): Promise<ActionResult<TitleOption[]>> {
  try {
    await requirePermission(MANAGE_CONTRACTS);
    const results = await searchTitlesForContract(searchTerm, 10);
    return { success: true, data: results };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to search titles",
      };
    }
    console.error("searchTitlesAction error:", error);
    return { success: false, error: "Failed to search titles" };
  }
}

/**
 * Create a new royalty contract with tiered rates
 *
 * AC 6: Creates contract and tiers atomically using transaction
 * AC 8: Handles duplicate prevention via unique constraint
 * AC 9: Permission check for Editor/Admin/Owner
 *
 * @param data - Contract form data
 * @returns ActionResult with contract creation result
 */
export async function createContract(
  data: unknown,
): Promise<ActionResult<ContractCreationResult>> {
  try {
    // 1. Permission check (AC 9)
    await requirePermission(MANAGE_CONTRACTS);

    // 2. Get current user for audit
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // 3. Validate input with Zod
    const validated = createContractSchema.parse(data);

    // 4. Get tenant context
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // 5. Check for duplicate contract (AC 8)
    const isDuplicate = await checkDuplicateContract(
      validated.author_id,
      validated.title_id,
    );
    if (isDuplicate) {
      return {
        success: false,
        error:
          "A contract already exists for this author and title. Each author can only have one contract per title.",
      };
    }

    // 6. Validate author exists
    const author = await getAuthorForContract(validated.author_id);
    if (!author) {
      return { success: false, error: "Selected author not found" };
    }

    // 7. Validate title exists
    const title = await getTitleForContract(validated.title_id);
    if (!title) {
      return { success: false, error: "Selected title not found" };
    }

    // 8. Create contract and tiers atomically (AC 6)
    const result = await db.transaction(async (tx) => {
      // Step 1: Create contract
      const [contract] = await tx
        .insert(contracts)
        .values({
          tenant_id: tenantId,
          author_id: validated.author_id,
          title_id: validated.title_id,
          status: validated.status,
          advance_amount: validated.advance_amount || "0",
          advance_paid: validated.advance_paid || "0",
          advance_recouped: "0",
        })
        .returning();

      // Step 2: Create tiers
      for (const tier of validated.tiers) {
        await tx.insert(contractTiers).values({
          contract_id: contract.id,
          format: tier.format,
          min_quantity: tier.min_quantity,
          max_quantity: tier.max_quantity,
          rate: tier.rate.toFixed(4), // Store as string for DECIMAL(5,4)
        });
      }

      return contract;
    });

    // 9. Log audit event (fire and forget - non-blocking)
    logAuditEvent({
      tenantId,
      userId: user.id,
      actionType: "CREATE",
      resourceType: "contract",
      resourceId: result.id,
      changes: {
        after: {
          id: result.id,
          author_id: validated.author_id,
          author_name: author.name,
          title_id: validated.title_id,
          title_name: title.title,
          status: validated.status,
          advance_amount: validated.advance_amount,
          tiers_count: validated.tiers.length,
        },
      },
    });

    // 10. Revalidate paths
    revalidatePath("/royalties");
    revalidatePath(`/authors/${validated.author_id}`);
    revalidatePath(`/titles/${validated.title_id}`);

    // 11. Return success with contract details for toast
    return {
      success: true,
      data: {
        id: result.id,
        author_name: author.name,
        title_name: title.title,
      },
    };
  } catch (error) {
    // Permission denied
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to create contracts",
      };
    }

    // Zod validation error
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      error.issues.forEach((issue) => {
        const field = issue.path.join(".");
        fieldErrors[field] = issue.message;
      });

      return {
        success: false,
        error: error.issues[0]?.message || "Invalid input",
        fields: fieldErrors,
      };
    }

    // Unique constraint violation (duplicate contract)
    if (
      error instanceof Error &&
      error.message.includes("contracts_tenant_author_title_unique")
    ) {
      return {
        success: false,
        error:
          "A contract already exists for this author and title. Each author can only have one contract per title.",
      };
    }

    console.error("createContract error:", error);
    return {
      success: false,
      error: "Failed to create contract. Please try again.",
    };
  }
}

/**
 * Update contract status schema
 */
const updateContractStatusSchema = z.object({
  contractId: z.string().uuid(),
  status: contractStatusSchema,
});

/**
 * Update contract status
 *
 * Story 4.3: AC 6 - Change Status action
 *
 * @param contractId - Contract UUID
 * @param status - New status (active, suspended, terminated)
 * @returns ActionResult with updated contract
 */
export async function updateContractStatus(
  contractId: string,
  status: string,
): Promise<ActionResult<Contract>> {
  try {
    // 1. Permission check
    await requirePermission(MANAGE_CONTRACTS);

    // 2. Validate input
    const validated = updateContractStatusSchema.parse({ contractId, status });

    // 3. Get tenant context
    const tenantId = await getCurrentTenantId();
    const db = await getDb();
    const user = await getCurrentUser();

    // 4. Get current contract for audit log
    const current = await db.query.contracts.findFirst({
      where: and(
        eq(contracts.id, validated.contractId),
        eq(contracts.tenant_id, tenantId),
      ),
    });

    const oldStatus = current?.status;

    // 5. Update contract
    const [updated] = await db
      .update(contracts)
      .set({
        status: validated.status,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(contracts.id, validated.contractId),
          eq(contracts.tenant_id, tenantId),
        ),
      )
      .returning();

    if (!updated) {
      return { success: false, error: "Contract not found" };
    }

    // 6. Log audit event (fire and forget - non-blocking)
    logAuditEvent({
      tenantId,
      userId: user?.id ?? null,
      actionType: "UPDATE",
      resourceType: "contract",
      resourceId: contractId,
      changes: {
        before: { status: oldStatus },
        after: { status: validated.status },
      },
      metadata: {
        operation: "status_change",
      },
    });

    // 7. Revalidate paths
    revalidatePath(`/royalties/${contractId}`);
    revalidatePath("/royalties");

    return { success: true, data: updated };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to update contracts",
      };
    }

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid input",
      };
    }

    console.error("updateContractStatus error:", error);
    return {
      success: false,
      error: "Failed to update contract status. Please try again.",
    };
  }
}

/**
 * Update advance paid schema
 */
const updateAdvancePaidSchema = z.object({
  contractId: z.string().uuid(),
  additionalPayment: currencySchema.refine((val) => parseFloat(val) > 0, {
    message: "Payment amount must be greater than 0",
  }),
});

/**
 * Update advance paid amount
 *
 * Story 4.3: AC 8 - Update Advance modal
 *
 * @param contractId - Contract UUID
 * @param additionalPayment - Additional payment amount to add
 * @returns ActionResult with updated contract
 */
export async function updateAdvancePaid(
  contractId: string,
  additionalPayment: string,
): Promise<ActionResult<Contract>> {
  try {
    // 1. Permission check
    await requirePermission(MANAGE_CONTRACTS);

    // 2. Validate input
    const validated = updateAdvancePaidSchema.parse({
      contractId,
      additionalPayment,
    });

    // 3. Get tenant context
    const tenantId = await getCurrentTenantId();
    const db = await getDb();
    const user = await getCurrentUser();

    // 4. Get current contract
    const current = await db.query.contracts.findFirst({
      where: and(
        eq(contracts.id, validated.contractId),
        eq(contracts.tenant_id, tenantId),
      ),
    });

    if (!current) {
      return { success: false, error: "Contract not found" };
    }

    // 5. Calculate new advance_paid using Decimal.js for precision
    const Decimal = (await import("decimal.js")).default;
    const currentPaid = new Decimal(current.advance_paid || "0");
    const payment = new Decimal(validated.additionalPayment);
    const newPaid = currentPaid.plus(payment);

    // 6. Validate: advance_paid should not exceed advance_amount
    const advanceAmount = new Decimal(current.advance_amount || "0");
    if (newPaid.greaterThan(advanceAmount)) {
      return {
        success: false,
        error: `Payment would exceed advance amount. Maximum additional payment: ${advanceAmount.minus(currentPaid).toFixed(2)}`,
      };
    }

    // 7. Update contract
    const [updated] = await db
      .update(contracts)
      .set({
        advance_paid: newPaid.toFixed(2),
        updated_at: new Date(),
      })
      .where(
        and(
          eq(contracts.id, validated.contractId),
          eq(contracts.tenant_id, tenantId),
        ),
      )
      .returning();

    if (!updated) {
      return { success: false, error: "Contract not found" };
    }

    // 8. Log audit event (fire and forget - non-blocking)
    logAuditEvent({
      tenantId,
      userId: user?.id ?? null,
      actionType: "UPDATE",
      resourceType: "contract",
      resourceId: contractId,
      changes: {
        before: { advance_paid: currentPaid.toFixed(2) },
        after: { advance_paid: newPaid.toFixed(2) },
      },
      metadata: {
        operation: "advance_payment",
        additional_payment: validated.additionalPayment,
      },
    });

    // 9. Revalidate paths
    revalidatePath(`/royalties/${contractId}`);
    revalidatePath("/royalties");

    return { success: true, data: updated };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to update contracts",
      };
    }

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid input",
      };
    }

    console.error("updateAdvancePaid error:", error);
    return {
      success: false,
      error: "Failed to update advance payment. Please try again.",
    };
  }
}

/**
 * Update contract schema (for full contract editing)
 */
const updateContractSchema = z.object({
  contractId: z.string().uuid(),
  status: contractStatusSchema,
  advance_amount: currencySchema,
  advance_paid: currencySchema,
  tiers: z.array(
    z.object({
      format: z.enum(["physical", "ebook", "audiobook"]),
      min_quantity: z.number().int().min(0),
      max_quantity: z.number().int().min(1).nullable(),
      rate: z.number().min(0).max(1),
    }),
  ),
});

/**
 * Update contract with tiers
 *
 * Story 4.3: AC 7 - Edit modal allows contract modifications
 *
 * @param contractId - Contract UUID
 * @param data - Contract update data
 * @returns ActionResult with updated contract
 */
export async function updateContract(
  contractId: string,
  data: unknown,
): Promise<ActionResult<Contract>> {
  try {
    // 1. Permission check
    await requirePermission(MANAGE_CONTRACTS);

    // 2. Validate input
    const validated = updateContractSchema.parse({
      contractId,
      ...(data as Record<string, unknown>),
    });

    // 3. Get tenant context
    const tenantId = await getCurrentTenantId();
    const db = await getDb();
    const user = await getCurrentUser();

    // 4. Get current contract for audit log
    const current = await db.query.contracts.findFirst({
      where: and(
        eq(contracts.id, validated.contractId),
        eq(contracts.tenant_id, tenantId),
      ),
    });

    // 5. Update contract and tiers atomically
    const result = await db.transaction(async (tx) => {
      // Update contract
      const [updated] = await tx
        .update(contracts)
        .set({
          status: validated.status,
          advance_amount: validated.advance_amount || "0",
          advance_paid: validated.advance_paid || "0",
          updated_at: new Date(),
        })
        .where(
          and(
            eq(contracts.id, validated.contractId),
            eq(contracts.tenant_id, tenantId),
          ),
        )
        .returning();

      if (!updated) {
        throw new Error("Contract not found");
      }

      // Delete existing tiers
      await tx
        .delete(contractTiers)
        .where(eq(contractTiers.contract_id, validated.contractId));

      // Insert new tiers
      for (const tier of validated.tiers) {
        await tx.insert(contractTiers).values({
          contract_id: validated.contractId,
          format: tier.format,
          min_quantity: tier.min_quantity,
          max_quantity: tier.max_quantity,
          rate: tier.rate.toFixed(4),
        });
      }

      return updated;
    });

    // 6. Log audit event (fire and forget - non-blocking)
    logAuditEvent({
      tenantId,
      userId: user?.id ?? null,
      actionType: "UPDATE",
      resourceType: "contract",
      resourceId: contractId,
      changes: {
        before: {
          status: current?.status,
          advance_amount: current?.advance_amount,
          advance_paid: current?.advance_paid,
        },
        after: {
          status: validated.status,
          advance_amount: validated.advance_amount,
          advance_paid: validated.advance_paid,
          tiers_count: validated.tiers.length,
        },
      },
      metadata: {
        operation: "full_update",
      },
    });

    // 7. Revalidate paths
    revalidatePath(`/royalties/${contractId}`);
    revalidatePath("/royalties");

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to update contracts",
      };
    }

    if (error instanceof Error && error.message === "Contract not found") {
      return { success: false, error: "Contract not found" };
    }

    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      error.issues.forEach((issue) => {
        const field = issue.path.join(".");
        fieldErrors[field] = issue.message;
      });

      return {
        success: false,
        error: error.issues[0]?.message || "Invalid input",
        fields: fieldErrors,
      };
    }

    console.error("updateContract error:", error);
    return {
      success: false,
      error: "Failed to update contract. Please try again.",
    };
  }
}

// ============================================================================
// Royalty Calculation Testing (Story 4.5)
// ============================================================================

/**
 * Input schema for test calculation
 */
const testCalculationSchema = z.object({
  authorId: z.string().uuid("Invalid author ID"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

/**
 * Trigger a test royalty calculation (dry run)
 *
 * Story 4.5 AC 4: On submit, calls calculateRoyaltyForPeriod with selected parameters
 * Story 4.5 AC 9, 10: Does NOT create statement or update advance_recouped (dry run only)
 *
 * Permission: CALCULATE_ROYALTIES (owner, admin, finance)
 *
 * @param authorId - Author UUID
 * @param startDate - Period start date
 * @param endDate - Period end date
 * @returns RoyaltyCalculationResult with success/failure and calculation details
 */
export async function triggerTestCalculation(
  authorId: string,
  startDate: Date,
  endDate: Date,
): Promise<RoyaltyCalculationResult> {
  try {
    // 1. Permission check (AC 1)
    await requirePermission(CALCULATE_ROYALTIES);

    // 2. Validate input
    const validated = testCalculationSchema.parse({
      authorId,
      startDate,
      endDate,
    });

    // 3. Get tenant context
    const tenantId = await getCurrentTenantId();

    // 4. Call pure calculation function (AC 9, 10: no side effects)
    const result = await calculateRoyaltyForPeriod(
      validated.authorId,
      tenantId,
      validated.startDate,
      validated.endDate,
    );

    return result;
  } catch (error) {
    // Permission denied
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to calculate royalties",
      };
    }

    // Zod validation error
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid input",
      };
    }

    console.error("triggerTestCalculation error:", error);
    return {
      success: false,
      error: "Failed to calculate royalties. Please try again.",
    };
  }
}
