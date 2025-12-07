/**
 * Invoice Module Types
 *
 * TypeScript interfaces for the invoice and accounts receivable system.
 * Defines address structures, calculation types, and composite query types.
 *
 * Story: 8.1 - Create Invoice Database Schema
 * Related FRs: FR96-FR106 (Invoicing & Accounts Receivable)
 */

import type {
  invoiceLineItems,
  invoices,
  payments,
} from "@/db/schema/invoices";
import type { Address } from "@/modules/contacts/types";

// =============================================================================
// Base Types (from Drizzle schema)
// =============================================================================

/** Invoice record from database */
export type Invoice = typeof invoices.$inferSelect;

/** Invoice insert data (excludes auto-generated fields) */
export type InsertInvoice = typeof invoices.$inferInsert;

/** Invoice line item record from database */
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;

/** Invoice line item insert data */
export type InsertInvoiceLineItem = typeof invoiceLineItems.$inferInsert;

/** Payment record from database */
export type Payment = typeof payments.$inferSelect;

/** Payment insert data */
export type InsertPayment = typeof payments.$inferInsert;

// =============================================================================
// Address Type (reuse from contacts)
// =============================================================================

/**
 * Invoice address type - direct alias to contacts Address
 * DO NOT create duplicate - reuse existing from contacts module
 *
 * Address structure (from src/modules/contacts/types.ts:37-44):
 * {
 *   line1?: string;
 *   line2?: string;
 *   city?: string;
 *   state?: string;
 *   postal_code?: string;
 *   country?: string;
 * }
 */
export type InvoiceAddress = Address;

// =============================================================================
// Calculation Types
// =============================================================================

/**
 * Line item calculation for individual line totals
 * Used when computing invoice line item amounts
 */
export interface LineItemCalculation {
  /** Line number (1-based) */
  lineNumber: number;
  /** Quantity ordered */
  quantity: number;
  /** Unit price */
  unitPrice: number;
  /** Line subtotal (quantity * unitPrice) */
  lineSubtotal: number;
  /** Tax rate as decimal (e.g., 0.0825 = 8.25%) */
  taxRate: number;
  /** Line tax amount */
  lineTax: number;
  /** Line total including tax */
  lineTotal: number;
}

/**
 * Invoice calculation interface for computed fields
 * Used when calculating invoice totals
 */
export interface InvoiceCalculations {
  /** Individual line item calculations */
  lineItemCalculations: LineItemCalculation[];
  /** Sum of all line item amounts */
  invoiceSubtotal: number;
  /** Total tax amount */
  totalTax: number;
  /** Shipping cost */
  shippingCost: number;
  /** Invoice total (subtotal + tax + shipping) */
  invoiceTotal: number;
  /** Amount already paid */
  amountPaid: number;
  /** Balance due (total - amountPaid) */
  balanceDue: number;
}

// =============================================================================
// Composite Types (for queries with relations)
// =============================================================================

/**
 * Invoice with all line items
 * Used for invoice detail views
 */
export interface InvoiceWithLineItems extends Invoice {
  lineItems: InvoiceLineItem[];
}

/**
 * Invoice with all payments
 * Used for AR tracking and payment history
 */
export interface InvoiceWithPayments extends Invoice {
  payments: Payment[];
}

/**
 * Invoice with line items and payments
 * Full invoice detail view
 */
export interface InvoiceWithDetails extends Invoice {
  lineItems: InvoiceLineItem[];
  payments: PaymentWithUser[];
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
  };
}

/**
 * Payment with user info for "Recorded By" display
 * Used in payment history table (AC-8.4.5)
 */
export interface PaymentWithUser extends Payment {
  /** User who recorded the payment */
  recordedBy?: {
    id: string;
    email: string;
  } | null;
}

/**
 * Invoice with customer contact info
 * Used for invoice list views
 */
export interface InvoiceWithCustomer extends Invoice {
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
  };
}

// =============================================================================
// Aging Types (for AR reporting)
// =============================================================================

/**
 * Aging bucket type for AR aging reports (FR104)
 * Represents a single aging period with its outstanding balance
 */
