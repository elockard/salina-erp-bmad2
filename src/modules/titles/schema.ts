import { z } from "zod";

// =============================================================================
// ACCESSIBILITY METADATA (Story 14.3 - Codelist 196)
// =============================================================================

/**
 * Valid EPUB accessibility conformance codes (Codelist 196 Type 09: 00-11)
 * Encodes both EPUB Accessibility version and WCAG conformance level
 */
export const VALID_CONFORMANCE = [
  "00", // No accessibility information
  "01", // LIA Compliance Scheme
  "02", // EPUB Accessibility 1.0 compliant
  "03", // EPUB Accessibility 1.0 + WCAG 2.0 Level A
  "04", // EPUB Accessibility 1.0 + WCAG 2.0 Level AA
  "05", // EPUB Accessibility 1.0 + WCAG 2.0 Level AAA
  "06", // EPUB Accessibility 1.1 + WCAG 2.1 Level A
  "07", // EPUB Accessibility 1.1 + WCAG 2.1 Level AA
  "08", // EPUB Accessibility 1.1 + WCAG 2.1 Level AAA
  "09", // EPUB Accessibility 1.1 + WCAG 2.2 Level A
  "10", // EPUB Accessibility 1.1 + WCAG 2.2 Level AA
  "11", // EPUB Accessibility 1.1 + WCAG 2.2 Level AAA
] as const;

/**
 * Valid accessibility feature codes (Codelist 196 Type 09: 10-26)
 */
export const VALID_FEATURES = [
  "10", // All textual content can be modified
  "11", // Language tagging provided
  "12", // No reading system accessibility options disabled
  "13", // Table of contents navigation
  "14", // Index navigation
  "15", // Reading order provided
  "16", // Short alternative descriptions
  "17", // Full alternative descriptions
  "18", // Visualized data also available as text
  "19", // ARIA roles provided
  "20", // Accessible math content (MathML)
  "21", // Accessible chemistry content (ChemML)
  "22", // Print-equivalent page numbering
  // Note: 23 is not used in Codelist 196
  "24", // Synchronised pre-recorded audio
  "25", // Text-to-speech hinting provided
  "26", // No hazards
] as const;

/**
 * Valid accessibility hazard codes (Codelist 196 Type 12: 00-07)
 */
export const VALID_HAZARDS = [
  "00", // Unknown
  "01", // No hazards
  "02", // Flashing hazard
  "03", // Motion simulation hazard
  "04", // Sound hazard
  "05", // No flashing hazard
  "06", // No motion simulation hazard
  "07", // No sound hazard
] as const;

/**
 * Hazard mutual exclusivity rules - certain hazard codes cannot coexist
 * Key: hazard code, Value: array of codes that conflict with it
 */
export const HAZARD_CONFLICTS: Record<string, string[]> = {
  "00": ["01", "02", "03", "04", "05", "06", "07"], // Unknown excludes all
  "01": ["02", "03", "04"], // No hazards excludes specific hazards
  "02": ["01", "05"], // Flashing excludes no-hazards and no-flashing
  "03": ["01", "06"], // Motion excludes no-hazards and no-motion
  "04": ["01", "07"], // Sound excludes no-hazards and no-sound
  "05": ["02"], // No flashing excludes flashing
  "06": ["03"], // No motion excludes motion
  "07": ["04"], // No sound excludes sound
};

/**
 * Validates hazard array for mutual exclusivity conflicts
 */
function validateHazardConflicts(hazards: string[]): boolean {
  for (const h of hazards) {
    const conflicts = HAZARD_CONFLICTS[h] || [];
    if (hazards.some((other) => other !== h && conflicts.includes(other))) {
      return false;
    }
  }
  return true;
}

/**
 * Accessibility metadata schema for title updates
 * Story 14.3 - AC1, AC2, AC3
 */
export const accessibilitySchema = z.object({
  epub_accessibility_conformance: z
    .enum(VALID_CONFORMANCE)
    .nullable()
    .optional(),
  accessibility_features: z
    .array(z.enum(VALID_FEATURES))
    .default([])
    .optional(),
  accessibility_hazards: z
    .array(z.enum(VALID_HAZARDS))
    .default([])
    .refine(validateHazardConflicts, {
      message: "Conflicting hazard selections - check mutual exclusivity rules",
    })
    .optional(),
  accessibility_summary: z.string().max(1000).nullable().optional(),
});

/** Type for accessibility input */
export type AccessibilityInput = z.infer<typeof accessibilitySchema>;

// =============================================================================
// PUBLICATION STATUS
// =============================================================================

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
