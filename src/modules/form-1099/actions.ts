/**
 * Form 1099 Server Actions
 *
 * Server-side actions for 1099-MISC form generation and management.
 * All actions enforce tenant isolation and role-based access control.
 *
 * Story: 11.3 - Generate 1099-MISC Forms
 * AC-11.3.3: Server actions for 1099 generation
 * AC-11.3.7: Track generated forms to prevent duplicates
 *
 * Related:
 * - src/modules/form-1099/generator.tsx (PDF generation)
 * - src/modules/form-1099/storage.ts (S3 operations)
 * - src/modules/form-1099/queries.ts (database queries)
 */

"use server";

import { and, eq, sql } from "drizzle-orm";
import { adminDb } from "@/db";
import {
  contacts,
  type Form1099,
  form1099,
  statements,
  tenants,
} from "@/db/schema";
import { logAuditEvent } from "@/lib/audit";
import {
  getCurrentTenantId,
  getCurrentUser,
  getDb,
  requirePermission,
} from "@/lib/auth";
import type { ActionResult } from "@/lib/types";
import { generateForm1099PDF } from "./generator";
import {
  generate1099ZipBuffer,
  get1099DownloadUrl,
  upload1099PDF,
  upload1099ZipAndGetUrl,
} from "./storage";
import type {
  Author1099Info,
  BatchGenerate1099Result,
  Form1099PDFData,
  Generate1099Result,
  Regenerate1099Result,
} from "./types";

/**
 * 1099 filing threshold per IRS rules for royalties
 * IRS Form 1099-MISC Box 2 (Royalties): $10 threshold
 * Note: This is different from the $600 threshold for non-employee compensation
 */
const FILING_THRESHOLD = 10;

/**
 * Generate a single 1099-MISC form for a contact
 *
 * Validates all prerequisites (tax info, payer info, threshold, US-based)
 * before generating the PDF and storing in S3.
 *
 * Required roles: finance, admin, owner
 *
 * AC-11.3.1: Validates earnings >= $10 threshold (royalties)
 * AC-11.3.2: Validates US-based requirement
 * AC-11.3.4: Admin/Owner can force generation without TIN
 * AC-11.3.5: Generates PDF following IRS specifications
 * AC-11.3.6: Stores PDF in S3
 * AC-11.3.7: Prevents duplicate generation
 * AC-11.3.9: Audit logging for 1099 generation
 *
 * @param params - Contact ID, tax year, and optional force flag
 * @returns ActionResult with generated form details
 */
