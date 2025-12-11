/**
 * Invoices Schema
 *
 * Database schema for invoice and accounts receivable management.
 * Invoices link to contacts with Customer role and track line items,
 * payments, and AR balances.
 *
 * Related FRs: FR96-FR106 (Invoicing & Accounts Receivable)
 * Epic: Epic 8 - Invoicing & Accounts Receivable
 * Story: 8.1 - Create Invoice Database Schema
 *
 * Multi-Tenant Isolation:
 * - Layer 1: Application queries include WHERE tenant_id filter
 * - Layer 2: ORM wrapper auto-injects tenant_id
 * - Layer 3: PostgreSQL RLS enforces tenant boundary
 *
 * @see src/db/schema/contacts.ts for customer FK reference
 * @see src/db/schema/statements.ts for similar schema pattern
 */

import { sql } from "drizzle-orm";
import {
  check,
  date,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { contacts } from "./contacts";
import { tenants } from "./tenants";
import { titles } from "./titles";
import { users } from "./users";

// =============================================================================
// Invoice Status Values
// =============================================================================

/**
 * Invoice status values
 * - draft: Invoice created but not sent to customer
 * - sent: Invoice delivered to customer
 * - paid: Invoice fully paid
 * - partially_paid: Partial payment received
 * - overdue: Past due date without full payment
 * - void: Invoice cancelled/voided
 */
export const invoiceStatusValues = [
  "draft",
  "sent",
  "paid",
  "partially_paid",
  "overdue",
  "void",
] as const;

export type InvoiceStatus = (typeof invoiceStatusValues)[number];

/**
 * Payment terms values
 * - net_30: Payment due 30 days from invoice date
 * - net_60: Payment due 60 days from invoice date
 * - due_on_receipt: Payment due immediately
 * - custom: Custom payment terms (use custom_terms_days field)
 */
export const paymentTermsValues = [
  "net_30",
  "net_60",
  "due_on_receipt",
  "custom",
] as const;

export type PaymentTerms = (typeof paymentTermsValues)[number];

/**
 * Payment method values
 * - check: Physical check payment
 * - wire: Wire transfer
 * - credit_card: Credit card payment
 * - ach: ACH bank transfer
 * - other: Other payment method
 */
export const paymentMethodValues = [
  "check",
  "wire",
  "credit_card",
  "ach",
  "other",
] as const;

export type PaymentMethod = (typeof paymentMethodValues)[number];

// =============================================================================
// Invoices Table
// =============================================================================

/**
 * Invoices table - Customer invoices for accounts receivable
 *
 * Primary use cases:
 * - Creating and managing customer invoices
 * - Tracking invoice payment status
 * - AR aging and balance reporting
 * - PDF generation and email delivery
 *
 * Business Rules:
 * - Invoice number is auto-generated: INV-YYYYMMDD-XXXX (unique per tenant)
 * - customer_id must reference contact with Customer role (validated at app layer)
 * - balance_due = total - amount_paid (updated on payment recording)
 * - bill_to_address and ship_to_address use Address JSONB structure
 *
 * AC-8.1.1: All 25 columns per spec
 * AC-8.1.4: Indexes on tenant_id, customer_id, status, due_date, invoice_date, invoice_number
 * AC-8.1.5: RLS policies for tenant isolation
 */
export const invoices = pgTable(
  "invoices",
  {
    /** Unique identifier for the invoice (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Foreign key to tenants table - enforces multi-tenant isolation */
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /**
     * Auto-generated invoice number (tenant-unique)
     * Pattern: INV-YYYYMMDD-XXXX
     */
    invoice_number: text("invoice_number").notNull(),

    /**
     * Foreign key to contacts table - the customer for this invoice
     * Must be contact with Customer role (validated at application level)
     * ON DELETE RESTRICT - cannot delete a customer with invoices
     */
    customer_id: uuid("customer_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "restrict" }),

    /** Date the invoice was created/issued */
    invoice_date: date("invoice_date", { mode: "date" }).notNull(),

    /** Date payment is due */
    due_date: date("due_date", { mode: "date" }).notNull(),

    /**
     * Invoice status
     * Valid values: draft, sent, paid, partially_paid, overdue, void
     */
    status: text("status").notNull().default("draft"),

    /**
     * Bill-to address stored as JSONB
     * Uses Address interface: {line1, line2, city, state, postal_code, country}
     */
    bill_to_address: jsonb("bill_to_address").notNull(),

    /**
     * Ship-to address stored as JSONB (optional)
     * Uses Address interface: {line1, line2, city, state, postal_code, country}
     */
    ship_to_address: jsonb("ship_to_address"),

    /** Customer's purchase order number (optional) */
    po_number: text("po_number"),

    /**
     * Payment terms
     * Valid values: net_30, net_60, due_on_receipt, custom
     */
    payment_terms: text("payment_terms").notNull().default("net_30"),

    /**
     * Custom payment terms in days
     * Required when payment_terms = 'custom'
     */
    custom_terms_days: integer("custom_terms_days"),

    /** Shipping method description (optional) */
    shipping_method: text("shipping_method"),

    /**
     * Shipping cost (DECIMAL(10,2))
     * Default: 0.00, CHECK >= 0
     */
    shipping_cost: decimal("shipping_cost", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),

    /**
     * Invoice subtotal before tax (DECIMAL(10,2))
     * Sum of all line item amounts
     */
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),

    /**
     * Tax rate as decimal (DECIMAL(5,4))
     * e.g., 0.0825 = 8.25%
     * Default: 0.0000
     */
    tax_rate: decimal("tax_rate", { precision: 5, scale: 4 })
      .notNull()
      .default("0.0000"),

    /**
     * Calculated tax amount (DECIMAL(10,2))
     * subtotal * tax_rate
     */
    tax_amount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull(),

    /**
     * Invoice total (DECIMAL(10,2))
     * subtotal + tax_amount + shipping_cost
     */
    total: decimal("total", { precision: 10, scale: 2 }).notNull(),

    /**
     * Total amount paid (DECIMAL(10,2))
     * Sum of all payments
     * Default: 0.00
     */
    amount_paid: decimal("amount_paid", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),

    /**
     * Balance due (DECIMAL(10,2))
     * Computed: total - amount_paid
     * Updated when payments are recorded
     */
    balance_due: decimal("balance_due", { precision: 10, scale: 2 }).notNull(),

    /**
     * Currency code for future multi-currency support
     * Default: USD
     */
    currency: text("currency").notNull().default("USD"),

    /** Customer-facing notes (visible on invoice) */
    notes: text("notes"),

    /** Internal notes (staff only, not visible on invoice) */
    internal_notes: text("internal_notes"),

    /** Record creation timestamp (UTC, auto-generated) */
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** Last update timestamp (UTC, auto-updated via trigger) */
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /**
     * Foreign key to users table - user who created this invoice
     * ON DELETE RESTRICT - cannot delete user who created invoices
     */
    created_by: uuid("created_by").references(() => users.id, {
      onDelete: "restrict",
    }),

    /** S3 key for generated PDF (set after first PDF generation) */
    pdf_s3_key: text("pdf_s3_key"),

    /** Timestamp when invoice was first emailed to customer */
    sent_at: timestamp("sent_at", { withTimezone: true }),
  },
  (table) => ({
    /** Index on tenant_id for RLS enforcement and tenant queries */
    tenantIdIdx: index("invoices_tenant_id_idx").on(table.tenant_id),

    /** Index on customer_id for customer invoice queries */
    customerIdIdx: index("invoices_customer_id_idx").on(table.customer_id),

    /** Index on status for status filtering */
    statusIdx: index("invoices_status_idx").on(table.status),

    /** Index on due_date for aging queries */
    dueDateIdx: index("invoices_due_date_idx").on(table.due_date),

    /** Index on invoice_date for date range queries */
    invoiceDateIdx: index("invoices_invoice_date_idx").on(table.invoice_date),

    /** Index on invoice_number for direct lookup */
    invoiceNumberIdx: index("invoices_invoice_number_idx").on(
      table.invoice_number,
    ),

    /** UNIQUE constraint on (tenant_id, invoice_number) */
    tenantInvoiceNumberUnique: unique(
      "invoices_tenant_invoice_number_unique",
    ).on(table.tenant_id, table.invoice_number),

    /** Composite index for aging reports (FR104) */
    tenantStatusDueDateIdx: index("invoices_tenant_status_due_date_idx").on(
      table.tenant_id,
      table.status,
      table.due_date,
    ),

    /** CHECK constraint: shipping_cost must be non-negative */
    shippingCostNonNegative: check(
      "invoices_shipping_cost_non_negative",
      sql`shipping_cost >= 0`,
    ),

    /** CHECK constraint: subtotal must be non-negative */
    subtotalNonNegative: check(
      "invoices_subtotal_non_negative",
      sql`subtotal >= 0`,
    ),

    /** CHECK constraint: tax_rate must be non-negative */
    taxRateNonNegative: check(
      "invoices_tax_rate_non_negative",
      sql`tax_rate >= 0`,
    ),

    /** CHECK constraint: tax_amount must be non-negative */
    taxAmountNonNegative: check(
      "invoices_tax_amount_non_negative",
      sql`tax_amount >= 0`,
    ),

    /** CHECK constraint: total must be non-negative */
    totalNonNegative: check("invoices_total_non_negative", sql`total >= 0`),

    /** CHECK constraint: amount_paid must be non-negative */
    amountPaidNonNegative: check(
      "invoices_amount_paid_non_negative",
      sql`amount_paid >= 0`,
    ),

    /** CHECK constraint: status must be valid */
    statusValid: check(
      "invoices_status_valid",
      sql`status IN ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'void')`,
    ),

    /** CHECK constraint: payment_terms must be valid */
    paymentTermsValid: check(
      "invoices_payment_terms_valid",
      sql`payment_terms IN ('net_30', 'net_60', 'due_on_receipt', 'custom')`,
    ),
  }),
);

/**
 * TypeScript type for invoices SELECT queries (read operations)
 * Inferred from table schema definition
 */
export type Invoice = typeof invoices.$inferSelect;

/**
 * TypeScript type for invoices INSERT operations (create operations)
 * Inferred from table schema, excludes auto-generated fields
 */
export type InsertInvoice = typeof invoices.$inferInsert;

// =============================================================================
// Invoice Line Items Table
// =============================================================================

/**
 * Invoice Line Items table - Individual items on an invoice
 *
 * Primary use cases:
 * - Storing individual products/services on invoice
 * - Tracking quantities and pricing
 * - Optional link to title catalog
 *
 * Business Rules:
 * - line_number starts at 1 and must be unique per invoice
 * - tax_rate is optional override; NULL uses invoice.tax_rate
 * - amount = quantity * unit_price (computed at insert/update)
 *
 * AC-8.1.2: All 10 columns per spec
 * AC-8.1.4: Indexes on invoice_id, title_id
 */
export const invoiceLineItems = pgTable(
  "invoice_line_items",
  {
    /** Unique identifier for the line item (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /**
     * Foreign key to invoices table
     * ON DELETE CASCADE - deleting invoice removes all line items
     */
    invoice_id: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),

    /**
     * Line number for ordering (starts at 1)
     * UNIQUE per invoice
     */
    line_number: integer("line_number").notNull(),

    /** Optional item code/SKU for catalog items */
    item_code: text("item_code"),

    /** Line item description (required) */
    description: text("description").notNull(),

    /**
     * Quantity (DECIMAL(10,3))
     * Supports fractional quantities
     * CHECK > 0
     */
    quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),

    /**
     * Unit price (DECIMAL(10,2))
     * CHECK > 0
     */
    unit_price: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),

    /**
     * Line-level tax rate override (DECIMAL(5,4))
     * If NULL, use invoice.tax_rate
     * e.g., 0.0825 = 8.25%
     */
    tax_rate: decimal("tax_rate", { precision: 5, scale: 4 }),

    /**
     * Line item amount (DECIMAL(10,2))
     * Calculated: quantity * unit_price
     * CHECK > 0
     */
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),

    /**
     * Foreign key to titles table (optional)
     * For invoicing title sales
     * ON DELETE RESTRICT - cannot delete title on invoice
     */
    title_id: uuid("title_id").references(() => titles.id, {
      onDelete: "restrict",
    }),
  },
  (table) => ({
    /** Index on invoice_id for efficient line item queries */
    invoiceIdIdx: index("invoice_line_items_invoice_id_idx").on(
      table.invoice_id,
    ),

    /** Index on title_id for title-based queries */
    titleIdIdx: index("invoice_line_items_title_id_idx").on(table.title_id),

    /** UNIQUE constraint on (invoice_id, line_number) */
    invoiceLineNumberUnique: unique(
      "invoice_line_items_invoice_line_number_unique",
    ).on(table.invoice_id, table.line_number),

    /** CHECK constraint: quantity must be positive */
    quantityPositive: check(
      "invoice_line_items_quantity_positive",
      sql`quantity > 0`,
    ),

    /** CHECK constraint: unit_price must be positive */
    unitPricePositive: check(
      "invoice_line_items_unit_price_positive",
      sql`unit_price > 0`,
    ),

    /** CHECK constraint: amount must be positive */
    amountPositive: check(
      "invoice_line_items_amount_positive",
      sql`amount > 0`,
    ),
  }),
);

