/**
 * Sales Validation Schemas
 *
 * Zod schemas for validating sales data in Server Actions.
 * Used by Story 3.2+ for sales transaction entry forms.
 *
 * Related Story: 3.1 - Create Sales Transaction Database Schema
 * Related FRs: FR24-FR29 (Sales Transaction Management)
 *
 * APPEND-ONLY: Sales are immutable - only insert operations supported
 */

import { z } from "zod";
import { salesChannelValues, salesFormatValues } from "@/db/schema/sales";

/**
 * Zod schema for sales channel enum validation
 * Valid values: retail, wholesale, direct, distributor
 */
export const salesChannelSchema = z.enum(salesChannelValues, {
  error: "Invalid sales channel",
});

/**
 * Zod schema for sales format enum validation
 * Valid values: physical, ebook, audiobook
 */
export const salesFormatSchema = z.enum(salesFormatValues, {
  error: "Invalid sales format",
});

/**
 * Zod schema for UUID validation
 * Used for title_id and created_by_user_id
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
    { message: "Amount must be a positive number" }
  )
  .refine(
    (val) => {
      // Check for max 2 decimal places
      const parts = val.split(".");
      return parts.length === 1 || (parts[1]?.length ?? 0) <= 2;
    },
    { message: "Amount cannot have more than 2 decimal places" }
  );

/**
 * Zod schema for date string validation
 * Used for sale_date field
 */
export const saleDateSchema = z.string().refine(
  (val) => {
    const date = new Date(val);
    return !Number.isNaN(date.getTime());
  },
  { message: "Invalid date format" }
);

/**
 * Zod schema for creating a new sale record
 * Used in recordSale Server Action (Story 3.2)
 *
 * APPEND-ONLY: This is the only mutation schema for sales
 * No update or delete schemas will be created (FR29)
 */
export const createSaleSchema = z.object({
  title_id: uuidSchema.describe("Title being sold"),
  format: salesFormatSchema.describe("Format of the item sold"),
  quantity: positiveIntegerSchema.describe("Number of units sold"),
  unit_price: positiveCurrencySchema.describe("Price per unit"),
  total_amount: positiveCurrencySchema.describe("Total sale amount"),
  sale_date: saleDateSchema.describe("Date of the sale"),
  channel: salesChannelSchema.describe("Sales channel"),
});

/**
 * Zod schema for sales filter/query parameters
 * Used in getSales Server Action (Story 3.3)
 */
export const salesFilterSchema = z.object({
  title_id: uuidSchema.optional(),
  format: salesFormatSchema.optional(),
  channel: salesChannelSchema.optional(),
  start_date: saleDateSchema.optional(),
  end_date: saleDateSchema.optional(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type SalesFilterInput = z.infer<typeof salesFilterSchema>;