export async function generate1099Action(params: {
  contact_id: string;
  tax_year: number;
  /** Admin/Owner only: Force generation even without TIN */
  force_without_tin?: boolean;
}): Promise<ActionResult<Generate1099Result>> {
  try {
    // Verify permission
    await requirePermission(["finance", "admin", "owner"]);
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();
    const db = await getDb();

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Get contact with tax information
    // CRITICAL: tenant_id FIRST for multi-tenant isolation
    const contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.tenant_id, tenantId),
        eq(contacts.id, params.contact_id),
      ),
      with: { roles: true },
    });

    if (!contact) {
      return {
        success: false,
        error: "Contact not found",
      };
    }

    // Validate contact has author role
    if (!contact.roles?.some((r) => r.role === "author")) {
      return {
        success: false,
        error: "Contact is not an author",
      };
    }

    // AC-11.3.2: Validate US-based requirement
    if (contact.is_us_based === false) {
      return {
        success: false,
        error: "1099-MISC forms are only required for US-based recipients",
      };
    }

    // Validate contact has tax information
    const hasTaxInfo = !!(contact.tin_encrypted && contact.tin_last_four);
    if (!hasTaxInfo && !params.force_without_tin) {
      return {
        success: false,
        error:
          "Contact does not have tax information on file. Please update their tax info first.",
      };
    }

    // Log warning if generating without TIN
    if (!hasTaxInfo && params.force_without_tin) {
      console.warn(
        `[1099] Generating form without TIN for contact ${params.contact_id} - user forced`,
      );
    }

    // Get tenant payer information
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return {
        success: false,
        error: "Tenant not found",
      };
    }

    // Validate tenant has payer information
    if (!tenant.payer_ein_encrypted || !tenant.payer_name) {
      return {
        success: false,
        error:
          "Tenant payer information not configured. Please update payer info in settings first.",
      };
    }

    // AC-11.3.7: Check for existing 1099 for this contact/year
    const existing = await db.query.form1099.findFirst({
      where: and(
        eq(form1099.tenant_id, tenantId),
        eq(form1099.contact_id, params.contact_id),
        eq(form1099.tax_year, params.tax_year),
      ),
    });

    if (existing) {
      return {
        success: false,
        error: `1099 already generated for this author for tax year ${params.tax_year}`,
      };
    }

    // AC-11.3.1: Calculate total earnings for the year
    const yearStart = `${params.tax_year}-01-01`;
    const yearEnd = `${params.tax_year}-12-31`;

    const earningsResult = await db.execute<{ total_earnings: string }>(sql`
      SELECT COALESCE(SUM(net_payable), 0) as total_earnings
      FROM ${statements}
      WHERE contact_id = ${params.contact_id}
        AND tenant_id = ${tenantId}
        AND period_start >= ${yearStart}
        AND period_end <= ${yearEnd}
        AND status IN ('generated', 'sent', 'paid')
    `);

    const totalEarnings = parseFloat(
      earningsResult.rows[0]?.total_earnings ?? "0",
    );

    // AC-11.3.1: Validate earnings meet threshold
    if (totalEarnings < FILING_THRESHOLD) {
      return {
        success: false,
        error: `Total earnings ($${totalEarnings.toFixed(2)}) do not meet the $10 royalty filing threshold`,
      };
    }

    // Build PDF data
    // Handle missing TIN when force_without_tin is used
    const recipientTinLastFour = hasTaxInfo
      ? (contact.tin_last_four ?? "XXXX")
      : "XXXX";
    const recipientTinType = hasTaxInfo
      ? ((contact.tin_type as "ssn" | "ein") ?? "ssn")
      : "ssn";

    const pdfData: Form1099PDFData = {
      form_id: crypto.randomUUID(),
      tax_year: params.tax_year,
      amount: totalEarnings.toFixed(2),
      payer: {
        name: tenant.payer_name,
        ein_last_four: tenant.payer_ein_last_four ?? "****",
        address_line1: tenant.payer_address_line1 ?? "",
        address_line2: tenant.payer_address_line2,
        city: tenant.payer_city ?? "",
        state: tenant.payer_state ?? "",
        zip: tenant.payer_zip ?? "",
      },
      recipient: {
        id: contact.id,
        name: `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim(),
        tin_last_four: recipientTinLastFour,
        tin_type: recipientTinType,
        address_line1: contact.address_line1 ?? "",
        address_line2: contact.address_line2,
        city: contact.city ?? "",
        state: contact.state ?? "",
        zip: contact.postal_code ?? "",
      },
    };

    // AC-11.3.5: Generate PDF
    const pdfBuffer = await generateForm1099PDF(pdfData);

    // AC-11.3.6: Upload to S3
    const s3Key = await upload1099PDF(
      pdfBuffer,
      tenantId,
      params.tax_year,
      pdfData.form_id,
    );

    // Insert record into database
    const [insertedForm] = await adminDb
      .insert(form1099)
      .values({
        id: pdfData.form_id,
        tenant_id: tenantId,
        contact_id: params.contact_id,
        tax_year: params.tax_year,
        amount: totalEarnings.toFixed(2),
        pdf_s3_key: s3Key,
        generated_at: new Date(),
        generated_by_user_id: user.id,
      })
      .returning();

    console.log(
      `[1099] Generated form ${pdfData.form_id} for contact ${params.contact_id}, year ${params.tax_year}`,
    );

    // AC-11.3.9: Audit logging for 1099 generation
    logAuditEvent({
      tenantId,
      userId: user.id,
      actionType: "CREATE",
      resourceType: "form_1099",
      resourceId: insertedForm.id,
      changes: {
        after: {
          contact_id: params.contact_id,
          tax_year: params.tax_year,
          amount: totalEarnings.toFixed(2),
          forced_without_tin: params.force_without_tin ?? false,
        },
      },
      metadata: {
        event: "1099_generated",
      },
    });

    return {
      success: true,
      data: {
        form_id: insertedForm.id,
        contact_id: params.contact_id,
        tax_year: params.tax_year,
        amount: totalEarnings.toFixed(2),
        pdf_s3_key: s3Key,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    if (message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to generate 1099 forms",
      };
    }

    console.error(`[1099] generate1099Action failed:`, error);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Generate 1099-MISC forms for multiple contacts in batch
 *
 * Processes each contact individually and returns aggregated results.
 *
 * Required roles: finance, admin, owner
 *
 * @param params - Tax year and list of contact IDs
 * @returns ActionResult with batch generation results
 */
export async function generateBatch1099sAction(params: {
  tax_year: number;
  contact_ids: string[];
}): Promise<ActionResult<BatchGenerate1099Result>> {
  const startTime = Date.now();

  try {
    // Verify permission
    await requirePermission(["finance", "admin", "owner"]);
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();

    // Validate at least one contact
    if (params.contact_ids.length === 0) {
      return {
        success: false,
        error: "At least one contact must be selected for batch generation",
      };
    }

    const results: BatchGenerate1099Result["results"] = [];
    let successCount = 0;
    let failureCount = 0;

    // Process each contact
    for (const contactId of params.contact_ids) {
      const result = await generate1099Action({
        contact_id: contactId,
        tax_year: params.tax_year,
      });

      if (result.success && result.data) {
        successCount++;
        results.push({
          contact_id: contactId,
          contact_name: "", // Will be filled from result if available
          success: true,
          form_id: result.data.form_id,
        });
      } else if (!result.success) {
        failureCount++;
        results.push({
          contact_id: contactId,
          contact_name: "",
          success: false,
          error: result.error,
        });
      }
    }

    const durationMs = Date.now() - startTime;

    console.log(
      `[1099] Batch generation complete: ${successCount} success, ${failureCount} failures in ${durationMs}ms`,
    );

    // AC-11.3.9: Audit logging for batch generation
    if (user) {
      logAuditEvent({
        tenantId,
        userId: user.id,
        actionType: "CREATE",
        resourceType: "form_1099",
        changes: {
          after: {
            tax_year: params.tax_year,
            success_count: successCount,
            failure_count: failureCount,
            total_requested: params.contact_ids.length,
          },
        },
        metadata: {
          event: "1099_batch_generated",
          duration_ms: durationMs,
        },
      });
    }

    return {
      success: true,
      data: {
        success_count: successCount,
        failure_count: failureCount,
        results,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    if (message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to generate 1099 forms",
      };
    }

    console.error(`[1099] generateBatch1099sAction failed:`, error);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Get presigned download URL for a 1099 form PDF
 *
 * Generates a presigned S3 URL (15-minute expiry) for downloading.
 *
 * Required roles: finance, admin, owner
 *
 * @param formId - UUID of the form_1099 record
 * @returns ActionResult with presigned URL
 */
export async function get1099DownloadUrlAction(
  formId: string,
): Promise<ActionResult<{ url: string }>> {
  try {
    // Verify permission
    await requirePermission(["finance", "admin", "owner"]);
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();
    const db = await getDb();

    // Get form record
    // CRITICAL: tenant_id FIRST for multi-tenant isolation
    const form = await db.query.form1099.findFirst({
      where: and(eq(form1099.tenant_id, tenantId), eq(form1099.id, formId)),
    });

    if (!form) {
      return {
        success: false,
        error: "1099 form not found",
      };
    }

    if (!form.pdf_s3_key) {
      return {
        success: false,
        error: "PDF not available for this form",
      };
    }

    // Generate presigned URL
    const url = await get1099DownloadUrl(form.pdf_s3_key);

    // AC-11.3.9: Audit logging for 1099 download
    if (user) {
      logAuditEvent({
        tenantId,
        userId: user.id,
        actionType: "VIEW",
        resourceType: "form_1099",
        resourceId: formId,
        metadata: {
          event: "1099_downloaded",
          contact_id: form.contact_id,
          tax_year: form.tax_year,
        },
      });
    }

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
        error: "You do not have permission to download 1099 forms",
      };
    }

    console.error(`[1099] get1099DownloadUrlAction failed:`, error);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Get 1099 generation statistics for a tax year
 *
 * Returns counts of eligible authors, those with tax info,
 * and already generated forms.
 *
 * Required roles: finance, admin, owner
 *
 * @param taxYear - Tax year to get stats for
 * @returns ActionResult with stats
 */
export async function get1099StatsAction(taxYear: number): Promise<
  ActionResult<{
    totalAuthors: number;
    eligibleAuthors: number;
    withTaxInfo: number;
    usBased: number;
    alreadyGenerated: number;
    totalEarnings: string;
  }>
> {
  try {
    // Verify permission
    await requirePermission(["finance", "admin", "owner"]);
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    const yearStart = `${taxYear}-01-01`;
    const yearEnd = `${taxYear}-12-31`;

    const result = await db.execute<{
      total_authors: number;
      eligible_authors: number;
      with_tax_info: number;
      us_based: number;
      already_generated: number;
      total_earnings: string;
    }>(sql`
      WITH author_earnings AS (
        SELECT
          c.id,
          c.tin_encrypted IS NOT NULL as has_tax_info,
          COALESCE(c.is_us_based, true) as is_us_based,
          COALESCE(SUM(s.net_payable), 0) as total_earnings
        FROM ${contacts} c
        INNER JOIN contact_roles cr ON c.id = cr.contact_id AND cr.role = 'author'
        LEFT JOIN ${statements} s ON s.contact_id = c.id
          AND s.tenant_id = ${tenantId}
          AND s.period_start >= ${yearStart}
          AND s.period_end <= ${yearEnd}
          AND s.status IN ('generated', 'sent', 'paid')
        WHERE c.tenant_id = ${tenantId}
        GROUP BY c.id, c.tin_encrypted, c.is_us_based
      ),
      stats AS (
        SELECT
          COUNT(*)::int as total_authors,
          COUNT(*) FILTER (WHERE total_earnings >= ${FILING_THRESHOLD})::int as eligible_authors,
          COUNT(*) FILTER (WHERE has_tax_info AND total_earnings >= ${FILING_THRESHOLD})::int as with_tax_info,
          COUNT(*) FILTER (WHERE is_us_based AND total_earnings >= ${FILING_THRESHOLD})::int as us_based,
          SUM(CASE WHEN total_earnings >= ${FILING_THRESHOLD} THEN total_earnings ELSE 0 END) as total_earnings
        FROM author_earnings
      ),
      generated_count AS (
        SELECT COUNT(*)::int as already_generated
        FROM ${form1099}
        WHERE tenant_id = ${tenantId} AND tax_year = ${taxYear}
      )
      SELECT
        s.total_authors,
        s.eligible_authors,
        s.with_tax_info,
        s.us_based,
        g.already_generated,
        COALESCE(s.total_earnings, 0)::text as total_earnings
      FROM stats s, generated_count g
    `);

    const row = result.rows[0];
    return {
      success: true,
      data: {
        totalAuthors: row?.total_authors ?? 0,
        eligibleAuthors: row?.eligible_authors ?? 0,
        withTaxInfo: row?.with_tax_info ?? 0,
        usBased: row?.us_based ?? 0,
        alreadyGenerated: row?.already_generated ?? 0,
        totalEarnings: row?.total_earnings ?? "0",
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    if (message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to view 1099 statistics",
      };
    }

    console.error(`[1099] get1099StatsAction failed:`, error);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Get authors with their 1099 eligibility information
 *
 * Returns detailed info about each author including earnings,
 * tax info status, and whether 1099 has been generated.
 *
 * Required roles: finance, admin, owner
 *
 * @param taxYear - Tax year to get info for
 * @returns ActionResult with author 1099 info array
 */
export async function getAuthors1099InfoAction(
  taxYear: number,
): Promise<ActionResult<Author1099Info[]>> {
  try {
    // Verify permission
    await requirePermission(["finance", "admin", "owner"]);
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    const yearStart = `${taxYear}-01-01`;
    const yearEnd = `${taxYear}-12-31`;

    const result = await db.execute<{
      id: string;
      first_name: string;
      last_name: string;
      email: string | null;
      tin_encrypted: string | null;
      tin_last_four: string | null;
      tin_type: "ssn" | "ein" | null;
      is_us_based: boolean;
      address_line1: string | null;
      address_line2: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      total_earnings: string;
      has_generated_1099: boolean;
      generated_1099_at: Date | null;
    }>(sql`
      WITH author_earnings AS (
        SELECT
          c.id,
          c.first_name,
          c.last_name,
          c.email,
          c.tin_encrypted,
          c.tin_last_four,
          c.tin_type,
          c.is_us_based,
          c.address_line1,
          c.address_line2,
          c.city,
          c.state,
          c.postal_code,
          COALESCE(SUM(s.net_payable), 0) as total_earnings
        FROM ${contacts} c
        INNER JOIN contact_roles cr ON c.id = cr.contact_id AND cr.role = 'author'
        LEFT JOIN ${statements} s ON s.contact_id = c.id
          AND s.tenant_id = ${tenantId}
          AND s.period_start >= ${yearStart}
          AND s.period_end <= ${yearEnd}
          AND s.status IN ('generated', 'sent', 'paid')
        WHERE c.tenant_id = ${tenantId}
        GROUP BY c.id, c.first_name, c.last_name, c.email,
                 c.tin_encrypted, c.tin_last_four, c.tin_type,
                 c.is_us_based, c.address_line1, c.address_line2,
                 c.city, c.state, c.postal_code
      ),
      existing_1099s AS (
        SELECT
          contact_id,
          generated_at
        FROM ${form1099}
        WHERE tenant_id = ${tenantId}
          AND tax_year = ${taxYear}
      )
      SELECT
        ae.*,
        CASE WHEN e.contact_id IS NOT NULL THEN true ELSE false END as has_generated_1099,
        e.generated_at as generated_1099_at
      FROM author_earnings ae
      LEFT JOIN existing_1099s e ON ae.id = e.contact_id
      ORDER BY ae.last_name, ae.first_name
    `);

    // Transform to Author1099Info
    const authors: Author1099Info[] = result.rows.map((row) => ({
      id: row.id,
      name: `${row.first_name} ${row.last_name}`.trim(),
      email: row.email,
      has_tax_info: !!(row.tin_encrypted && row.tin_last_four),
      tin_last_four: row.tin_last_four,
      tin_type: row.tin_type,
      is_us_based: row.is_us_based ?? true,
      total_earnings: row.total_earnings,
      meets_threshold: parseFloat(row.total_earnings) >= FILING_THRESHOLD,
      has_generated_1099: row.has_generated_1099,
      generated_1099_at: row.generated_1099_at,
      address_line1: row.address_line1,
      address_line2: row.address_line2,
      city: row.city,
      state: row.state,
      postal_code: row.postal_code,
    }));

    return {
      success: true,
      data: authors,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    if (message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to view author 1099 information",
      };
    }

    console.error(`[1099] getAuthors1099InfoAction failed:`, error);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Regenerate a 1099-MISC form for an existing record
 *
 * Deletes the existing form and generates a new one with current data.
 * Shows warning if amount has changed since original generation.
 *
 * Required roles: finance, admin, owner
 *
 * AC-11.3.7: Regenerate button with warning for changed amounts
 * AC-11.3.9: Audit logging for regeneration
 *
 * @param params - Form ID and optional confirmation flag
 * @returns ActionResult with regeneration details
 */
export async function regenerate1099Action(params: {
  /** Either form_id OR (contact_id + tax_year) must be provided */
  form_id?: string;
  contact_id?: string;
  tax_year?: number;
  confirm_amount_change?: boolean;
}): Promise<ActionResult<Regenerate1099Result>> {
  try {
    // Verify permission
    await requirePermission(["finance", "admin", "owner"]);
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();
    const db = await getDb();

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Get existing form record
    // CRITICAL: tenant_id FIRST for multi-tenant isolation
    let existingForm: Form1099 | undefined;
    if (params.form_id) {
      existingForm = await db.query.form1099.findFirst({
        where: and(
          eq(form1099.tenant_id, tenantId),
          eq(form1099.id, params.form_id),
        ),
      });
    } else if (params.contact_id && params.tax_year) {
      existingForm = await db.query.form1099.findFirst({
        where: and(
          eq(form1099.tenant_id, tenantId),
          eq(form1099.contact_id, params.contact_id),
          eq(form1099.tax_year, params.tax_year),
        ),
      });
    } else {
      return {
        success: false,
        error: "Either form_id or (contact_id + tax_year) must be provided",
      };
    }

    if (!existingForm) {
      return {
        success: false,
        error: "1099 form not found",
      };
    }

    // Calculate current earnings
    const yearStart = `${existingForm.tax_year}-01-01`;
    const yearEnd = `${existingForm.tax_year}-12-31`;

    const earningsResult = await db.execute<{ total_earnings: string }>(sql`
      SELECT COALESCE(SUM(net_payable), 0) as total_earnings
      FROM ${statements}
      WHERE contact_id = ${existingForm.contact_id}
        AND tenant_id = ${tenantId}
        AND period_start >= ${yearStart}
        AND period_end <= ${yearEnd}
        AND status IN ('generated', 'sent', 'paid')
    `);

    const newAmount = parseFloat(earningsResult.rows[0]?.total_earnings ?? "0");
    const previousAmount = parseFloat(existingForm.amount);
    const amountChanged = Math.abs(newAmount - previousAmount) > 0.01;

    // Require confirmation if amount changed
    if (amountChanged && !params.confirm_amount_change) {
      return {
        success: false,
        error: `Amount has changed from $${previousAmount.toFixed(2)} to $${newAmount.toFixed(2)}. Please confirm regeneration.`,
      };
    }

    // Delete existing form record (use existingForm.id to ensure we have the correct ID)
    await adminDb
      .delete(form1099)
      .where(
        and(eq(form1099.tenant_id, tenantId), eq(form1099.id, existingForm.id)),
      );

    // Generate new form
    const result = await generate1099Action({
      contact_id: existingForm.contact_id,
      tax_year: existingForm.tax_year,
    });

    if (!result.success) {
      return result as ActionResult<Regenerate1099Result>;
    }

    // AC-11.3.9: Audit logging for regeneration
    logAuditEvent({
      tenantId,
      userId: user.id,
      actionType: "UPDATE",
      resourceType: "form_1099",
      resourceId: result.data?.form_id,
      changes: {
        before: {
          form_id: params.form_id,
          amount: previousAmount.toFixed(2),
        },
        after: {
          form_id: result.data?.form_id,
          amount: newAmount.toFixed(2),
        },
      },
      metadata: {
        event: "1099_regenerated",
        amount_changed: amountChanged,
        contact_id: existingForm.contact_id,
        tax_year: existingForm.tax_year,
      },
    });

    return {
      success: true,
      data: {
        form_id: result.data?.form_id,
        contact_id: existingForm.contact_id,
        tax_year: existingForm.tax_year,
        new_amount: newAmount.toFixed(2),
        previous_amount: previousAmount.toFixed(2),
        amount_changed: amountChanged,
        pdf_s3_key: result.data?.pdf_s3_key,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    if (message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to regenerate 1099 forms",
      };
    }

    console.error(`[1099] regenerate1099Action failed:`, error);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Download all generated 1099 forms for a tax year as a ZIP file
 *
 * Fetches all generated 1099 PDFs for the tax year and packages
 * them into a ZIP file with presigned download URL.
 *
 * Required roles: finance, admin, owner
 *
 * AC-11.3.6: Download as ZIP option after batch generation
 *
 * @param taxYear - Tax year to download forms for
 * @returns ActionResult with presigned ZIP download URL
 */
export async function downloadAll1099sZipAction(
  taxYear: number,
): Promise<ActionResult<{ url: string; count: number }>> {
  try {
    // Verify permission
    await requirePermission(["finance", "admin", "owner"]);
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();
    const db = await getDb();

    // Get all generated forms for this tax year
    // CRITICAL: tenant_id FIRST for multi-tenant isolation
    const forms = await db
      .select({
        id: form1099.id,
        contact_id: form1099.contact_id,
        pdf_s3_key: form1099.pdf_s3_key,
        amount: form1099.amount,
      })
      .from(form1099)
      .innerJoin(contacts, eq(contacts.id, form1099.contact_id))
      .where(
        and(eq(form1099.tenant_id, tenantId), eq(form1099.tax_year, taxYear)),
      );

    if (forms.length === 0) {
      return {
        success: false,
        error: `No 1099 forms have been generated for tax year ${taxYear}`,
      };
    }

    // Get contact names for file naming
    const contactIds = forms.map((f) => f.contact_id);
    const contactsResult = await db
      .select({
        id: contacts.id,
        first_name: contacts.first_name,
        last_name: contacts.last_name,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.tenant_id, tenantId),
          sql`${contacts.id} = ANY(${contactIds})`,
        ),
      );

    const contactNames = new Map(
      contactsResult.map((c) => [
        c.id,
        `${c.last_name || ""}_${c.first_name || ""}`.replace(/\s+/g, "_"),
      ]),
    );

    // Build form list for ZIP
    const formsForZip = forms
      .filter(
        (f): f is typeof f & { pdf_s3_key: string } => f.pdf_s3_key !== null,
      )
      .map((f) => ({
        s3Key: f.pdf_s3_key,
        fileName: `1099-MISC_${taxYear}_${contactNames.get(f.contact_id) || f.contact_id}.pdf`,
      }));

    if (formsForZip.length === 0) {
      return {
        success: false,
        error: "No PDF files available for download",
      };
    }

    // Generate ZIP
    const zipBuffer = await generate1099ZipBuffer(formsForZip);

    // Upload ZIP and get presigned URL
    const url = await upload1099ZipAndGetUrl(zipBuffer, tenantId, taxYear);

    // Audit log
    if (user) {
      logAuditEvent({
        tenantId,
        userId: user.id,
        actionType: "VIEW",
        resourceType: "form_1099",
        metadata: {
          event: "1099_batch_downloaded",
          tax_year: taxYear,
          count: formsForZip.length,
        },
      });
    }

    return {
      success: true,
      data: {
        url,
        count: formsForZip.length,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    if (message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to download 1099 forms",
      };
    }

    console.error(`[1099] downloadAll1099sZipAction failed:`, error);
    return {
      success: false,
      error: message,
    };
  }
}
