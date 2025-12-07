/**
 * Statement Server Actions
 *
 * Server-side actions for statement operations.
 * All actions enforce tenant isolation and role-based access control.
 *
 * Story: 5.2 - Implement PDF Statement Generation
 * Task 6: Create server action to trigger PDF generation
 * AC-5.2.7: Generation runs as Inngest background job
 *
 * Story: 5.3 - Build Statement Generation Wizard for Finance
 * Task 6: Create server actions for wizard
 * AC-5.3.5: Submit enqueues Inngest job for background processing
 * AC-5.3.7: Only Finance, Admin, Owner roles can access wizard
 *
 * Related:
 * - src/inngest/generate-statement-pdf.ts (background job)
 * - src/inngest/generate-statements-batch.ts (batch generation job)
 * - src/lib/auth.ts (permission utilities)
 */

"use server";

import { and, eq } from "drizzle-orm";
import { adminDb } from "@/db";
import { authors } from "@/db/schema/authors";
import { contracts } from "@/db/schema/contracts";
import { statements } from "@/db/schema/statements";
import { inngest } from "@/inngest/client";
import { logAuditEvent } from "@/lib/audit";
import {
  getCurrentTenantId,
  getCurrentUser,
  getDb,
  requirePermission,
} from "@/lib/auth";
import type { ActionResult } from "@/lib/types";
import { calculateRoyaltyForPeriod } from "@/modules/royalties/calculator";
import { sendStatementEmail } from "./email-service";
import { getStatementDownloadUrl } from "./storage";
import type {
  AuthorWithPendingRoyalties,
  PreviewCalculation,
  PreviewWarning,
  StatementGenerationRequest,
  StatementGenerationResult,
} from "./types";

/**
 * Trigger PDF generation for a statement
 *
 * Validates the statement exists and belongs to the current tenant,
 * then enqueues an Inngest job for background PDF generation.
 *
 * Required roles: finance, admin, owner
 * AC-5.2.7: Enqueues Inngest job for async processing
 *
 * @param statementId - UUID of the statement to generate PDF for
 * @returns ActionResult with job ID on success
 */
