/**
 * Title Authors Module Zod Schemas
 *
 * Validation schemas for the title-author junction table with ownership percentages.
 * Provides runtime validation with precise decimal handling using Decimal.js.
 *
 * Story: 10.1 - Add Multiple Authors Per Title with Ownership Percentages
 * Related FRs: FR111 (Multiple authors per title), FR118 (Co-author relationship history)
 *
 * AC-10.1.2: Ownership percentage validation
 * - Sum must equal exactly 100%
 * - Uses Decimal.js for precision (avoid floating-point errors)
 * - Each percentage must be between 1 and 100 (inclusive)
 */

import Decimal from "decimal.js";
import { z } from "zod";

// =============================================================================
// Individual Title Author Schema
// =============================================================================

/**
 * Schema for a single title author entry
 * Validates individual author ownership data
 */
export const titleAuthorSchema = z.object({
  /** Contact ID (UUID) of the author */
  contact_id: z.string().uuid("Invalid contact ID"),

  /**
   * Ownership percentage (1-100)
   * Stored as string to maintain decimal precision
   */
  ownership_percentage: z
    .string()
    .refine(
      (val) => {
        try {
          const num = new Decimal(val);
          return num.gte(1) && num.lte(100);
        } catch {
          return false;
        }
      },
      { message: "Ownership percentage must be between 1 and 100" },
    )
    .refine(
      (val) => {
        try {
          const num = new Decimal(val);
          // Ensure max 2 decimal places
          return num.decimalPlaces() <= 2;
        } catch {
          return false;
        }
      },
      { message: "Ownership percentage can have at most 2 decimal places" },
    ),

  /** Whether this is the primary author */
  is_primary: z.boolean(),
});

/**
 * Schema for title author input (for form submission)
 * Same as titleAuthorSchema - alias for clarity
 */
export const titleAuthorInputSchema = titleAuthorSchema;

// =============================================================================
// Title Authors Array Schema (with sum validation)
// =============================================================================

/**
 * Schema for array of title authors with sum-to-100 validation
 *
 * Validates:
 * 1. At least one author required
 * 2. Each author entry is valid
 * 3. Total ownership sums to exactly 100%
 * 4. Exactly one primary author
 * 5. No duplicate contact IDs
 */
export const titleAuthorsArraySchema = z
  .array(titleAuthorSchema)
  .min(1, "At least one author is required")
  .refine(
    (authors) => {
      // Check for duplicate contact IDs
      const contactIds = authors.map((a) => a.contact_id);
      return new Set(contactIds).size === contactIds.length;
    },
    { message: "Duplicate authors are not allowed" },
  )
  .refine(
    (authors) => {
      // At most one primary author (allows 0 during intermediate states)
      // If multiple authors exist, exactly one should be primary for final save
      const primaryCount = authors.filter((a) => a.is_primary).length;
      return primaryCount <= 1;
    },
    { message: "At most one author can be marked as primary" },
  )
  .refine(
    (authors) => {
      // If multiple authors, at least one should be primary
      // Single author doesn't require explicit primary (auto-treated as primary)
      if (authors.length > 1) {
        const primaryCount = authors.filter((a) => a.is_primary).length;
        return primaryCount >= 1;
      }
      return true;
    },
    {
      message:
        "One author must be marked as primary when there are multiple authors",
    },
  )
  .refine(
    (authors) => {
      // Sum must equal exactly 100 using Decimal.js for precision
      try {
        const total = authors.reduce(
          (sum, a) => sum.plus(new Decimal(a.ownership_percentage)),
          new Decimal(0),
        );
        return total.equals(100);
      } catch {
        return false;
      }
    },
    {
      message: "Ownership percentages must sum to exactly 100%",
    },
  );

/**
 * Schema for the complete title authors form
 * Includes title_id and authors array
 */
export const titleAuthorsFormSchema = z.object({
  /** Title ID (UUID) */
  title_id: z.string().uuid("Invalid title ID"),

  /** Array of authors with ownership percentages */
  authors: titleAuthorsArraySchema,
});

// =============================================================================
// Update Schemas
// =============================================================================

/**
 * Schema for updating a single title author
 * All fields optional except those needed for identification
 */
export const updateTitleAuthorSchema = z.object({
  ownership_percentage: z
    .string()
    .refine(
      (val) => {
        try {
          const num = new Decimal(val);
          return num.gte(1) && num.lte(100);
        } catch {
          return false;
        }
      },
      { message: "Ownership percentage must be between 1 and 100" },
    )
    .optional(),
  is_primary: z.boolean().optional(),
});

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validates that ownership percentages sum to exactly 100%
 * Uses Decimal.js for precise decimal arithmetic (AC-10.1.2)
 *
 * @param percentages - Array of ownership percentage strings
 * @returns Validation result with total and error if invalid
 */
export function validateOwnershipSum(percentages: string[]): {
  valid: boolean;
  total: string;
  error?: string;
} {
  try {
    const total = percentages.reduce(
      (sum, p) => sum.plus(new Decimal(p)),
      new Decimal(0),
    );

    if (total.equals(100)) {
      return { valid: true, total: total.toString() };
    }

    return {
      valid: false,
      total: total.toString(),
      error: `Ownership must sum to 100%, got ${total.toString()}%`,
    };
  } catch {
    return {
      valid: false,
      total: "0",
      error: "Invalid percentage values",
    };
  }
}

/**
 * Calculates equal split percentages for a given number of authors
 * Distributes remainder to last author to ensure sum is exactly 100%
 * (Dev Notes: Equal Split Rounding Strategy)
 *
 * @param count - Number of authors
 * @returns Array of percentage strings
 */
export function calculateEqualSplit(count: number): string[] {
  if (count <= 0) return [];
  if (count === 1) return ["100.00"];

  // Calculate base value with 2 decimal places
  const baseValue = new Decimal(100)
    .dividedBy(count)
    .toDecimalPlaces(2, Decimal.ROUND_DOWN);

  // Create array with base values
  const result: Decimal[] = new Array(count).fill(null).map(() => baseValue);

  // Calculate total and remainder
  const total = baseValue.times(count);
  const remainder = new Decimal(100).minus(total);

  // Add remainder to last author
  result[count - 1] = result[count - 1].plus(remainder);

  return result.map((d) => d.toFixed(2));
}

/**
 * Type for inferred title author input
 */
export type TitleAuthorInputType = z.infer<typeof titleAuthorSchema>;

/**
 * Type for inferred title authors form data
 */
export type TitleAuthorsFormType = z.infer<typeof titleAuthorsFormSchema>;
