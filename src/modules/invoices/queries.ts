/**
 * Invoice Module Queries
 *
 * Database queries for invoice and payment operations.
 *
 * Story: 8.1 - Create Invoice Database Schema
 * Story: 8.2 - Build Invoice Creation Form
 *
 * AC-8.2.2: Customer queries for invoice creation
 */

import { and, count, desc, eq, gte, inArray, like, lte } from "drizzle-orm";
import { contacts } from "@/db/schema/contacts";
import { invoices } from "@/db/schema/invoices";
import { getCurrentTenantId, getDb } from "@/lib/auth";
import { getContacts } from "@/modules/contacts/queries";
import type { ContactWithRoles } from "@/modules/contacts/types";
import type {
  Invoice,
  InvoiceFilters,
  InvoiceWithCustomer,
  InvoiceWithDetails,
  InvoiceWithLineItems,
} from "./types";

// =============================================================================
// Invoice Queries
// =============================================================================

/**
 * Get invoice by ID with line items
 *
 * Story 8.2: Build Invoice Creation Form
 * AC-8.2.10: Get invoice after creation for redirect
 *
 * @param id - Invoice UUID
 * @returns Invoice with line items or null if not found
 */
export async function getInvoiceById(
  id: string,
): Promise<InvoiceWithLineItems | null> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, id), eq(invoices.tenant_id, tenantId)),
    with: {
      lineItems: {
        orderBy: (items, { asc }) => [asc(items.line_number)],
      },
    },
  });

  return invoice as InvoiceWithLineItems | null;
}

/**
 * Get invoice by invoice number
 *
 * @param invoiceNumber - Invoice number (e.g., INV-20251206-0001)
 * @returns Invoice with line items or null if not found
 */
export async function getInvoiceByNumber(
  invoiceNumber: string,
): Promise<InvoiceWithLineItems | null> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const invoice = await db.query.invoices.findFirst({
    where: and(
      eq(invoices.invoice_number, invoiceNumber),
      eq(invoices.tenant_id, tenantId),
    ),
    with: {
      lineItems: {
        orderBy: (items, { asc }) => [asc(items.line_number)],
      },
    },
  });

  return invoice as InvoiceWithLineItems | null;
}

/**
 * Get all invoices for a tenant
 *
 * @param options - Filter options
 * @returns List of invoices
 */
export async function getInvoices(options?: {
  status?: string;
  customerId?: string;
  limit?: number;
}): Promise<Invoice[]> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const conditions = [eq(invoices.tenant_id, tenantId)];

  if (options?.status) {
    conditions.push(eq(invoices.status, options.status));
  }

  if (options?.customerId) {
    conditions.push(eq(invoices.customer_id, options.customerId));
  }

  const results = await db.query.invoices.findMany({
    where: and(...conditions),
    orderBy: [desc(invoices.created_at)],
    limit: options?.limit,
  });

  return results;
}

// =============================================================================
// Customer Queries (for Invoice Creation)
// =============================================================================

/**
 * Get customers for invoice creation
 *
 * Story 8.2: Build Invoice Creation Form
 * AC-8.2.2: Customer selector with searchable combobox
 *
 * Retrieves contacts with Customer role, sorted by name.
 *
 * @param options - Filter options
 * @returns List of contacts with Customer role
 */
export async function getCustomersForInvoice(options?: {
  limit?: number;
}): Promise<ContactWithRoles[]> {
  // Get all active contacts with customer role
  const contacts = await getContacts({
    role: "customer",
    includeInactive: false,
  });

  if (options?.limit) {
    return contacts.slice(0, options.limit);
  }

  return contacts;
}

// =============================================================================
// Invoice Number Preview
// =============================================================================

/**
 * Get next invoice number preview
 *
 * Story 8.2: Build Invoice Creation Form
 * AC-8.2.6: Invoice number generation preview
 *
 * Returns what the next invoice number would be without reserving it.
 * Note: This is for display only - actual generation happens in the
 * createInvoice action to handle concurrency.
 *
 * @returns Preview of next invoice number
 */
export async function getNextInvoiceNumberPreview(): Promise<string> {
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
  return `${prefix}${sequenceStr}`;
}

// =============================================================================
// Invoice List Queries (Story 8.3)
// =============================================================================

/**
 * Get invoices with customer information for list view
 *
 * Story 8.3: Build Invoice List and Detail Views
 * AC-8.3.1: Invoice list with customer name
 * AC-8.3.2: Support filtering by status, customer, date range
 *
 * @param options - Filter and pagination options
 * @returns List of invoices with customer information
 */
