import { z } from "zod";

/**
 * ISBN type enum for Zod validation
 * Matches database enum: physical, ebook
 */
export const isbnTypeSchema = z.enum(["physical", "ebook"]);

/**
 * ISBN status enum for Zod validation
 * Matches database enum: available, assigned, registered, retired
 */
export const isbnStatusSchema = z.enum([
  "available",
  "assigned",
  "registered",
  "retired",
]);

/**
 * ISBN-13 validation pattern
 * Accepts:
 * - 13 digits starting with 978 or 979 (e.g., 9780123456789)
 * - With hyphens (e.g., 978-0-12-345678-9)
 * - With spaces (e.g., 978 0 12 345678 9)
 */
const isbn13Pattern = /^97[89][-\s]?(?:\d[-\s]?){9}\d$/;

/**
 * ISBN-13 field schema - validates ISBN-13 format
 * Required field, must be valid 13-digit ISBN starting with 978 or 979
 */
export const isbn13Schema = z
  .string()
  .min(1, "ISBN-13 is required")
  .regex(
    isbn13Pattern,
    "Invalid ISBN-13 format. Must be 13 digits starting with 978 or 979",
  );

/**
 * Zod schema for creating/importing an ISBN
 * Used during CSV import and manual ISBN entry
 * - isbn_13 is required and must be valid ISBN-13 format
 * - type is required (physical or ebook)
 */
export const createIsbnSchema = z.object({
  isbn_13: isbn13Schema,
  type: isbnTypeSchema,
});

/**
 * Zod schema for batch import of ISBNs
 * Validates array of ISBN records
 */
export const batchImportIsbnSchema = z.object({
  isbns: z.array(createIsbnSchema).min(1, "At least one ISBN is required"),
});

/**
 * Zod schema for assigning an ISBN to a title
 * Used when linking ISBN to a title
 * - title_id is required (valid UUID)
 * - user_id is the assigning user (valid UUID)
 */
export const assignIsbnSchema = z.object({
  title_id: z.string().uuid("Invalid title ID"),
  user_id: z.string().uuid("Invalid user ID"),
});

/**
 * Zod schema for ISBN assignment input
 * Story 2.9 - Smart ISBN Assignment with Row Locking
 * Used by assignISBNToTitle Server Action
 * - titleId is the target title (valid UUID)
 * - format specifies physical or ebook ISBN pool
 */
export const assignISBNInputSchema = z.object({
  titleId: z.string().uuid("Invalid title ID"),
  format: isbnTypeSchema,
});

/** Input type inferred from assignISBNInputSchema */
export type AssignISBNInput = z.infer<typeof assignISBNInputSchema>;

/**
 * Zod schema for updating ISBN status
 * Used for status transitions (e.g., available -> assigned)
 */
export const updateIsbnStatusSchema = z.object({
  status: isbnStatusSchema,
});

/**
 * Zod schema for filtering ISBN pool list
 */
export const isbnFilterSchema = z.object({
  search: z.string().optional(),
  type: isbnTypeSchema.optional(),
  status: isbnStatusSchema.optional(),
  assigned_to_title_id: z.string().uuid().optional().nullable(),
});

/** Input type inferred from createIsbnSchema */
export type CreateIsbnInput = z.infer<typeof createIsbnSchema>;

/** Input type inferred from batchImportIsbnSchema */
export type BatchImportIsbnInput = z.infer<typeof batchImportIsbnSchema>;

/** Input type inferred from assignIsbnSchema */
export type AssignIsbnInput = z.infer<typeof assignIsbnSchema>;

/** Input type inferred from updateIsbnStatusSchema */
export type UpdateIsbnStatusInput = z.infer<typeof updateIsbnStatusSchema>;

/** Input type inferred from isbnFilterSchema */
export type IsbnFilterInput = z.infer<typeof isbnFilterSchema>;