/**
 * TypeScript type for invoice_line_items SELECT queries
 */
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;

/**
 * TypeScript type for invoice_line_items INSERT operations
 */
export type InsertInvoiceLineItem = typeof invoiceLineItems.$inferInsert;

// =============================================================================
// Payments Table
// =============================================================================

/**
 * Payments table - Payments received against invoices
 *
 * Primary use cases:
 * - Recording customer payments
 * - Tracking payment methods and references
 * - AR balance updates
 *
 * Business Rules:
 * - Payment amount must be positive
 * - Payments reduce invoice.balance_due and increase invoice.amount_paid
 * - Cannot delete payment if it would leave invoice in inconsistent state
 *
 * AC-8.1.3: All 10 columns per spec
 * AC-8.1.4: Indexes on tenant_id, invoice_id, payment_date
 * AC-8.1.5: RLS policies for tenant isolation
 */
export const payments = pgTable(
  "payments",
  {
    /** Unique identifier for the payment (auto-generated UUID) */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Foreign key to tenants table - enforces multi-tenant isolation */
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /**
     * Foreign key to invoices table
     * ON DELETE RESTRICT - cannot delete invoice with payments
     */
    invoice_id: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "restrict" }),

    /** Date the payment was received */
    payment_date: date("payment_date", { mode: "date" }).notNull(),

    /**
     * Payment amount (DECIMAL(10,2))
     * CHECK > 0
     */
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),

    /**
     * Payment method
     * Valid values: check, wire, credit_card, ach, other
     */
    payment_method: text("payment_method").notNull(),

    /**
     * Reference number (optional)
     * Check number, transaction ID, etc.
     */
    reference_number: text("reference_number"),

    /** Notes about the payment */
    notes: text("notes"),

    /** Record creation timestamp (UTC, auto-generated) */
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /**
     * Foreign key to users table - user who recorded this payment
     * ON DELETE RESTRICT - cannot delete user who recorded payments
     */
    created_by: uuid("created_by").references(() => users.id, {
      onDelete: "restrict",
    }),
  },
  (table) => ({
    /** Index on tenant_id for RLS enforcement and tenant queries */
    tenantIdIdx: index("payments_tenant_id_idx").on(table.tenant_id),

    /** Index on invoice_id for invoice payment queries */
    invoiceIdIdx: index("payments_invoice_id_idx").on(table.invoice_id),

    /** Index on payment_date for date range queries */
    paymentDateIdx: index("payments_payment_date_idx").on(table.payment_date),

    /** CHECK constraint: amount must be positive */
    amountPositive: check("payments_amount_positive", sql`amount > 0`),

    /** CHECK constraint: payment_method must be valid */
    paymentMethodValid: check(
      "payments_payment_method_valid",
      sql`payment_method IN ('check', 'wire', 'credit_card', 'ach', 'other')`,
    ),
  }),
);

/**
 * TypeScript type for payments SELECT queries
 */
export type Payment = typeof payments.$inferSelect;

/**
 * TypeScript type for payments INSERT operations
 */
export type InsertPayment = typeof payments.$inferInsert;
