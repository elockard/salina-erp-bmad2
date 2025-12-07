/**
 * ISBN Prefixes Zod Schemas
 *
 * Validation schemas for ISBN prefix operations.
 * Story 7.4: Implement Publisher ISBN Prefix System
 */

import { z } from "zod";
import { isbnPrefixBlockSizes } from "@/db/schema/isbn-prefixes";

/**
 * Valid block size values
 */
const validBlockSizes = new Set(isbnPrefixBlockSizes);

/**
 * Schema for creating a new ISBN prefix
 * Validates prefix format, block size, and cross-field constraints
 * Story 7.6: Removed type field - ISBNs are unified without type distinction
 */
export const createIsbnPrefixSchema = z
  .object({
    prefix: z
      .string()
      .min(1, "Prefix is required")
      .refine(
        (val) => {
          const normalized = val.replace(/[-\s]/g, "");
          return normalized.length >= 7 && normalized.length <= 12;
        },
        { message: "Prefix must be 7-12 digits" },
      )
      .refine(
        (val) => {
          const normalized = val.replace(/[-\s]/g, "");
          return /^\d+$/.test(normalized);
        },
        { message: "Prefix must contain only digits and hyphens" },
      )
      .refine(
        (val) => {
          const normalized = val.replace(/[-\s]/g, "");
          return normalized.startsWith("978") || normalized.startsWith("979");
        },
        { message: "Prefix must start with 978 or 979" },
      ),
    block_size: z
      .number()
      .refine((val) => validBlockSizes.has(val as 10 | 100 | 1000 | 10000 | 100000 | 1000000), {
        message: "Block size must be 10, 100, 1K, 10K, 100K, or 1M",
      }),
    description: z.string().max(100).optional(),
  })
  .superRefine((data, ctx) => {
    // Cross-field validation: block size must not exceed prefix capacity
    const normalizedLength = data.prefix.replace(/[-\s]/g, "").length;
    const titleIdDigits = 12 - normalizedLength;
    const maxBlockSize = Math.pow(10, titleIdDigits);

    if (data.block_size > maxBlockSize) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Block size ${data.block_size.toLocaleString()} exceeds maximum ${maxBlockSize.toLocaleString()} for this prefix length`,
        path: ["block_size"],
      });
    }
  });

export type CreateIsbnPrefixInput = z.infer<typeof createIsbnPrefixSchema>;

/**
 * Schema for deleting an ISBN prefix
 */
export const deleteIsbnPrefixSchema = z.object({
  prefixId: z.string().uuid("Invalid prefix ID"),
});

export type DeleteIsbnPrefixInput = z.infer<typeof deleteIsbnPrefixSchema>;

/**
 * Schema for querying prefixes with filters
 * Story 7.6: Removed type filter - ISBNs are unified without type distinction
 */
export const queryIsbnPrefixesSchema = z.object({
  status: z
    .enum(["pending", "generating", "completed", "failed"])
    .optional(),
  search: z.string().optional(),
});

export type QueryIsbnPrefixesInput = z.infer<typeof queryIsbnPrefixesSchema>;
