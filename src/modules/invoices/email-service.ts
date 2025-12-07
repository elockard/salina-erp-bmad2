/**
 * Invoice Email Service
 *
 * Handles sending invoice emails to customers with PDF attachments.
 * Fetches invoice data, downloads PDF from S3, renders email template,
 * and sends via Resend.
 *
 * Story: 8.6 - Implement Invoice PDF Generation and Email
 * Task 6: Create Invoice Email Service
 * AC-8.6.3: Email delivery with PDF attachment
 * AC-8.6.4: Send status tracking (sent_at timestamp)
 *
 * Related:
 * - src/lib/email.ts (Resend client)
 * - src/modules/invoices/email-template.tsx (React Email template)
 * - src/modules/invoices/storage.ts (S3 PDF retrieval)
 */

import { format } from "date-fns";
import { eq } from "drizzle-orm";
import { adminDb } from "@/db";
import { contacts } from "@/db/schema/contacts";
import { invoices } from "@/db/schema/invoices";
import { tenants } from "@/db/schema/tenants";
import { getDefaultFromEmail, sendEmail } from "@/lib/email";
import {
  generateInvoiceEmailSubject,
  renderInvoiceEmail,
  type InvoiceEmailProps,
} from "./email-template";
import { getInvoicePDFBuffer } from "./storage";

/**
 * Result from sending an invoice email
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
 * Parameters for sending an invoice email
 */
export interface SendInvoiceEmailParams {
  /** Invoice ID to send email for */
  invoiceId: string;
  /** Tenant ID for multi-tenant isolation */
  tenantId: string;
  /** Optional: Override portal URL (defaults to env config) */
  portalUrl?: string;
}

/**
 * Generate PDF filename for email attachment
 */
function generatePDFFilename(
  invoiceNumber: string,
  customerName: string,
): string {
  const sanitizedInvoice = invoiceNumber.replace(/[^a-zA-Z0-9-]/g, "");
  const sanitizedName = customerName
    .replace(/[^a-zA-Z0-9]/g, "-")
    .toLowerCase()
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${sanitizedInvoice}-${sanitizedName}.pdf`;
}

/**
 * Send an invoice email to a customer
 *
 * Fetches all necessary data (invoice, customer, tenant, PDF) and sends
 * an email with the PDF attached.
 *
 * AC-8.6.3: Email with professional HTML template and PDF attachment
 *
 * @param params - Email parameters including invoiceId and tenantId
 * @returns Result with messageId on success, error on failure
 */
export async function sendInvoiceEmail(
  params: SendInvoiceEmailParams,
): Promise<EmailDeliveryResult> {
  const { invoiceId, tenantId, portalUrl } = params;

  try {
    // Step 1: Fetch invoice
    const invoice = await adminDb.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
    });

    if (!invoice) {
      return {
        success: false,
        error: `Invoice not found: ${invoiceId}`,
      };
    }

    if (invoice.tenant_id !== tenantId) {
      return {
        success: false,
        error: "Invoice does not belong to tenant",
      };
    }

    // Validate PDF exists
    if (!invoice.pdf_s3_key) {
      return {
        success: false,
        error: "Invoice PDF not yet generated",
      };
    }

    // Step 2: Fetch customer contact
    const customer = await adminDb.query.contacts.findFirst({
      where: eq(contacts.id, invoice.customer_id),
    });

    if (!customer) {
      return {
        success: false,
        error: `Customer not found: ${invoice.customer_id}`,
      };
    }

    if (!customer.email) {
      return {
        success: false,
        error: `Customer ${customer.first_name} ${customer.last_name} has no email address`,
      };
    }

    // Step 3: Fetch tenant for company name
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
      pdfBuffer = await getInvoicePDFBuffer(invoice.pdf_s3_key);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "PDF download failed";
      return {
        success: false,
        error: `Failed to retrieve PDF: ${message}`,
      };
    }

    // Step 5: Prepare email template data
    const customerName = `${customer.first_name} ${customer.last_name}`.trim();
    const basePortalUrl =
      portalUrl ||
      process.env.PORTAL_URL ||
      (tenant.subdomain ? `https://${tenant.subdomain}.salina.media` : undefined);

    const templateProps: InvoiceEmailProps = {
      customerName,
      companyName: tenant.name,
      invoiceNumber: invoice.invoice_number,
      invoiceDate: format(invoice.invoice_date, "MMM d, yyyy"),
      dueDate: format(invoice.due_date, "MMM d, yyyy"),
      amountDue: Number.parseFloat(invoice.balance_due).toFixed(2),
      invoiceId,
      portalUrl: basePortalUrl,
    };

    // Step 6: Render email HTML
    const html = await renderInvoiceEmail(templateProps);
    const subject = generateInvoiceEmailSubject(
      invoice.invoice_number,
      tenant.name,
    );

    // Step 7: Send via Resend with PDF attachment
    const emailResult = await sendEmail({
      from: getDefaultFromEmail(),
      to: customer.email,
      subject,
      html,
      attachments: [
        {
          filename: generatePDFFilename(invoice.invoice_number, customerName),
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
      tags: [
        { name: "type", value: "invoice" },
        { name: "tenant", value: tenantId },
        { name: "invoice", value: invoiceId },
      ],
    });

    if (!emailResult.success) {
      console.error(
        `[EmailService] Failed to send invoice ${invoiceId}:`,
        emailResult.error,
      );
      return {
        success: false,
        error: emailResult.error,
      };
    }

    console.log(
      `[EmailService] Sent invoice ${invoiceId} to ${customer.email}: ${emailResult.messageId}`,
    );

    return {
      success: true,
      messageId: emailResult.messageId,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown email service error";
    console.error(`[EmailService] Error sending invoice ${invoiceId}:`, error);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Validate that an invoice is eligible for email delivery
 *
 * Checks:
 * - Invoice exists
 * - PDF is generated
 * - Customer has email address
 *
 * @param invoiceId - Invoice to validate
 * @param tenantId - Expected tenant
 * @returns Validation result with error details
 */
export async function validateInvoiceForEmail(
  invoiceId: string,
  tenantId: string,
): Promise<{ valid: boolean; error?: string; customerEmail?: string }> {
  const invoice = await adminDb.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
  });

  if (!invoice) {
    return { valid: false, error: "Invoice not found" };
  }

  if (invoice.tenant_id !== tenantId) {
    return { valid: false, error: "Invoice does not belong to tenant" };
  }

  if (!invoice.pdf_s3_key) {
    return { valid: false, error: "PDF not generated" };
  }

  const customer = await adminDb.query.contacts.findFirst({
    where: eq(contacts.id, invoice.customer_id),
  });

  if (!customer) {
    return { valid: false, error: "Customer not found" };
  }

  if (!customer.email) {
    return { valid: false, error: "Customer has no email address" };
  }

  return { valid: true, customerEmail: customer.email };
}
