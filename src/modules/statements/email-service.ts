/**
 * Statement Email Service
 *
 * Handles sending royalty statement emails to authors with PDF attachments.
 * Fetches statement data, downloads PDF from S3, renders email template,
 * and sends via Resend.
 *
 * Story: 5.4 - Implement Statement Email Delivery with Resend
 * Task 3: Create statement email service
 * AC-5.4.1: Email template with subject, summary, and CTA button
 * AC-5.4.2: PDF statement attached to email
 * AC-5.4.3: email_sent_at timestamp recorded after successful delivery
 *
 * Related:
 * - src/lib/email.ts (Resend client)
 * - src/modules/statements/email-template.tsx (React Email template)
 * - src/modules/statements/storage.ts (S3 PDF retrieval)
 */

import { format } from "date-fns";
import { eq } from "drizzle-orm";
import { adminDb } from "@/db";
import { authors } from "@/db/schema/authors";
import { statements } from "@/db/schema/statements";
import { tenants } from "@/db/schema/tenants";
import { getDefaultFromEmail, sendEmail } from "@/lib/email";
import {
  generateSubject,
  renderStatementEmail,
  type StatementEmailProps,
} from "./email-template";
import { getStatementPDFBuffer } from "./storage";
import type { StatementCalculations } from "./types";

/**
 * Result from sending a statement email
 */
export interface EmailDeliveryResult {
  /** Whether email was sent successfully */
  success: boolean;
  /** Resend message ID (on success) */
  messageId?: string;
  /** Error message (on failure) */
  error?: string;
}

/**
 * Parameters for sending a statement email
 */
export interface SendStatementEmailParams {
  /** Statement ID to send email for */
  statementId: string;
  /** Tenant ID for multi-tenant isolation */
  tenantId: string;
  /** Optional: Override portal URL (defaults to env config) */
  portalUrl?: string;
}

/**
 * Format period dates as a human-readable label
 * e.g., "Q4 2025" or "January - March 2025"
 */
function formatPeriodLabel(periodStart: Date, periodEnd: Date): string {
  const startMonth = periodStart.getMonth();
  const endMonth = periodEnd.getMonth();
  const year = periodEnd.getFullYear();

  // Check for standard quarters
  if (startMonth === 0 && endMonth === 2) return `Q1 ${year}`;
  if (startMonth === 3 && endMonth === 5) return `Q2 ${year}`;
  if (startMonth === 6 && endMonth === 8) return `Q3 ${year}`;
  if (startMonth === 9 && endMonth === 11) return `Q4 ${year}`;

  // Non-standard period: use month names
  const startLabel = format(periodStart, "MMMM");
  const endLabel = format(periodEnd, "MMMM yyyy");

  if (periodStart.getFullYear() !== periodEnd.getFullYear()) {
    return `${format(periodStart, "MMMM yyyy")} - ${endLabel}`;
  }

  return `${startLabel} - ${endLabel}`;
}

/**
 * Generate PDF filename for email attachment
 */
function generatePDFFilename(periodLabel: string, authorName: string): string {
  const sanitizedPeriod = periodLabel.replace(/\s+/g, "-").toLowerCase();
  const sanitizedName = authorName
    .replace(/[^a-zA-Z0-9]/g, "-")
    .toLowerCase()
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `royalty-statement-${sanitizedPeriod}-${sanitizedName}.pdf`;
}

/**
 * Send a statement email to an author
 *
 * Fetches all necessary data (statement, author, tenant, PDF) and sends
 * an email with the PDF attached.
 *
 * AC-5.4.1: Email template with subject, summary, and CTA button
 * AC-5.4.2: PDF statement attached to email
 *
 * @param params - Email parameters including statementId and tenantId
 * @returns Result with messageId on success, error on failure
 */