export interface AgingBucket {
  /** Aging period: "current", "1-30", "31-60", "61-90", "90+" */
  bucket: "current" | "1-30" | "31-60" | "61-90" | "90+";
  /** Total amount in this aging bucket */
  amount: number;
  /** Number of invoices in this bucket */
  count: number;
}

/**
 * Customer aging summary for AR dashboard
 */
export interface CustomerAgingSummary {
  customerId: string;
  customerName: string;
  /** Total outstanding balance across all buckets */
  totalOutstanding: number;
  /** Aging buckets breakdown */
  buckets: AgingBucket[];
}

// =============================================================================
// Filter Types
// =============================================================================

/**
 * Options for filtering invoice queries
 */
export interface InvoiceFilters {
  /** Filter by status */
  status?: string;
  /** Filter by customer */
  customerId?: string;
  /** Start date for invoice_date range */
  startDate?: Date;
  /** End date for invoice_date range */
  endDate?: Date;
  /** Include only overdue invoices */
  overdueOnly?: boolean;
  /** Search by invoice number */
  invoiceNumber?: string;
}

/**
 * Options for filtering payment queries
 */
export interface PaymentFilters {
  /** Filter by invoice */
  invoiceId?: string;
  /** Filter by payment method */
  paymentMethod?: string;
  /** Start date for payment_date range */
  startDate?: Date;
  /** End date for payment_date range */
  endDate?: Date;
}

// =============================================================================
// Status and Terms Types
// =============================================================================

/** Invoice status values */
export type InvoiceStatusType =
  | "draft"
  | "sent"
  | "paid"
  | "partially_paid"
  | "overdue"
  | "void";

/** Payment terms values */
export type PaymentTermsType =
  | "net_30"
  | "net_60"
  | "due_on_receipt"
  | "custom";

/** Payment method values */
export type PaymentMethodType =
  | "check"
  | "wire"
  | "credit_card"
  | "ach"
  | "other";

// =============================================================================
// PDF Generation Types
// =============================================================================

/**
 * Invoice PDF data structure
 * Contains all data needed to render an invoice PDF
 *
 * Story: 8.6 - Implement Invoice PDF Generation and Email
 * AC-8.6.1: Invoice PDF Layout
 */
export interface InvoicePDFData {
  /** Invoice UUID */
  invoiceId: string;
  /** Invoice number (e.g., INV-20251207-0001) */
  invoiceNumber: string;
  /** Date invoice was issued */
  invoiceDate: Date;
  /** Payment due date */
  dueDate: Date;
  /** Company/publisher information */
  company: {
    name: string;
    address: string | null;
  };
  /** Customer information */
  customer: {
    name: string;
    email: string | null;
  };
  /** Bill-to address */
  billToAddress: InvoiceAddress;
  /** Ship-to address (optional) */
  shipToAddress: InvoiceAddress | null;
  /** Line items for the invoice */
  lineItems: {
    lineNumber: number;
    itemCode: string | null;
    description: string;
    quantity: string;
    unitPrice: string;
    amount: string;
  }[];
  /** Invoice subtotal (before tax/shipping) */
  subtotal: string;
  /** Tax rate as percentage string (e.g., "8.25%") */
  taxRate: string;
  /** Tax amount */
  taxAmount: string;
  /** Shipping cost */
  shippingCost: string;
  /** Invoice total */
  total: string;
  /** Payment terms (e.g., "Net 30") */
  paymentTerms: string;
  /** Customer-facing notes */
  notes: string | null;
}

/**
 * Result from PDF generation operation
 */
export interface PDFGenerationResult {
  /** Whether generation succeeded */
  success: boolean;
  /** S3 key where PDF was stored (on success) */
  s3Key?: string;
  /** Error message (on failure) */
  error?: string;
}

/**
 * Invoice with PDF-related details for queries
 * Extends Invoice with pdf_s3_key and sent_at for PDF operations
 */
export interface InvoiceWithPDFDetails extends Invoice {
  /** Customer contact info for email */
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
  };
  /** Line items for PDF rendering */
  lineItems?: InvoiceLineItem[];
}