export async function getInvoicesWithCustomer(
  options?: InvoiceFilters & { limit?: number; offset?: number },
): Promise<InvoiceWithCustomer[]> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const conditions = [eq(invoices.tenant_id, tenantId)];

  if (options?.status) {
    conditions.push(eq(invoices.status, options.status));
  }

  if (options?.customerId) {
    conditions.push(eq(invoices.customer_id, options.customerId));
  }

  if (options?.startDate) {
    conditions.push(gte(invoices.invoice_date, options.startDate));
  }

  if (options?.endDate) {
    conditions.push(lte(invoices.invoice_date, options.endDate));
  }

  // Query invoices without relation to avoid lateral join issues
  const invoiceResults = await db.query.invoices.findMany({
    where: and(...conditions),
    orderBy: [desc(invoices.invoice_date)],
    limit: options?.limit || 50,
    offset: options?.offset || 0,
  });

  if (invoiceResults.length === 0) {
    return [];
  }

  // Get unique customer IDs
  const customerIds = [
    ...new Set(invoiceResults.map((inv) => inv.customer_id)),
  ];

  // Query contacts separately
  const customerResults = await db.query.contacts.findMany({
    where: inArray(contacts.id, customerIds),
  });

  // Create a map for quick lookup
  const customerMap = new Map(
    customerResults.map((c) => [
      c.id,
      {
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email,
      },
    ]),
  );

  // Map invoices with customer data
  return invoiceResults.map((invoice) => ({
    ...invoice,
    customer: customerMap.get(invoice.customer_id) || {
      id: invoice.customer_id,
      first_name: "Unknown",
      last_name: "Customer",
      email: null,
    },
  })) as InvoiceWithCustomer[];
}

/**
 * Count invoices for pagination
 *
 * Story 8.3: Build Invoice List and Detail Views
 * Task 7: Pagination support
 *
 * @param options - Filter options
 * @returns Total count of invoices matching filters
 */
export async function countInvoices(options?: InvoiceFilters): Promise<number> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const conditions = [eq(invoices.tenant_id, tenantId)];

  if (options?.status) {
    conditions.push(eq(invoices.status, options.status));
  }

  if (options?.customerId) {
    conditions.push(eq(invoices.customer_id, options.customerId));
  }

  if (options?.startDate) {
    conditions.push(gte(invoices.invoice_date, options.startDate));
  }

  if (options?.endDate) {
    conditions.push(lte(invoices.invoice_date, options.endDate));
  }

  const result = await db
    .select({ count: count() })
    .from(invoices)
    .where(and(...conditions));

  return result[0]?.count || 0;
}

/**
 * Get invoice with full details (line items and payments)
 *
 * Story 8.3: Build Invoice List and Detail Views
 * AC-8.3.5: Invoice detail view with all relations
 *
 * Story 8.4: Implement Payment Recording
 * AC-8.4.5: Include payment user info for "Recorded By" display
 *
 * @param id - Invoice UUID
 * @returns Invoice with line items and payments, or null if not found
 */
export async function getInvoiceWithDetails(
  id: string,
): Promise<InvoiceWithDetails | null> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Query invoice with line items and payments including user info
  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, id), eq(invoices.tenant_id, tenantId)),
    with: {
      lineItems: {
        orderBy: (items, { asc }) => [asc(items.line_number)],
      },
      payments: {
        orderBy: (pmts, { desc }) => [desc(pmts.payment_date)],
        with: {
          // AC-8.4.5: Include user info for "Recorded By" display
          createdByUser: true,
        },
      },
    },
  });

  if (!invoice) return null;

  // Query customer separately
  const customer = await db.query.contacts.findFirst({
    where: eq(contacts.id, invoice.customer_id),
  });

  // Map payments to include recordedBy user info
  const paymentsWithUser = invoice.payments.map((payment) => ({
    ...payment,
    recordedBy: payment.createdByUser
      ? {
          id: payment.createdByUser.id,
          email: payment.createdByUser.email,
        }
      : null,
  }));

  // Map to InvoiceWithDetails shape
  return {
    ...invoice,
    payments: paymentsWithUser,
    customer: customer
      ? {
          id: customer.id,
          first_name: customer.first_name,
          last_name: customer.last_name,
          email: customer.email,
        }
      : undefined,
  } as InvoiceWithDetails;
}

/**
 * Get invoice for editing (draft only)
 *
 * Story 8.3: Build Invoice List and Detail Views
 * AC-8.3.7: Edit invoice (draft only)
 *
 * @param id - Invoice UUID
 * @returns Invoice with line items if draft, null otherwise
 */
export async function getInvoiceForEdit(
  id: string,
): Promise<InvoiceWithLineItems | null> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const invoice = await db.query.invoices.findFirst({
    where: and(
      eq(invoices.id, id),
      eq(invoices.tenant_id, tenantId),
      eq(invoices.status, "draft"),
    ),
    with: {
      lineItems: {
        orderBy: (items, { asc }) => [asc(items.line_number)],
      },
    },
  });

  return invoice as InvoiceWithLineItems | null;
}
