/**
 * Invoice Module Server Actions
 *
 * Server actions for invoice and payment operations.
 *
 * Story: 8.1 - Create Invoice Database Schema (stub only)
 * Story: 8.2 - Build Invoice Creation Form (implementation)
 *
 * AC-8.2.6: Server action saves invoice with all line items in transaction
 * AC-8.2.10: Permission check: Finance, Admin, Owner only
 */

"use server";

import Decimal from "decimal.js";
import { and, desc, eq, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { adminDb } from "@/db";
import { invoiceLineItems, invoices, payments } from "@/db/schema/invoices";
import { logAuditEvent } from "@/lib/audit";
import {
  getCurrentTenantId,
  getCurrentUser,
  getDb,
  requirePermission,
} from "@/lib/auth";
import type { ActionResult } from "@/lib/types";
import { searchContacts } from "@/modules/contacts/queries";
import type { ContactWithRoles } from "@/modules/contacts/types";
import type { RecordPaymentInput } from "./schema";
import type { Invoice, InvoiceAddress, Payment } from "./types";

// =============================================================================
// Customer Search Actions
// =============================================================================

/**
 * Search for customers (contacts with Customer role)
 *
 * Story 8.2: Build Invoice Creation Form
 * AC-8.2.2: Customer selector with searchable combobox
 *
 * @param query - Search query string
 * @returns Contacts with Customer role matching the query
 */
export async function searchCustomersAction(
  query: string,
): Promise<ActionResult<ContactWithRoles[]>> {
  try {
    // Search contacts with limit
    const contacts = await searchContacts(query, { limit: 20 });

    // Filter to only include contacts with Customer role
    const customers = contacts.filter((contact) =>
      contact.roles.some((role) => role.role === "customer"),
    );

    return { success: true, data: customers };
  } catch (error) {
    console.error("searchCustomersAction error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to search customers",
    };
  }
}

// =============================================================================
// Invoice Number Generation
// =============================================================================

/**
 * Generate unique invoice number
 *
 * Story 8.2: Build Invoice Creation Form
 * AC-8.2.6: Invoice numbers follow pattern INV-YYYYMMDD-XXXX
 *
 * Pattern: INV-YYYYMMDD-XXXX where XXXX is auto-incremented per day
 * Examples: INV-20251206-0001, INV-20251206-0002
 *
 * @returns Unique invoice number for the current tenant and date
 */
export async function generateInvoiceNumber(): Promise<
  ActionResult<{ invoiceNumber: string }>
> {
  try {
    // Verify permission
    await requirePermission(["finance", "admin", "owner"]);
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Get today's date in YYYYMMDD format
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `INV-${dateStr}-`;

    // Find the highest existing invoice number for today (TENANT SCOPED)
    const existingInvoices = await db
      .select({ invoice_number: invoices.invoice_number })
      .from(invoices)
      .where(
        and(
          eq(invoices.tenant_id, tenantId),
          like(invoices.invoice_number, `${prefix}%`),
        ),
      )
      .orderBy(desc(invoices.invoice_number))
      .limit(1);

    let sequenceNumber = 1;
    if (existingInvoices.length > 0) {
      // Extract sequence number from existing invoice
      const lastNumber = existingInvoices[0].invoice_number;
      const match = lastNumber.match(/-(\d{4})$/);
      if (match) {
        sequenceNumber = Number.parseInt(match[1], 10) + 1;
      }
    }

    // Format sequence number with leading zeros (0001, 0002, etc.)
    const sequenceStr = sequenceNumber.toString().padStart(4, "0");
    const invoiceNumber = `${prefix}${sequenceStr}`;

    return {
      success: true,
      data: { invoiceNumber },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate invoice number";

    if (message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to create invoices",
      };
    }

    console.error("[Action] generateInvoiceNumber failed:", error);
    return {
      success: false,
      error: message,
    };
  }
}

// =============================================================================
// Invoice Creation Actions
// =============================================================================

/**
 * Line item input for invoice creation
 */
export interface CreateInvoiceLineItem {
  /** Line number (1-based ordering) */
  lineNumber: number;
  /** Item code or SKU (optional) */
  itemCode?: string;
  /** Line item description */
  description: string;
  /** Quantity (must be > 0) */
  quantity: string;
  /** Unit price (must be > 0) */
  unitPrice: string;
  /** Tax rate for this line item (optional, decimal e.g., "0.0825") */
  taxRate?: string;
  /** Line item amount (quantity * unitPrice) */
  amount: string;
  /** Optional title reference */
  titleId?: string;
}

/**
 * Input for creating a new invoice
 */
export interface CreateInvoiceInput {
  /** Customer contact ID */
  customerId: string;
  /** Invoice date */
  invoiceDate: Date;
  /** Due date */
  dueDate: Date;
  /** Payment terms */
  paymentTerms: "net_30" | "net_60" | "due_on_receipt" | "custom";
  /** Custom terms days (required when paymentTerms is 'custom') */
  customTermsDays?: number;
  /** Bill-to address */
  billToAddress: InvoiceAddress;
  /** Ship-to address (optional) */
  shipToAddress?: InvoiceAddress | null;
  /** Customer PO number (optional) */
  poNumber?: string;
  /** Shipping method description (optional) */
  shippingMethod?: string;
  /** Shipping cost */
  shippingCost: string;
  /** Tax rate as decimal string (e.g., "0.0825" for 8.25%) */
  taxRate: string;
  /** Invoice line items */
  lineItems: CreateInvoiceLineItem[];
  /** Customer-facing notes (optional) */
  notes?: string;
  /** Internal notes - staff only (optional) */
  internalNotes?: string;
}

/**
 * Create a new invoice with line items
 *
 * Story 8.2: Build Invoice Creation Form
 * AC-8.2.6: Server action saves invoice with all line items in transaction
 * AC-8.2.10: Permission check: Finance, Admin, Owner only
 *
 * Uses a database transaction to ensure atomicity:
 * 1. Generate invoice number
 * 2. Calculate totals
 * 3. Insert invoice record
 * 4. Insert all line items
 * 5. Log audit event (fire-and-forget)
 *
 * @param input - Invoice creation input with line items
 * @returns Created invoice with ID
 */
export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<ActionResult<{ invoice: Invoice }>> {
  try {
    // Verify permission (finance, admin, owner only)
    await requirePermission(["finance", "admin", "owner"]);
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Validate line items
    if (!input.lineItems || input.lineItems.length === 0) {
      return {
        success: false,
        error: "Invoice must have at least one line item",
      };
    }

    // Generate invoice number
    const numberResult = await generateInvoiceNumber();
    if (!numberResult.success) {
      return {
        success: false,
        error: numberResult.error,
      };
    }

    const invoiceNumber = numberResult.data.invoiceNumber;

    // Calculate invoice totals using Decimal.js for precision (AC-8.2.7)
    const subtotal = input.lineItems.reduce(
      (sum, item) => sum.plus(new Decimal(item.amount || "0")),
      new Decimal(0),
    );
    const taxRate = new Decimal(input.taxRate || "0");
    const taxAmount = subtotal.times(taxRate);
    const shippingCost = new Decimal(input.shippingCost || "0");
    const total = subtotal.plus(taxAmount).plus(shippingCost);
    const balanceDue = total; // New invoice, no payments yet

    // Use transaction to insert invoice and line items atomically
    const result = await adminDb.transaction(async (tx) => {
      // Insert invoice
      const [invoice] = await tx
        .insert(invoices)
        .values({
          tenant_id: tenantId,
          invoice_number: invoiceNumber,
          customer_id: input.customerId,
          invoice_date: input.invoiceDate,
          due_date: input.dueDate,
          status: "draft",
          bill_to_address: input.billToAddress,
          ship_to_address: input.shipToAddress || null,
          po_number: input.poNumber || null,
          payment_terms: input.paymentTerms,
          custom_terms_days: input.customTermsDays || null,
          shipping_method: input.shippingMethod || null,
          shipping_cost: shippingCost.toFixed(2),
          subtotal: subtotal.toFixed(2),
          tax_rate: taxRate.toFixed(4),
          tax_amount: taxAmount.toFixed(2),
          total: total.toFixed(2),
          amount_paid: "0.00",
          balance_due: balanceDue.toFixed(2),
          currency: "USD",
          notes: input.notes || null,
          internal_notes: input.internalNotes || null,
          created_by: user.id,
        })
        .returning();

      // Insert line items
      const lineItemValues = input.lineItems.map((item) => ({
        invoice_id: invoice.id,
        line_number: item.lineNumber,
        item_code: item.itemCode || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_rate: item.taxRate || null,
        amount: item.amount,
        title_id: item.titleId || null,
      }));

      await tx.insert(invoiceLineItems).values(lineItemValues);

      return invoice;
    });

    // Log audit event (fire-and-forget)
    logAuditEvent({
      tenantId,
      userId: user.id,
      actionType: "CREATE",
      resourceType: "invoice",
      resourceId: result.id,
      changes: {
        after: {
          invoice_number: invoiceNumber,
          customer_id: input.customerId,
          total: result.total,
          status: "draft",
          line_items_count: input.lineItems.length,
        },
      },
      metadata: {
        source: "invoice_form",
      },
    });

    return {
      success: true,
      data: { invoice: result },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create invoice";

    if (message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to create invoices",
      };
    }

    console.error("[Action] createInvoice failed:", error);
    return {
      success: false,
      error: message,
    };
  }
}

// =============================================================================
// Invoice Update Actions (Story 8.3)
// =============================================================================

/**
 * Update a draft invoice
 *
 * Story 8.3: Build Invoice List and Detail Views
 * AC-8.3.7: Only draft invoices can be edited
 * AC-8.3.8: Status transitions validation
 *
 * Uses a database transaction to:
 * 1. Verify invoice exists and is draft
 * 2. Delete existing line items
 * 3. Update invoice fields
 * 4. Insert new line items
 * 5. Log audit event
 *
 * @param invoiceId - Invoice UUID to update
 * @param input - Updated invoice data
 * @returns Updated invoice
 */
export async function updateInvoice(
  invoiceId: string,
  input: CreateInvoiceInput,
): Promise<ActionResult<{ invoice: Invoice }>> {
  try {
    await requirePermission(["finance", "admin", "owner"]);
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const db = await getDb();

    // Verify invoice exists and is draft
    const existing = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, invoiceId), eq(invoices.tenant_id, tenantId)),
    });

    if (!existing) {
      return { success: false, error: "Invoice not found" };
    }

    if (existing.status !== "draft") {
      return { success: false, error: "Only draft invoices can be edited" };
    }

    // Validate line items
    if (!input.lineItems || input.lineItems.length === 0) {
      return {
        success: false,
        error: "Invoice must have at least one line item",
      };
    }

    // Calculate invoice totals using Decimal.js
    const subtotal = input.lineItems.reduce(
      (sum, item) => sum.plus(new Decimal(item.amount || "0")),
      new Decimal(0),
    );
    const taxRate = new Decimal(input.taxRate || "0");
    const taxAmount = subtotal.times(taxRate);
    const shippingCost = new Decimal(input.shippingCost || "0");
    const total = subtotal.plus(taxAmount).plus(shippingCost);
    // Reset balance on edit (no payments for draft invoices)
    const balanceDue = total;

    // Use transaction to update invoice and line items atomically
    const result = await adminDb.transaction(async (tx) => {
      // Delete existing line items
      await tx
        .delete(invoiceLineItems)
        .where(eq(invoiceLineItems.invoice_id, invoiceId));

      // Update invoice
      const [updated] = await tx
        .update(invoices)
        .set({
          customer_id: input.customerId,
          invoice_date: input.invoiceDate,
          due_date: input.dueDate,
          payment_terms: input.paymentTerms,
          custom_terms_days: input.customTermsDays || null,
          bill_to_address: input.billToAddress,
          ship_to_address: input.shipToAddress || null,
          po_number: input.poNumber || null,
          shipping_method: input.shippingMethod || null,
          shipping_cost: shippingCost.toFixed(2),
          subtotal: subtotal.toFixed(2),
          tax_rate: taxRate.toFixed(4),
          tax_amount: taxAmount.toFixed(2),
          total: total.toFixed(2),
          balance_due: balanceDue.toFixed(2),
          notes: input.notes || null,
          internal_notes: input.internalNotes || null,
        })
        .where(eq(invoices.id, invoiceId))
        .returning();

      // Insert new line items
      const lineItemValues = input.lineItems.map((item) => ({
        invoice_id: invoiceId,
        line_number: item.lineNumber,
        item_code: item.itemCode || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_rate: item.taxRate || null,
        amount: item.amount,
        title_id: item.titleId || null,
      }));

      await tx.insert(invoiceLineItems).values(lineItemValues);

      return updated;
    });

    // Log audit event
    logAuditEvent({
      tenantId,
      userId: user.id,
      actionType: "UPDATE",
      resourceType: "invoice",
      resourceId: invoiceId,
      changes: {
        before: { total: existing.total, line_items_count: "unknown" },
        after: {
          total: result.total,
          line_items_count: input.lineItems.length,
        },
      },
      metadata: { source: "invoice_edit_form" },
    });

    // Revalidate cache to refresh list and detail views
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${invoiceId}`);

    return { success: true, data: { invoice: result } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update invoice";

    if (message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to edit invoices",
      };
    }

    console.error("[Action] updateInvoice failed:", error);
    return { success: false, error: message };
  }
}

/**
 * Void an invoice
 *
 * Story 8.3: Build Invoice List and Detail Views
 * AC-8.3.9: Void invoice with confirmation and reason
 * AC-8.3.8: Cannot void paid invoices
 *
 * @param invoiceId - Invoice UUID to void
 * @param reason - Optional reason for voiding
 * @returns Updated invoice
 */
export async function voidInvoice(
  invoiceId: string,
  reason?: string,
): Promise<ActionResult<{ invoice: Invoice }>> {
  try {
    await requirePermission(["finance", "admin", "owner"]);
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const db = await getDb();

    // Fetch invoice to validate
    const invoice = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, invoiceId), eq(invoices.tenant_id, tenantId)),
    });

    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    if (invoice.status === "paid") {
      return { success: false, error: "Cannot void a paid invoice" };
    }

    if (invoice.status === "void") {
      return { success: false, error: "Invoice is already void" };
    }

    const previousStatus = invoice.status;

    // Update invoice status to void
    const voidNote = reason
      ? `VOIDED (${new Date().toISOString()}): ${reason}`
      : `VOIDED (${new Date().toISOString()}): No reason provided`;

    const [updated] = await db
      .update(invoices)
      .set({
        status: "void",
        internal_notes: invoice.internal_notes
          ? `${invoice.internal_notes}\n\n${voidNote}`
          : voidNote,
      })
      .where(eq(invoices.id, invoiceId))
      .returning();

    // Log audit event
    logAuditEvent({
      tenantId,
      userId: user.id,
      actionType: "UPDATE",
      resourceType: "invoice",
      resourceId: invoiceId,
      changes: {
        before: { status: previousStatus },
        after: { status: "void" },
      },
      metadata: {
        reason: reason || "No reason provided",
        source: "void_invoice_action",
      },
    });

    // Revalidate cache to refresh list and detail views
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${invoiceId}`);

    return { success: true, data: { invoice: updated } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to void invoice";

    if (message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to void invoices",
      };
    }

    console.error("[Action] voidInvoice failed:", error);
    return { success: false, error: message };
  }
}

