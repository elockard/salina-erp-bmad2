/**
 * Invoice Module Zod Schemas
 *
 * Validation schemas for invoice creation, updates, and payment recording.
 *
 * Story: 8.1 - Create Invoice Database Schema
 * Related FRs: FR96-FR106 (Invoicing & Accounts Receivable)
 */

import { z } from "zod";

// =============================================================================
// Address Schema
// =============================================================================

/**
 * Address schema for bill_to and ship_to validation
 * Matches Address interface from contacts module
 */
export const addressSchema = z.object({
  line1: z.string().min(1, "Address line 1 is required").optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;

// =============================================================================
// Invoice Schemas
// =============================================================================

/**
 * Invoice status enum
 */
export const invoiceStatusSchema = z.enum([
  "draft",
  "sent",
  "paid",
  "partially_paid",
  "overdue",
  "void",
]);

/**
 * Payment terms enum
 */
export const paymentTermsSchema = z.enum([
  "net_30",
  "net_60",
  "due_on_receipt",
  "custom",
]);

/**
 * Invoice line item schema for validation
 */
export const invoiceLineItemSchema = z.object({
  line_number: z.number().int().positive("Line number must be positive"),
  item_code: z.string().optional().nullable(),
  description: z.string().min(1, "Description is required"),
  quantity: z
    .string()
    .refine((val) => Number.parseFloat(val) > 0, "Quantity must be positive"),
  unit_price: z
    .string()
    .refine(
      (val) => Number.parseFloat(val) > 0,
      "Unit price must be positive",
    ),
  tax_rate: z
    .string()
    .refine(
      (val) => Number.parseFloat(val) >= 0,
      "Tax rate must be non-negative",
    )
    .optional()
    .nullable(),
  amount: z
    .string()
    .refine((val) => Number.parseFloat(val) > 0, "Amount must be positive"),
  title_id: z.string().uuid().optional().nullable(),
});

export type InvoiceLineItemInput = z.infer<typeof invoiceLineItemSchema>;

/**
 * Create invoice schema
 */
export const createInvoiceSchema = z
  .object({
    customer_id: z.string().uuid("Invalid customer ID"),
    invoice_date: z.coerce.date(),
    due_date: z.coerce.date(),
    status: invoiceStatusSchema.default("draft"),
    bill_to_address: addressSchema,
    ship_to_address: addressSchema.optional().nullable(),
    po_number: z.string().optional().nullable(),
    payment_terms: paymentTermsSchema.default("net_30"),
    custom_terms_days: z.number().int().positive().optional().nullable(),
    shipping_method: z.string().optional().nullable(),
    shipping_cost: z
      .string()
      .refine(
        (val) => Number.parseFloat(val) >= 0,
        "Shipping cost must be non-negative",
      )
      .default("0.00"),
    subtotal: z
      .string()
      .refine(
        (val) => Number.parseFloat(val) >= 0,
        "Subtotal must be non-negative",
      ),
    tax_rate: z
      .string()
      .refine(
        (val) => Number.parseFloat(val) >= 0,
        "Tax rate must be non-negative",
      )
      .default("0.0000"),
    tax_amount: z
      .string()
      .refine(
        (val) => Number.parseFloat(val) >= 0,
        "Tax amount must be non-negative",
      ),
    total: z
      .string()
      .refine(
        (val) => Number.parseFloat(val) >= 0,
        "Total must be non-negative",
      ),
    currency: z.string().default("USD"),
    notes: z.string().optional().nullable(),
    internal_notes: z.string().optional().nullable(),
    line_items: z.array(invoiceLineItemSchema).min(1, "At least one line item is required"),
  })
  .refine(
    (data) => {
      // Require custom_terms_days when payment_terms is 'custom'
      if (data.payment_terms === "custom") {
        return (
          data.custom_terms_days !== null &&
          data.custom_terms_days !== undefined &&
          data.custom_terms_days > 0
        );
      }
      return true;
    },
    {
      message: "Custom terms days is required when payment terms is 'custom'",
      path: ["custom_terms_days"],
    },
  )
  .refine(
    (data) => {
      // Due date must be on or after invoice date
      return data.due_date >= data.invoice_date;
    },
    {
      message: "Due date must be on or after invoice date",
      path: ["due_date"],
    },
  );

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

/**
 * Update invoice schema (partial)
 */
export const updateInvoiceSchema = z
  .object({
    status: invoiceStatusSchema.optional(),
    bill_to_address: addressSchema.optional(),
    ship_to_address: addressSchema.optional().nullable(),
    po_number: z.string().optional().nullable(),
    payment_terms: paymentTermsSchema.optional(),
    custom_terms_days: z.number().int().positive().optional().nullable(),
    shipping_method: z.string().optional().nullable(),
    shipping_cost: z
      .string()
      .refine(
        (val) => Number.parseFloat(val) >= 0,
        "Shipping cost must be non-negative",
      )
      .optional(),
    notes: z.string().optional().nullable(),
    internal_notes: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      // Require custom_terms_days when payment_terms is 'custom'
      if (data.payment_terms === "custom") {
        return (
          data.custom_terms_days !== null &&
          data.custom_terms_days !== undefined &&
          data.custom_terms_days > 0
        );
      }
      return true;
    },
    {
      message: "Custom terms days is required when payment terms is 'custom'",
      path: ["custom_terms_days"],
    },
  );

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

// =============================================================================
// Payment Schemas
// =============================================================================

/**
 * Payment method enum
 */
export const paymentMethodSchema = z.enum([
  "check",
  "wire",
  "credit_card",
  "ach",
  "other",
]);

/**
 * Record payment schema
 */
export const recordPaymentSchema = z.object({
  invoice_id: z.string().uuid("Invalid invoice ID"),
  payment_date: z.coerce.date(),
  amount: z
    .string()
    .refine((val) => Number.parseFloat(val) > 0, "Amount must be positive"),
  payment_method: paymentMethodSchema,
  reference_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
