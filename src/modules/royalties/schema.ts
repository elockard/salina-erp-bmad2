/**
 * Royalties Validation Schemas
 *
 * Zod schemas for validating contract data in Server Actions.
 * Used by Story 4.2 for contract creation forms.
 *
 * Related FRs: FR38-FR40 (Royalty Contract Management)
 *
 * Validation Rules:
 * - Tiers must be sequential and non-overlapping
 * - Rates must be between 0 and 1 (0-100%)
 * - min_quantity must be >= 0
 * - max_quantity must be > min_quantity (when not null)
 */

import { z } from "zod";
import {
  contractFormatValues,
  contractStatusValues,
  tierCalculationModeValues,
} from "@/db/schema/contracts";

/**
 * Zod schema for contract status enum validation
 * Valid values: active, suspended, terminated
 */
export const contractStatusSchema = z.enum(contractStatusValues, {
  message: "Invalid contract status",
});

/**
 * Zod schema for contract format enum validation
 * Valid values: physical, ebook, audiobook
 */
export const contractFormatSchema = z.enum(contractFormatValues, {
  message: "Invalid contract format",
});

/**
 * Zod schema for tier calculation mode validation
 * Valid values: period, lifetime
 * Story 10.4: Escalating Lifetime Royalty Rates
 */
export const tierCalculationModeSchema = z.enum(tierCalculationModeValues, {
  message: "Invalid tier calculation mode",
});

/**
 * Zod schema for UUID validation
 */
const uuidSchema = z.string().uuid("Invalid UUID format");

/**
 * Zod schema for currency string validation
 * Accepts positive numbers with up to 2 decimal places
 */
export const currencySchema = z
  .string()
  .refine(
    (val) => {
      if (val === "" || val === "0") return true;
      const num = parseFloat(val);
      return !Number.isNaN(num) && num >= 0;
    },
    { message: "Amount must be a non-negative number" },
  )
  .refine(
    (val) => {
      if (val === "" || val === "0") return true;
      const parts = val.split(".");
      return parts.length === 1 || (parts[1]?.length ?? 0) <= 2;
    },
    { message: "Amount cannot have more than 2 decimal places" },
  );

/**
 * Zod schema for royalty rate validation
 * Stored as decimal: 0.10 = 10%
 * Must be between 0 and 1 (0% to 100%)
 */
export const rateSchema = z
  .number()
  .min(0, "Rate must be at least 0%")
  .max(1, "Rate cannot exceed 100%");

/**
 * Zod schema for a single tier input
 */
export const tierInputSchema = z
  .object({
    format: contractFormatSchema,
    min_quantity: z
      .number()
      .int("Quantity must be a whole number")
      .min(0, "Minimum quantity cannot be negative"),
    max_quantity: z
      .number()
      .int("Quantity must be a whole number")
      .min(1, "Maximum quantity must be at least 1")
      .nullable(),
    rate: rateSchema,
  })
  .refine(
    (data) => {
      if (data.max_quantity === null) return true;
      return data.max_quantity > data.min_quantity;
    },
    {
      message: "Maximum quantity must be greater than minimum quantity",
      path: ["max_quantity"],
    },
  );

/**
 * Validates that tiers are sequential and non-overlapping for a given format
 */
function validateTiersForFormat(tiers: z.infer<typeof tierInputSchema>[]) {
  if (tiers.length === 0) return true;

  // Sort by min_quantity
  const sorted = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    // First tier must start at 0
    if (i === 0 && current.min_quantity !== 0) {
      return false;
    }

    // Check sequential: next tier min must be current max + 1
    if (next) {
      if (current.max_quantity === null) {
        // If current has no max (infinity), there can't be a next tier
        return false;
      }
      if (next.min_quantity !== current.max_quantity + 1) {
        return false;
      }
    }

    // Last tier should have null max_quantity (infinity)
    if (!next && current.max_quantity !== null) {
      // Last tier must have infinity
      return false;
    }
  }

  return true;
}

/**
 * Zod schema for creating a new contract
 * Used in createContract Server Action
 */
export const createContractSchema = z
  .object({
    author_id: uuidSchema.describe("Author for this contract"),
    title_id: uuidSchema.describe("Title covered by this contract"),
    status: contractStatusSchema.default("active"),
    advance_amount: currencySchema.default("0"),
    advance_paid: currencySchema.default("0"),
    tier_calculation_mode: tierCalculationModeSchema.default("period"),
    tiers: z.array(tierInputSchema).min(1, "At least one tier is required"),
  })
  .refine(
    (data) => {
      // Group tiers by format
      const tiersByFormat = new Map<
        string,
        z.infer<typeof tierInputSchema>[]
      >();
      for (const tier of data.tiers) {
        const existing = tiersByFormat.get(tier.format) || [];
        existing.push(tier);
        tiersByFormat.set(tier.format, existing);
      }

      // Validate each format's tiers
      for (const [_format, tiers] of tiersByFormat) {
        if (!validateTiersForFormat(tiers)) {
          return false;
        }
      }

      return true;
    },
    {
      message:
        "Tiers must be sequential and non-overlapping. First tier must start at 0, last tier must have no maximum (infinity).",
      path: ["tiers"],
    },
  );

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type TierInput = z.infer<typeof tierInputSchema>;