// =============================================================================
// Payment Recording Actions (Story 8.4)
// =============================================================================

/**
 * Record a payment against an invoice
 *
 * Story 8.4: Implement Payment Recording
 * AC-8.4.3: Payment processing - create record, update invoice amounts/status
 * AC-8.4.4: Transaction atomicity - rollback on failure
 * AC-8.4.6: Audit logging for payment
 * AC-8.4.7: Permission enforcement - Finance, Admin, Owner only
 * AC-8.4.8: Invoice status restrictions
 *
 * Uses a database transaction to ensure atomicity:
 * 1. Validate invoice exists and is in valid status
 * 2. Create payment record
 * 3. Update invoice amount_paid and balance_due
 * 4. Update invoice status based on balance
 * 5. Log audit event
 *
 * @param input - Payment recording input
 * @returns Created payment record
 */
export async function recordPayment(
  input: RecordPaymentInput,
): Promise<ActionResult<{ payment: Payment }>> {
  try {
    // Verify permission (finance, admin, owner only) - AC-8.4.7
    await requirePermission(["finance", "admin", "owner"]);
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const db = await getDb();

    // Verify invoice exists and is in valid state - AC-8.4.8
    const invoice = await db.query.invoices.findFirst({
      where: and(
        eq(invoices.id, input.invoice_id),
        eq(invoices.tenant_id, tenantId),
      ),
    });

    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    // Only allow payments for sent, partially_paid, or overdue invoices
    const validStatuses = ["sent", "partially_paid", "overdue"];
    if (!validStatuses.includes(invoice.status)) {
      return {
        success: false,
        error: `Cannot record payment for ${invoice.status} invoice`,
      };
    }

    // Use Decimal.js for precise financial math - AC-8.4.3
    const paymentAmount = new Decimal(input.amount);
    const currentPaid = new Decimal(invoice.amount_paid);
    const currentBalance = new Decimal(invoice.balance_due);

    // Server-side balance validation - log overpayments but allow them
    if (paymentAmount.greaterThan(currentBalance)) {
      console.log(
        `[Payment] Overpayment detected: ${paymentAmount.toFixed(2)} exceeds balance ${currentBalance.toFixed(2)} for invoice ${invoice.invoice_number}`,
      );
    }

    const newAmountPaid = currentPaid.plus(paymentAmount);
    const newBalance = currentBalance.minus(paymentAmount);

    // Determine new status based on remaining balance
    let newStatus: string;
    if (newBalance.lessThanOrEqualTo(0)) {
      newStatus = "paid";
    } else {
      newStatus = "partially_paid";
    }

    // Execute in transaction for atomicity - AC-8.4.4
    const result = await adminDb.transaction(async (tx) => {
      // Insert payment record
      const [payment] = await tx
        .insert(payments)
        .values({
          tenant_id: tenantId,
          invoice_id: input.invoice_id,
          payment_date: input.payment_date,
          amount: paymentAmount.toFixed(2),
          payment_method: input.payment_method,
          reference_number: input.reference_number || null,
          notes: input.notes || null,
          created_by: user.id,
        })
        .returning();

      // Update invoice - balance floor at 0 to prevent negative
      await tx
        .update(invoices)
        .set({
          amount_paid: newAmountPaid.toFixed(2),
          balance_due: newBalance.lessThan(0) ? "0.00" : newBalance.toFixed(2),
          status: newStatus,
        })
        .where(eq(invoices.id, input.invoice_id));

      return payment;
    });

    // Log audit event - AC-8.4.6
    logAuditEvent({
      tenantId,
      userId: user.id,
      actionType: "CREATE",
      resourceType: "payment",
      resourceId: result.id,
      changes: {
        after: {
          amount: input.amount,
          invoice_id: input.invoice_id,
          payment_method: input.payment_method,
          new_invoice_status: newStatus,
        },
      },
      metadata: { source: "record_payment_modal" },
    });

    // Revalidate paths to refresh UI
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${input.invoice_id}`);

    return { success: true, data: { payment: result } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to record payment";

    if (message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to record payments",
      };
    }

    console.error("[Action] recordPayment failed:", error);
    return { success: false, error: message };
  }
}

// =============================================================================
// PDF and Email Actions (Story 8.6)
// =============================================================================

/**
 * Generate invoice PDF and return download URL
 *
 * Story 8.6: Implement Invoice PDF Generation and Email
 * AC-8.6.2: PDF Generation with S3 storage
 * AC-8.6.6: Download button integration
 * AC-8.6.8: Permission enforcement
 *
 * If PDF already exists (cached), returns presigned URL for existing PDF.
 * Use forceRegenerate=true to force regeneration.
 *
 * @param invoiceId - Invoice UUID
 * @param forceRegenerate - Force PDF regeneration even if cached
 * @returns Download URL for the PDF
 */
export async function generateInvoicePDFAction(
  invoiceId: string,
  forceRegenerate = false,
): Promise<ActionResult<{ downloadUrl: string }>> {
  // Dynamic import to avoid bundling issues
  const { generateInvoicePDF } = await import("./pdf-generator");
  const { getInvoiceDownloadUrl } = await import("./storage");

  try {
    // Verify permission (finance, admin, owner only) - AC-8.6.8
    await requirePermission(["finance", "admin", "owner"]);
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();
    const db = await getDb();

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Fetch invoice to check for cached PDF
    const invoice = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, invoiceId), eq(invoices.tenant_id, tenantId)),
    });

    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    // Check for cached PDF (unless force regenerate)
    if (invoice.pdf_s3_key && !forceRegenerate) {
      try {
        const downloadUrl = await getInvoiceDownloadUrl(invoice.pdf_s3_key);
        return { success: true, data: { downloadUrl } };
      } catch (_error) {
        // PDF not found in S3, regenerate
        console.log(
          `[PDF] Cached PDF not found for ${invoiceId}, regenerating`,
        );
      }
    }

    // Generate new PDF
    const result = await generateInvoicePDF(invoiceId, tenantId);

    if (!result.success || !result.s3Key) {
      return { success: false, error: result.error ?? "PDF generation failed" };
    }

    // Get presigned download URL
    const downloadUrl = await getInvoiceDownloadUrl(result.s3Key);

    // Log audit event
    logAuditEvent({
      tenantId,
      userId: user.id,
      actionType: "UPDATE",
      resourceType: "invoice",
      resourceId: invoiceId,
      changes: {
        after: { action: "pdf_generated", pdf_s3_key: result.s3Key },
      },
      metadata: { source: "generate_pdf_action" },
    });

    return { success: true, data: { downloadUrl } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate PDF";

    if (message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to generate invoice PDFs",
      };
    }

    console.error("[Action] generateInvoicePDFAction failed:", error);
    return { success: false, error: message };
  }
}

/**
 * Send invoice email to customer
 *
 * Story 8.6: Implement Invoice PDF Generation and Email
 * AC-8.6.3: Email delivery with PDF attachment
 * AC-8.6.4: Send status tracking
 * AC-8.6.7: Send button integration
 * AC-8.6.8: Permission enforcement
 *
 * Workflow:
 * 1. Generate PDF if not already generated
 * 2. Send email with PDF attachment
 * 3. Update invoice status to 'sent' (if was draft)
 * 4. Update sent_at timestamp
 * 5. Log audit event
 *
 * @param invoiceId - Invoice UUID
 * @returns Message ID from email service
 */
export async function sendInvoiceAction(
  invoiceId: string,
): Promise<ActionResult<{ messageId: string }>> {
  // Dynamic imports
  const { generateInvoicePDF } = await import("./pdf-generator");
  const { sendInvoiceEmail } = await import("./email-service");

  try {
    // Verify permission (finance, admin, owner only) - AC-8.6.8
    await requirePermission(["finance", "admin", "owner"]);
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();
    const db = await getDb();

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Fetch invoice
    const invoice = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, invoiceId), eq(invoices.tenant_id, tenantId)),
    });

    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    // Cannot send void invoices
    if (invoice.status === "void") {
      return { success: false, error: "Cannot send a voided invoice" };
    }

    // Generate PDF if not already done
    if (!invoice.pdf_s3_key) {
      const pdfResult = await generateInvoicePDF(invoiceId, tenantId);
      if (!pdfResult.success || !pdfResult.s3Key) {
        return {
          success: false,
          error: `PDF generation failed: ${pdfResult.error ?? "unknown error"}`,
        };
      }
    }

    // Send email
    const emailResult = await sendInvoiceEmail({ invoiceId, tenantId });
    if (!emailResult.success || !emailResult.messageId) {
      return {
        success: false,
        error: emailResult.error ?? "Email delivery failed",
      };
    }

    // Update invoice status and sent_at - AC-8.6.4
    const newStatus = invoice.status === "draft" ? "sent" : invoice.status;
    await db
      .update(invoices)
      .set({
        status: newStatus,
        sent_at: new Date(),
      })
      .where(eq(invoices.id, invoiceId));

    // Log audit event
    logAuditEvent({
      tenantId,
      userId: user.id,
      actionType: "UPDATE",
      resourceType: "invoice",
      resourceId: invoiceId,
      changes: {
        before: { status: invoice.status },
        after: { action: "email_sent", status: newStatus },
      },
      metadata: {
        messageId: emailResult.messageId,
        source: "send_invoice_action",
      },
    });

    // Revalidate paths
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${invoiceId}`);

    return { success: true, data: { messageId: emailResult.messageId } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send invoice";

    if (message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to send invoices",
      };
    }

    console.error("[Action] sendInvoiceAction failed:", error);
    return { success: false, error: message };
  }
}