export async function sendStatementEmail(
  params: SendStatementEmailParams,
): Promise<EmailDeliveryResult> {
  const { statementId, tenantId, portalUrl } = params;

  try {
    // Step 1: Fetch statement with author details
    const statement = await adminDb.query.statements.findFirst({
      where: eq(statements.id, statementId),
    });

    if (!statement) {
      return {
        success: false,
        error: `Statement not found: ${statementId}`,
      };
    }

    if (statement.tenant_id !== tenantId) {
      return {
        success: false,
        error: "Statement does not belong to tenant",
      };
    }

    // Validate PDF exists
    if (!statement.pdf_s3_key) {
      return {
        success: false,
        error: "Statement PDF not yet generated",
      };
    }

    // Step 2: Fetch author details
    const author = await adminDb.query.authors.findFirst({
      where: eq(authors.id, statement.author_id),
    });

    if (!author) {
      return {
        success: false,
        error: `Author not found: ${statement.author_id}`,
      };
    }

    if (!author.email) {
      return {
        success: false,
        error: `Author ${author.name} has no email address`,
      };
    }

    // Step 3: Fetch tenant for publisher name
    const tenant = await adminDb.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return {
        success: false,
        error: `Tenant not found: ${tenantId}`,
      };
    }

    // Step 4: Download PDF from S3
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await getStatementPDFBuffer(statement.pdf_s3_key);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "PDF download failed";
      return {
        success: false,
        error: `Failed to retrieve PDF: ${message}`,
      };
    }

    // Step 5: Prepare email template data
    const calculations = statement.calculations as StatementCalculations;
    const periodStart = new Date(statement.period_start);
    const periodEnd = new Date(statement.period_end);
    const periodLabel = formatPeriodLabel(periodStart, periodEnd);

    const basePortalUrl =
      portalUrl ||
      process.env.PORTAL_URL ||
      `https://${tenant.subdomain}.salina-erp.com`;

    const templateProps: StatementEmailProps = {
      authorName: author.name,
      publisherName: tenant.name,
      periodLabel,
      grossRoyalties: calculations.grossRoyalty,
      recoupment: calculations.advanceRecoupment.thisPeriodsRecoupment,
      netPayable: calculations.netPayable,
      portalUrl: basePortalUrl,
      statementId,
    };

    // Step 6: Render email HTML
    const html = await renderStatementEmail(templateProps);
    const subject = generateSubject(periodLabel, tenant.name);

    // Step 7: Send via Resend with PDF attachment
    const emailResult = await sendEmail({
      from: getDefaultFromEmail(),
      to: author.email,
      subject,
      html,
      attachments: [
        {
          filename: generatePDFFilename(periodLabel, author.name),
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
      tags: [
        { name: "type", value: "royalty-statement" },
        { name: "tenant", value: tenantId },
        { name: "statement", value: statementId },
      ],
    });

    if (!emailResult.success) {
      console.error(
        `[EmailService] Failed to send statement ${statementId}:`,
        emailResult.error,
      );
      return {
        success: false,
        error: emailResult.error,
      };
    }

    console.log(
      `[EmailService] Sent statement ${statementId} to ${author.email}: ${emailResult.messageId}`,
    );

    return {
      success: true,
      messageId: emailResult.messageId,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown email service error";
    console.error(
      `[EmailService] Error sending statement ${statementId}:`,
      error,
    );
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Validate that a statement is eligible for email delivery
 *
 * Checks:
 * - Statement exists
 * - PDF is generated
 * - Author has email address
 *
 * @param statementId - Statement to validate
 * @param tenantId - Expected tenant
 * @returns Validation result with error details
 */
export async function validateStatementForEmail(
  statementId: string,
  tenantId: string,
): Promise<{ valid: boolean; error?: string }> {
  const statement = await adminDb.query.statements.findFirst({
    where: eq(statements.id, statementId),
  });

  if (!statement) {
    return { valid: false, error: "Statement not found" };
  }

  if (statement.tenant_id !== tenantId) {
    return { valid: false, error: "Statement does not belong to tenant" };
  }

  if (!statement.pdf_s3_key) {
    return { valid: false, error: "PDF not generated" };
  }

  const author = await adminDb.query.authors.findFirst({
    where: eq(authors.id, statement.author_id),
  });

  if (!author) {
    return { valid: false, error: "Author not found" };
  }

  if (!author.email) {
    return { valid: false, error: "Author has no email address" };
  }

  return { valid: true };
}
