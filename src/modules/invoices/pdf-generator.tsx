/**
 * Invoice PDF Generator Service
 *
 * Orchestrates PDF invoice generation and S3 upload.
 * Uses @react-pdf/renderer to create PDFs and S3 storage utilities for upload.
 *
 * Story: 8.6 - Implement Invoice PDF Generation and Email
 * Task 4: Create Invoice PDF Generator
 * AC-8.6.2: PDF uploads to S3 with key pattern invoices/{tenant_id}/{invoice_id}.pdf
 *
 * Related:
 * - src/modules/invoices/pdf-template.tsx (PDF template)
 * - src/modules/invoices/storage.ts (S3 operations)
 * - src/modules/invoices/types.ts (InvoicePDFData, PDFGenerationResult)
 */

import { eq } from "drizzle-orm";
import { adminDb } from "@/db";
import { contacts } from "@/db/schema/contacts";
import { invoiceLineItems, invoices } from "@/db/schema/invoices";
import { tenants } from "@/db/schema/tenants";
import { renderInvoicePDF } from "./pdf-template";
import { uploadInvoicePDF } from "./storage";
import type {
  InvoiceAddress,
  InvoicePDFData,
  PDFGenerationResult,
} from "./types";

/**
 * Format decimal string with 2 decimal places
 */
function formatDecimal(value: string | null): string {
  if (!value) return "0.00";
  const num = Number.parseFloat(value);
  return num.toFixed(2);
}

/**
 * Format tax rate as percentage string
 */
function formatTaxRate(rate: string | null): string {
  if (!rate) return "0%";
  const num = Number.parseFloat(rate) * 100;
  return `${num.toFixed(2)}%`;
}

/**
 * Format payment terms for display
 */
function formatPaymentTerms(terms: string, customDays: number | null): string {
  switch (terms) {
    case "net_30":
      return "Net 30";
    case "net_60":
      return "Net 60";
    case "due_on_receipt":
      return "Due on Receipt";
    case "custom":
      return customDays ? `Net ${customDays}` : "Custom";
    default:
      return terms;
  }
}

/**
 * Fetch invoice with all required data for PDF generation
 */
async function fetchInvoiceForPDF(
  invoiceId: string,
  tenantId: string,
): Promise<InvoicePDFData | null> {
  // Fetch invoice
  const invoice = await adminDb.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
  });

  if (!invoice || invoice.tenant_id !== tenantId) {
    return null;
  }

  // Fetch line items
  const lineItems = await adminDb.query.invoiceLineItems.findMany({
    where: eq(invoiceLineItems.invoice_id, invoiceId),
    orderBy: (items, { asc }) => [asc(items.line_number)],
  });

  // Fetch customer contact
  const customer = await adminDb.query.contacts.findFirst({
    where: eq(contacts.id, invoice.customer_id),
  });

  // Fetch tenant for company info
  const tenant = await adminDb.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });

  if (!customer || !tenant) {
    return null;
  }

  // Transform to PDF data structure
  const pdfData: InvoicePDFData = {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    invoiceDate: invoice.invoice_date,
    dueDate: invoice.due_date,
    company: {
      name: tenant.name,
      address: null, // TODO: Add address field to tenants schema in future story
    },
    customer: {
      name: `${customer.first_name} ${customer.last_name}`.trim(),
      email: customer.email,
    },
    billToAddress: invoice.bill_to_address as InvoiceAddress,
    shipToAddress: invoice.ship_to_address as InvoiceAddress | null,
    lineItems: lineItems.map((item) => ({
      lineNumber: item.line_number,
      itemCode: item.item_code,
      description: item.description,
      quantity: formatDecimal(item.quantity),
      unitPrice: formatDecimal(item.unit_price),
      amount: formatDecimal(item.amount),
    })),
    subtotal: formatDecimal(invoice.subtotal),
    taxRate: formatTaxRate(invoice.tax_rate),
    taxAmount: formatDecimal(invoice.tax_amount),
    shippingCost: formatDecimal(invoice.shipping_cost),
    total: formatDecimal(invoice.total),
    paymentTerms: formatPaymentTerms(
      invoice.payment_terms,
      invoice.custom_terms_days,
    ),
    notes: invoice.notes,
  };

  return pdfData;
}

/**
 * Generate invoice PDF and upload to S3
 *
 * Complete workflow:
 * 1. Fetch invoice with line items, customer, and tenant
 * 2. Transform data for PDF template
 * 3. Render PDF to buffer using @react-pdf/renderer
 * 4. Upload to S3 with proper key pattern
 * 5. Update invoice.pdf_s3_key in database
 * 6. Return S3 key on success
 *
 * @param invoiceId - Invoice UUID
 * @param tenantId - Tenant UUID
 * @returns Result with success status and S3 key or error
 */
export async function generateInvoicePDF(
  invoiceId: string,
  tenantId: string,
): Promise<PDFGenerationResult> {
  const startTime = Date.now();
  console.log(`[PDF] Starting invoice generation for ${invoiceId}`);

  try {
    // Step 1: Fetch invoice data
    const pdfData = await fetchInvoiceForPDF(invoiceId, tenantId);

    if (!pdfData) {
      return {
        success: false,
        error: "Invoice not found or access denied",
      };
    }

    const fetchTime = Date.now() - startTime;
    console.log(`[PDF] Fetched invoice data for ${invoiceId} (${fetchTime}ms)`);

    // Step 2: Render PDF to buffer
    const renderStart = Date.now();
    const pdfBuffer = await renderInvoicePDF(pdfData);
    const renderTime = Date.now() - renderStart;
    console.log(
      `[PDF] Rendered PDF for ${invoiceId} (${pdfBuffer.length} bytes, ${renderTime}ms)`,
    );

    // Step 3: Upload to S3
    const uploadStart = Date.now();
    const s3Key = await uploadInvoicePDF(pdfBuffer, tenantId, invoiceId);
    const uploadTime = Date.now() - uploadStart;
    console.log(`[PDF] Uploaded to S3: ${s3Key} (${uploadTime}ms)`);

    // Step 4: Update invoice record with S3 key
    await adminDb
      .update(invoices)
      .set({ pdf_s3_key: s3Key })
      .where(eq(invoices.id, invoiceId));

    const totalTime = Date.now() - startTime;
    console.log(
      `[PDF] Completed invoice PDF for ${invoiceId} (total: ${totalTime}ms)`,
    );

    return {
      success: true,
      s3Key,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`[PDF] Generation failed for ${invoiceId}:`, errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Generate PDF buffer without S3 upload (for preview/download)
 *
 * @param invoiceId - Invoice UUID
 * @param tenantId - Tenant UUID
 * @returns PDF buffer or null on error
 */
export async function generateInvoicePDFBuffer(
  invoiceId: string,
  tenantId: string,
): Promise<Buffer | null> {
  const pdfData = await fetchInvoiceForPDF(invoiceId, tenantId);

  if (!pdfData) {
    return null;
  }

  return await renderInvoicePDF(pdfData);
}
