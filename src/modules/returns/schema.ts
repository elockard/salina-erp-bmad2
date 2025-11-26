/**
 * Returns Validation Schemas
 *
 * Zod schemas for validating returns data in Server Actions.
 * Used by Story 3.5+ for return request entry and approval forms.
 *
 * Related Story: 3.4 - Create Returns Database Schema with Approval Workflow
 * Related FRs: FR30-FR37 (Returns Management)
 *
 * Approval Workflow:
 * - FR32: Return requests created with "pending" status
 * - FR35: Finance approves/rejects returns
 * - FR36: Only approved returns affect royalty calculations
 */

import { z } from "zod";
import { returnStatusValues } from "@/db/schema/returns";
import { salesFormatValues } from "@/db/schema/sales";

/**
 * Zod schema for return status enum validation
 * Valid values: pending, approved, rejected
 */
export const returnStatusSchema = z.enum(returnStatusValues, {
  error: "Invalid return status",
});

/**
 * Zod schema for return format enum validation
 * Valid values: physical, ebook, audiobook
 * Reuses salesFormatValues for consistency
 */
export const returnFormatSchema = z.enum(salesFormatValues, {
  error: "Invalid return format",
});

/**
 * Zod schema for UUID validation
 * Used for title_id, original_sale_id, etc.
 */
const uuidSchema = z.string().uuid();

/**
 * Zod schema for positive integer validation
 * Used for quantity field - must be > 0
 */
export const positiveIntegerSchema = z
  .number()
  .int("Quantity must be a whole number")
  .positive("Quantity must be greater than 0");

/**
 * Zod schema for positive decimal validation (currency)
 * Used for unit_price and total_amount - must be > 0
 * Note: Use Decimal.js for calculations, not JavaScript arithmetic
 */
export const positiveCurrencySchema = z
  .string()
  .refine(
    (val) => {
      const num = parseFloat(val);
      return !Number.isNaN(num) && num > 0;
    },
    { message: "Amount must be a positive number" },
  )
  .refine(
    (val) => {
      // Check for max 2 decimal places
      const parts = val.split(".");
      return parts.length === 1 || (parts[1]?.length ?? 0) <= 2;
    },
    { message: "Amount cannot have more than 2 decimal places" },
  );

/**
 * Zod schema for date string validation
 * Used for return_date field
 */
export const returnDateSchema = z.string().refine(
  (val) => {
    const date = new Date(val);
    return !Number.isNaN(date.getTime());
  },
  { message: "Invalid date format" },
);

/**
 * Zod schema for creating a new return request
 * Used in createReturn Server Action (Story 3.5)
 *
 * FR32: Returns created with "pending" status (default, not in form)
 */
export const createReturnSchema = z.object({
  title_id: uuidSchema.describe("Title being returned"),
  original_sale_id: uuidSchema
    .optional()
    .describe("Optional reference to original sale"),
  format: returnFormatSchema.describe("Format of the item returned"),
  quantity: positiveIntegerSchema.describe("Number of units returned"),
  unit_price: positiveCurrencySchema.describe("Price per unit"),
  total_amount: positiveCurrencySchema.describe("Total return amount"),
  return_date: returnDateSchema.describe("Date of the return"),
  reason: z.string().max(1000).optional().describe("Reason for return"),
});

/**
 * Zod schema for return filter/query parameters
 * Used in getReturns Server Action
 */
export const returnFilterSchema = z.object({
  title_id: uuidSchema.optional(),
  format: returnFormatSchema.optional(),
  status: returnStatusSchema.optional(),
  start_date: returnDateSchema.optional(),
  end_date: returnDateSchema.optional(),
});

/**
 * Zod schema for approving or rejecting a return
 * Used in approveReturn/rejectReturn Server Actions
 *
 * FR35: System tracks who approved/rejected returns and when
 */
export const approveReturnSchema = z.object({
  return_id: uuidSchema.describe("ID of the return to approve/reject"),
  action: z.enum(["approve", "reject"]).describe("Approval action"),
  reason: z
    .string()
    .max(500)
    .optional()
    .describe("Optional reason for rejection"),
});

/**
 * Zod schema for bulk return operations
 * Used for batch approval/rejection
 */
export const bulkReturnActionSchema = z.object({
  return_ids: z.array(uuidSchema).min(1, "At least one return ID required"),
  action: z.enum(["approve", "reject"]).describe("Bulk action"),
});

// Inferred types
export type CreateReturnInput = z.infer<typeof createReturnSchema>;
export type ReturnFilterInput = z.infer<typeof returnFilterSchema>;
export type ApproveReturnInput = z.infer<typeof approveReturnSchema>;
export type BulkReturnActionInput = z.infer<typeof bulkReturnActionSchema>;