/**
 * Resend invoice email
 *
 * Story 8.6: Implement Invoice PDF Generation and Email
 * AC-8.6.5: Resend capability
 * AC-8.6.8: Permission enforcement
 *
 * For already-sent invoices, allows resending the email.
 * Regenerates PDF if requested, or uses cached version.
 *
 * @param invoiceId - Invoice UUID
 * @param regeneratePDF - Force PDF regeneration before resend
 * @returns Message ID from email service
 */
export async function resendInvoiceAction(
  invoiceId: string,
  regeneratePDF = false,
): Promise<ActionResult<{ messageId: string }>> {
  // Dynamic imports
  const { generateInvoicePDF } = await import("./pdf-generator");
  const { sendInvoiceEmail } = await import("./email-service");

  try {
    // Verify permission (finance, admin, owner only) - AC-8.6.8
    await requirePermission(["finance", "admin", "owner"]);
    const tenantId = await getCurrentTenantId();
    const user = await getCurrentUser();
    const db = await getDb();

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Fetch invoice
    const invoice = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, invoiceId), eq(invoices.tenant_id, tenantId)),
    });

    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    // Only allow resend for sent/partially_paid/paid/overdue invoices
    const resendableStatuses = ["sent", "partially_paid", "paid", "overdue"];
    if (!resendableStatuses.includes(invoice.status)) {
      return {
        success: false,
        error: `Cannot resend invoice with status '${invoice.status}'`,
      };
    }

    // Regenerate PDF if requested or missing
    if (regeneratePDF || !invoice.pdf_s3_key) {
      const pdfResult = await generateInvoicePDF(invoiceId, tenantId);
      if (!pdfResult.success || !pdfResult.s3Key) {
        return {
          success: false,
          error: `PDF generation failed: ${pdfResult.error ?? "unknown error"}`,
        };
      }
    }

    // Send email
    const emailResult = await sendInvoiceEmail({ invoiceId, tenantId });
    if (!emailResult.success || !emailResult.messageId) {
      return {
        success: false,
        error: emailResult.error ?? "Email delivery failed",
      };
    }

    // Update sent_at timestamp - AC-8.6.5
    await db
      .update(invoices)
      .set({ sent_at: new Date() })
      .where(eq(invoices.id, invoiceId));

    // Log audit event for resend
    logAuditEvent({
      tenantId,
      userId: user.id,
      actionType: "UPDATE",
      resourceType: "invoice",
      resourceId: invoiceId,
      changes: {
        after: { action: "email_resent" },
      },
      metadata: {
        messageId: emailResult.messageId,
        regeneratedPDF: regeneratePDF,
        source: "resend_invoice_action",
      },
    });

    // Revalidate paths
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${invoiceId}`);

    return { success: true, data: { messageId: emailResult.messageId } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to resend invoice";

    if (message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to resend invoices",
      };
    }

    console.error("[Action] resendInvoiceAction failed:", error);
    return { success: false, error: message };
  }
}