export async function generateStatementPDF(
  statementId: string,
): Promise<ActionResult<{ eventId: string }>> {
  try {
    // Verify permission
    await requirePermission(["finance", "admin", "owner"]);
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Validate statement exists and belongs to tenant
    const statement = await db.query.statements.findFirst({
      where: eq(statements.id, statementId),
    });

    if (!statement) {
      return {
        success: false,
        error: "Statement not found",
      };
    }

    if (statement.tenant_id !== tenantId) {
      return {
        success: false,
        error: "Statement not found",
      };
    }

    // Check if PDF already exists
    if (statement.pdf_s3_key) {
      return {
        success: false,
        error: "PDF already generated for this statement",
      };
    }

    // Enqueue Inngest job
    const result = await inngest.send({
      name: "statements/pdf.generate",
      data: {
        statementId,
        tenantId,
      },
    });

    console.log(
      `[Action] Enqueued PDF generation for statement ${statementId}:`,
      result.ids,
    );

    return {
      success: true,
      data: {
        eventId: result.ids[0],
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    if (message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to generate statement PDFs",
      };
    }

    console.error(`[Action] generateStatementPDF failed:`, error);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Get download URL for statement PDF
 *
 * Generates a presigned S3 URL (15-min expiry) for downloading
 * a statement PDF. Validates tenant access before returning URL.
 *
 * Required roles: finance, admin, owner, author (with portal access)
 * AC-5.2.6: Returns presigned URL with 15-minute expiry
 *
 * @param statementId - UUID of the statement to download
 * @returns ActionResult with download URL on success
 */
export async function getStatementPDFUrl(
  statementId: string,
): Promise<ActionResult<{ url: string }>> {
  try {
    // Author role allowed for portal access to their own statements
    await requirePermission(["finance", "admin", "owner", "author"]);
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Load statement
    const statement = await db.query.statements.findFirst({
      where: eq(statements.id, statementId),
    });

    if (!statement) {
      return {
        success: false,
        error: "Statement not found",
      };
    }

    if (statement.tenant_id !== tenantId) {
      return {
        success: false,
        error: "Statement not found",
      };
    }

    // Check if PDF exists
    if (!statement.pdf_s3_key) {
      return {
        success: false,
        error: "PDF not yet generated for this statement",
      };
    }

    // Generate presigned URL
    const url = await getStatementDownloadUrl(statement.pdf_s3_key);

    return {
      success: true,
      data: { url },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    if (message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to download this statement",
      };
    }

    console.error(`[Action] getStatementPDFUrl failed:`, error);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Get authors with pending royalties for wizard selection
 *
 * Story 5.3 AC-5.3.3: Author selection with pending royalties display
 * Required roles: finance, admin, owner
 *
 * @param params.periodStart - Start of period for royalty estimate
 * @param params.periodEnd - End of period for royalty estimate
 * @returns List of authors with pending royalty estimates
 */
export async function getAuthorsWithPendingRoyalties(params: {
  periodStart: Date;
  periodEnd: Date;
}): Promise<ActionResult<AuthorWithPendingRoyalties[]>> {
  try {
    // Verify permission (AC-5.3.7)
    await requirePermission(["finance", "admin", "owner"]);
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Get all active authors with contracts in the tenant
    const authorList = await db.query.authors.findMany({
      where: and(eq(authors.tenant_id, tenantId), eq(authors.is_active, true)),
    });

    // For each author, get their contract and estimate pending royalties
    const authorsWithRoyalties: AuthorWithPendingRoyalties[] = [];

    for (const author of authorList) {
      // Check if author has a contract
      const contract = await db.query.contracts.findFirst({
        where: and(
          eq(contracts.tenant_id, tenantId),
          eq(contracts.author_id, author.id),
          eq(contracts.status, "active"),
        ),
      });

      // Skip authors without active contracts
      if (!contract) continue;

      // Calculate pending royalties using the calculator
      let pendingRoyalties = 0;
      try {
        const result = await calculateRoyaltyForPeriod(
          author.id,
          tenantId,
          params.periodStart,
          params.periodEnd,
        );
        if (result.success) {
          pendingRoyalties = result.calculation.netPayable;
        }
      } catch {
        // If calculation fails, use 0 as estimate
        pendingRoyalties = 0;
      }

      authorsWithRoyalties.push({
        id: author.id,
        name: author.name,
        email: author.email,
        pendingRoyalties,
      });
    }

    // Sort by pending royalties descending
    authorsWithRoyalties.sort(
      (a, b) => b.pendingRoyalties - a.pendingRoyalties,
    );

    return {
      success: true,
      data: authorsWithRoyalties,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    if (message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to view author royalty data",
      };
    }

    console.error(`[Action] getAuthorsWithPendingRoyalties failed:`, error);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Preview statement calculations without persisting
 *
 * Story 5.3 AC-5.3.4: Preview step shows calculation estimates
 * Required roles: finance, admin, owner
 *
 * @param params.periodStart - Start of period
 * @param params.periodEnd - End of period
 * @param params.authorIds - Author IDs to calculate for
 * @returns Preview calculations for each author
 */
export async function previewStatementCalculations(params: {
  periodStart: Date;
  periodEnd: Date;
  authorIds: string[];
}): Promise<ActionResult<PreviewCalculation[]>> {
  try {
    // Verify permission (AC-5.3.7)
    await requirePermission(["finance", "admin", "owner"]);
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    const previews: PreviewCalculation[] = [];

    for (const authorId of params.authorIds) {
      // Get author details
      const author = await db.query.authors.findFirst({
        where: and(eq(authors.id, authorId), eq(authors.tenant_id, tenantId)),
      });

      if (!author) continue;

      // Calculate royalties
      const result = await calculateRoyaltyForPeriod(
        authorId,
        tenantId,
        params.periodStart,
        params.periodEnd,
      );

      if (!result.success) {
        // Include with zeros and a warning
        previews.push({
          authorId,
          authorName: author.name,
          totalSales: 0,
          totalReturns: 0,
          royaltyEarned: 0,
          advanceRecouped: 0,
          netPayable: 0,
          warnings: [
            {
              type: "no_sales",
              message: result.error || "Could not calculate royalties",
            },
          ],
        });
        continue;
      }

      const calc = result.calculation;

      // Calculate totals from format breakdowns
      const totalSales = calc.formatCalculations.reduce(
        (sum, fc) => sum + fc.netSales.grossQuantity,
        0,
      );
      const totalReturns = calc.formatCalculations.reduce(
        (sum, fc) => sum + fc.netSales.returnsQuantity,
        0,
      );

      // Build warnings (AC-5.3.4)
      const warnings: PreviewWarning[] = [];

      if (calc.netPayable <= 0 && totalReturns > totalSales) {
        warnings.push({
          type: "negative_net",
          message: "Returns exceed royalties - net payable is negative or zero",
        });
      } else if (calc.netPayable === 0 && calc.advanceRecoupment > 0) {
        warnings.push({
          type: "zero_net",
          message: "Advance fully recouped - net payable is $0",
        });
      } else if (totalSales === 0) {
        warnings.push({
          type: "no_sales",
          message: "No sales recorded in this period",
        });
      }

      previews.push({
        authorId,
        authorName: author.name,
        totalSales,
        totalReturns,
        royaltyEarned: calc.totalRoyaltyEarned,
        advanceRecouped: calc.advanceRecoupment,
        netPayable: calc.netPayable,
        warnings,
      });
    }

    return {
      success: true,
      data: previews,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    if (message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to preview statement calculations",
      };
    }

    console.error(`[Action] previewStatementCalculations failed:`, error);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Generate statements for multiple authors
 *
 * Story 5.3 AC-5.3.5: Submit enqueues Inngest job for background processing
 * Required roles: finance, admin, owner
 *
 * @param request - Generation request parameters
 * @returns Job ID for tracking
 */
export async function generateStatements(
  request: StatementGenerationRequest,
): Promise<ActionResult<StatementGenerationResult>> {
  try {
    // Verify permission (AC-5.3.7)
    await requirePermission(["finance", "admin", "owner"]);
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Validate request
    if (request.authorIds.length === 0) {
      return {
        success: false,
        error: "At least one author must be selected",
      };
    }

    if (request.periodEnd <= request.periodStart) {
      return {
        success: false,
        error: "Period end date must be after start date",
      };
    }

    // Enqueue Inngest batch job (AC-5.3.5)
    const result = await inngest.send({
      name: "statements/generate.batch",
      data: {
        tenantId,
        periodStart: request.periodStart.toISOString(),
        periodEnd: request.periodEnd.toISOString(),
        authorIds: request.authorIds,
        sendEmail: request.sendEmail,
        userId: user.id,
      },
    });

    console.log(
      `[Action] Enqueued batch statement generation for ${request.authorIds.length} authors:`,
      result.ids,
    );

    // Log audit event for statement generation batch (fire and forget)
    logAuditEvent({
      tenantId,
      userId: user.id,
      actionType: "CREATE",
      resourceType: "statement",
      changes: {
        after: {
          jobId: result.ids[0],
          authorIds: request.authorIds,
          authorCount: request.authorIds.length,
          periodStart: request.periodStart.toISOString(),
          periodEnd: request.periodEnd.toISOString(),
          sendEmail: request.sendEmail,
        },
      },
      metadata: {
        operation: "batch_generation",
      },
    });

    return {
      success: true,
      data: {
        jobId: result.ids[0],
        authorCount: request.authorIds.length,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    if (message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to generate statements",
      };
    }

    console.error(`[Action] generateStatements failed:`, error);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Resend statement email manually
 *
 * Story 5.4 AC-5.4.5: Failed emails allow manual resend from statement detail UI
 * Required roles: finance, admin, owner
 *
 * @param statementId - UUID of the statement to resend email for
 * @returns ActionResult with messageId on success
 */
export async function resendStatementEmail(
  statementId: string,
): Promise<ActionResult<{ messageId: string }>> {
  try {
    // AC-5.4.5: Enforce Finance/Admin/Owner permission
    await requirePermission(["finance", "admin", "owner"]);
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Validate statement exists and belongs to tenant
    const statement = await db.query.statements.findFirst({
      where: eq(statements.id, statementId),
    });

    if (!statement) {
      return {
        success: false,
        error: "Statement not found",
      };
    }

    if (statement.tenant_id !== tenantId) {
      return {
        success: false,
        error: "Statement not found",
      };
    }

    // Validate PDF is generated
    if (!statement.pdf_s3_key) {
      return {
        success: false,
        error:
          "PDF not yet generated for this statement. Generate the PDF first.",
      };
    }

    // Send email via email service
    const emailResult = await sendStatementEmail({
      statementId,
      tenantId,
    });

    if (!emailResult.success) {
      console.error(
        `[Action] resendStatementEmail failed for ${statementId}:`,
        emailResult.error,
      );
      return {
        success: false,
        error: emailResult.error || "Failed to send email",
      };
    }

    // AC-5.4.5: Update email_sent_at on success
    await adminDb
      .update(statements)
      .set({
        status: "sent",
        email_sent_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(statements.id, statementId));

    console.log(
      `[Action] Resent statement email for ${statementId}: ${emailResult.messageId}`,
    );

    // Get current user for audit log
    const user = await getCurrentUser();

    // Log audit event for email delivery (fire and forget)
    logAuditEvent({
      tenantId,
      userId: user?.id ?? null,
      actionType: "UPDATE",
      resourceType: "statement",
      resourceId: statementId,
      changes: {
        before: {
          status: statement.status,
          email_sent_at: statement.email_sent_at,
        },
        after: { status: "sent", email_sent_at: new Date().toISOString() },
      },
      metadata: {
        operation: "resend_email",
        messageId: emailResult.messageId,
      },
    });

    return {
      success: true,
      data: {
        messageId: emailResult.messageId || "",
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    if (message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to resend statement emails",
      };
    }

    console.error(`[Action] resendStatementEmail failed:`, error);
    return {
      success: false,
      error: message,
    };
  }
}

// ============================================================================
// Portal Actions (Story 5.6)
// ============================================================================

/**
 * Get download URL for author's own statement PDF (portal access)
 *
 * Validates author ownership before generating presigned URL.
 * Unlike getStatementPDFUrl which allows any finance/admin, this only
 * allows the author who owns the statement.
 *
 * AC-5.6.4: Download PDF button generates presigned S3 URL (15-minute expiry)
 * AC-5.6.5: RLS prevents access to other authors' data
 *
 * Required role: author (portal user)
 *
 * @param statementId - UUID of the statement to download
 * @returns ActionResult with download URL on success
 */
export async function getMyStatementPDFUrl(
  statementId: string,
): Promise<ActionResult<{ url: string; expiresInMinutes: number }>> {
  try {
    const db = await getDb();
    const user = await getCurrentUser();

    if (!user) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    // Find author linked to this portal user
    const author = await db.query.authors.findFirst({
      where: and(
        eq(authors.portal_user_id, user.id),
        eq(authors.is_active, true),
      ),
    });

    if (!author) {
      return {
        success: false,
        error: "No author account linked to your user",
      };
    }

    // Get statement with author ownership check
    const statement = await db.query.statements.findFirst({
      where: and(
        eq(statements.id, statementId),
        eq(statements.author_id, author.id),
      ),
    });

    if (!statement) {
      return {
        success: false,
        error: "Statement not found",
      };
    }

    // Check if PDF exists
    if (!statement.pdf_s3_key) {
      return {
        success: false,
        error: "PDF not yet generated for this statement",
      };
    }

    // Generate presigned URL (15-minute expiry per AC-5.6.4)
    const url = await getStatementDownloadUrl(statement.pdf_s3_key);

    return {
      success: true,
      data: {
        url,
        expiresInMinutes: 15,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    console.error(`[Action] getMyStatementPDFUrl failed:`, error);
    return {
      success: false,
      error: message,
    };
  }
}
