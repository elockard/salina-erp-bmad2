import { z } from "zod";

/**
 * Publication status enum for Zod validation
 * Matches database enum: draft, pending, published, out_of_print
 */
export const publicationStatusSchema = z.enum([
  "draft",
  "pending",
  "published",
  "out_of_print",
]);

/**
 * ISBN-13 validation pattern
 * Accepts:
 * - 13 digits (9780123456789)
 * - With hyphens (978-0-12-345678-9)
 * - Empty string (for optional ISBN)
 */
const isbnPattern = /^(?:97[89][-\s]?(?:\d[-\s]?){9}\d|97[89]\d{10})?$/;

/**
 * ISBN field schema - validates ISBN-13 format
 * Nullable in database, so accepts null, empty string, or valid ISBN-13
 */
export const isbnSchema = z
  .string()
  .regex(isbnPattern, "Invalid ISBN-13 format")
  .or(z.literal(""))
  .nullable()
  .optional();

/**
 * Zod schema for creating a title
 * - title is required (non-empty string)
 * - author_id is required (valid UUID)
 * - publication_status defaults to 'draft' if not provided
 * - other fields are optional
 *
 * Story 7.6: Removed eisbn - ISBNs are unified without type distinction
 */
export const createTitleSchema = z.object({
  title: z.string().min(1, "Title is required").max(500, "Title is too long"),
  subtitle: z
    .string()
    .max(500, "Subtitle is too long")
    .optional()
    .or(z.literal("")),
  author_id: z.string().uuid("Invalid author ID"),
  genre: z.string().max(100, "Genre is too long").optional().or(z.literal("")),
  word_count: z
    .number()
    .int("Word count must be a whole number")
    .positive("Word count must be positive")
    .optional()
    .nullable(),
  publication_status: publicationStatusSchema.optional().default("draft"),
  isbn: isbnSchema,
  publication_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional()
    .or(z.literal(""))
    .nullable(),
});

/**
 * Zod schema for updating a title
 * All fields are optional for partial updates
 */
export const updateTitleSchema = createTitleSchema
  .partial()
  .omit({ author_id: true })
  .extend({
    author_id: z.string().uuid("Invalid author ID").optional(),
  });

/**
 * Schema for filtering titles list
 *
 * Story 7.6: Removed has_eisbn - ISBNs are unified without type distinction
 */
export const titleFilterSchema = z.object({
  search: z.string().optional(),
  author_id: z.string().uuid().optional(),
  publication_status: publicationStatusSchema.optional(),
  has_isbn: z.boolean().optional(),
});

/**
 * Form schema for create title form (without defaults for better form compatibility)
 */
export const createTitleFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(500, "Title is too long"),
  subtitle: z
    .string()
    .max(500, "Subtitle is too long")
    .optional()
    .or(z.literal("")),
  author_id: z.string().min(1, "Author is required"),
  genre: z.string().max(100, "Genre is too long").optional().or(z.literal("")),
  word_count: z.number().int().positive().optional().nullable(),
  publication_status: publicationStatusSchema,
});

/** Input type inferred from createTitleSchema */
export type CreateTitleInput = z.infer<typeof createTitleSchema>;

/** Input type inferred from updateTitleSchema */
export type UpdateTitleInput = z.infer<typeof updateTitleSchema>;

/** Input type inferred from titleFilterSchema */
export type TitleFilterInput = z.infer<typeof titleFilterSchema>;

/** Form input type for create title form */
export type CreateTitleFormInput = z.infer<typeof createTitleFormSchema>;
