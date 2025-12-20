/**
 * Import/Export Module Validation Schemas
 *
 * Story: 19.1 - Import Catalog via CSV
 * Task 2: Import validation schema
 *
 * FRs: FR170, FR171
 *
 * Patterns from:
 * - src/modules/titles/schema.ts (title validation)
 * - src/modules/isbn/utils.ts (ISBN-13 checksum)
 */

import { z } from "zod";

import { normalizeIsbn13, validateIsbn13 } from "@/modules/isbn/utils";
import { isValidAsin } from "@/modules/titles/schema";
import { isValidBisacCode, MAX_BISAC_CODES } from "./bisac";

import {
  type ColumnMapping,
  type CsvParseResult,
  HEADER_AUTO_MAP,
  type ImportableTitleField,
  type ImportRowError,
  type ImportValidationResult,
  type ValidatedTitleRow,
} from "./types";

// =============================================================================
// PUBLICATION STATUS
// =============================================================================

export const VALID_PUBLICATION_STATUSES = [
  "draft",
  "pending",
  "published",
  "out_of_print",
] as const;

export type PublicationStatus = (typeof VALID_PUBLICATION_STATUSES)[number];

// =============================================================================
// FIELD VALIDATION SCHEMAS
// =============================================================================

/**
 * Title field validation (required, max 500 chars)
 */
export const titleFieldSchema = z
  .string()
  .min(1, "Title is required")
  .max(500, "Title too long (max 500 characters)");

/**
 * Subtitle field validation (optional, max 500 chars)
 */
export const subtitleFieldSchema = z
  .string()
  .max(500, "Subtitle too long (max 500 characters)")
  .optional()
  .transform((v) => (v?.trim() ? v.trim() : undefined));

/**
 * ISBN-13 field validation with checksum
 */
export const isbnFieldSchema = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? v.trim() : undefined))
  .refine(
    (v) => {
      if (!v) return true; // Optional field
      const result = validateIsbn13(v);
      return result.valid;
    },
    { message: "Invalid ISBN-13 format or checksum" },
  )
  .transform((v) => (v ? normalizeIsbn13(v) : undefined));

/**
 * ASIN field validation (10 chars, alphanumeric)
 */
export const asinFieldSchema = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? v.trim().toUpperCase() : undefined))
  .refine(
    (v) => {
      if (!v) return true; // Optional field
      return isValidAsin(v);
    },
    { message: "ASIN must be 10 alphanumeric characters" },
  );

/**
 * Genre field validation
 */
export const genreFieldSchema = z
  .string()
  .max(100, "Genre too long (max 100 characters)")
  .optional()
  .transform((v) => (v?.trim() ? v.trim() : undefined));

/**
 * Publication date validation (YYYY-MM-DD format)
 */
export const publicationDateFieldSchema = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? v.trim() : undefined))
  .refine(
    (v) => {
      if (!v) return true; // Optional field
      // Validate YYYY-MM-DD format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
      // Validate it's a real date
      const date = new Date(v);
      return !Number.isNaN(date.getTime());
    },
    { message: "Date must be in YYYY-MM-DD format" },
  );

/**
 * Publication status validation
 */
export const publicationStatusFieldSchema = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? v.trim().toLowerCase() : undefined))
  .refine(
    (v) => {
      if (!v) return true; // Optional field, defaults to 'draft'
      return VALID_PUBLICATION_STATUSES.includes(v as PublicationStatus);
    },
    {
      message: `Invalid status. Must be: ${VALID_PUBLICATION_STATUSES.join(", ")}`,
    },
  ) as z.ZodType<PublicationStatus | undefined>;

/**
 * Word count validation (positive integer)
 */
export const wordCountFieldSchema = z
  .string()
  .optional()
  .transform((v) => {
    if (!v?.trim()) return undefined;
    const num = parseInt(v.trim(), 10);
    return Number.isNaN(num) ? v.trim() : num; // Return original if not a number for error message
  })
  .refine(
    (v) => {
      if (v === undefined) return true;
      if (typeof v === "string") return false; // Failed to parse
      return v > 0;
    },
    { message: "Word count must be a positive number" },
  )
  .transform((v) => (typeof v === "number" ? v : undefined));

/**
 * Author name field (for lookup, not direct insert)
 */
export const authorNameFieldSchema = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? v.trim() : undefined));

/**
 * BISAC code validation (9-character format: 3-letter prefix + 6-digit number)
 * Story 19.5: BISAC Code Suggestions
 */
export const bisacCodeFieldSchema = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? v.trim().toUpperCase() : undefined))
  .refine(
    (v) => {
      if (!v) return true; // Optional field
      return isValidBisacCode(v);
    },
    {
      message:
        "BISAC code must be 3 uppercase letters followed by 6 digits (e.g., FIC000000)",
    },
  );

/**
 * BISAC codes array validation (comma or semicolon separated, max 2 codes)
 * Story 19.5: BISAC Code Suggestions
 */
export const bisacCodesFieldSchema = z
  .string()
  .optional()
  .transform((v) => {
    if (!v?.trim()) return undefined;
    // Split by comma or semicolon
    const codes = v
      .split(/[,;]/)
      .map((c) => c.trim().toUpperCase())
      .filter((c) => c.length > 0);
    return codes.length > 0 ? codes : undefined;
  })
  .refine(
    (v) => {
      if (!v) return true;
      // Validate each code
      return v.every((code) => isValidBisacCode(code));
    },
    {
      message:
        "Invalid BISAC code format. Each must be 3 uppercase letters followed by 6 digits",
    },
  )
  .refine(
    (v) => {
      if (!v) return true;
      // Max 2 secondary codes (3 total including primary)
      return v.length <= MAX_BISAC_CODES - 1;
    },
    { message: `Maximum ${MAX_BISAC_CODES - 1} secondary BISAC codes allowed` },
  );

// =============================================================================
// ROW VALIDATION
// =============================================================================

/**
 * Schema for validating a single CSV row of title data
 */
export const csvTitleRowSchema = z.object({
  title: titleFieldSchema,
  subtitle: subtitleFieldSchema,
  author_name: authorNameFieldSchema,
  isbn: isbnFieldSchema,
  genre: genreFieldSchema,
  publication_date: publicationDateFieldSchema,
  publication_status: publicationStatusFieldSchema,
  word_count: wordCountFieldSchema,
  asin: asinFieldSchema,
  bisac_code: bisacCodeFieldSchema,
  bisac_codes: bisacCodesFieldSchema,
});

export type CsvTitleRowInput = z.input<typeof csvTitleRowSchema>;
export type CsvTitleRowOutput = z.output<typeof csvTitleRowSchema>;

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Extract a row value based on column mapping
 */
function getRowValue(
  row: string[],
  mappings: ColumnMapping[],
  field: ImportableTitleField,
): string | undefined {
  const mapping = mappings.find((m) => m.targetField === field);
  if (!mapping) return undefined;

  const value = row[mapping.csvColumnIndex];
  return value?.trim() || undefined;
}

/**
 * Validate a single CSV row against the schema
 */
export function validateCsvRow(
  row: string[],
  rowNumber: number,
  mappings: ColumnMapping[],
): ValidatedTitleRow {
  const errors: ImportRowError[] = [];
  const warnings: string[] = [];

  // Build input object from mappings
  const input: Record<string, string | undefined> = {};
  for (const field of [
    "title",
    "subtitle",
    "author_name",
    "isbn",
    "genre",
    "publication_date",
    "publication_status",
    "word_count",
    "asin",
    "bisac_code",
    "bisac_codes",
  ] as ImportableTitleField[]) {
    input[field] = getRowValue(row, mappings, field);
  }

  // Validate with Zod
  const result = csvTitleRowSchema.safeParse(input);

  if (!result.success) {
    // Convert Zod errors to ImportRowError format
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string;
      errors.push({
        row: rowNumber,
        field,
        value: input[field] || "",
        message: issue.message,
      });
    }

    return {
      row: rowNumber,
      data: { title: input.title || "" },
      authorName: input.author_name,
      valid: false,
      errors,
      warnings,
    };
  }

  // Build validated data
  const data = result.data;

  return {
    row: rowNumber,
    data: {
      title: data.title,
      subtitle: data.subtitle,
      isbn: data.isbn,
      genre: data.genre,
      publication_date: data.publication_date,
      publication_status: data.publication_status || "draft",
      word_count: data.word_count,
      asin: data.asin,
      bisac_code: data.bisac_code,
      bisac_codes: data.bisac_codes,
    },
    authorName: data.author_name,
    valid: true,
    errors: [],
    warnings,
  };
}

/**
 * Check for duplicate ISBNs within the import data
 */
function findDuplicateIsbns(rows: ValidatedTitleRow[]): string[] {
  const isbnCounts = new Map<string, number>();

  for (const row of rows) {
    if (row.data.isbn) {
      const count = isbnCounts.get(row.data.isbn) || 0;
      isbnCounts.set(row.data.isbn, count + 1);
    }
  }

  return Array.from(isbnCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([isbn]) => isbn);
}

/**
 * Check for duplicate ASINs within the import data
 */
function findDuplicateAsins(rows: ValidatedTitleRow[]): string[] {
  const asinCounts = new Map<string, number>();

  for (const row of rows) {
    if (row.data.asin) {
      const count = asinCounts.get(row.data.asin) || 0;
      asinCounts.set(row.data.asin, count + 1);
    }
  }

  return Array.from(asinCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([asin]) => asin);
}

/**
 * Validate all CSV rows and return comprehensive validation result
 */
export function validateCsvData(
  parseResult: CsvParseResult,
  mappings: ColumnMapping[],
): ImportValidationResult {
  const validatedRows: ValidatedTitleRow[] = [];
  const allErrors: ImportRowError[] = [];

  // Check if title field is mapped (required)
  const titleMapping = mappings.find((m) => m.targetField === "title");
  if (!titleMapping) {
    return {
      allValid: false,
      totalRows: parseResult.rowCount,
      validCount: 0,
      invalidCount: parseResult.rowCount,
      rows: [],
      errors: [
        {
          row: 0,
          field: "title",
          value: "",
          message: "Title column must be mapped - it is a required field",
        },
      ],
      stats: {
        withAuthor: 0,
        withIsbn: 0,
        withAsin: 0,
        withBisac: 0,
        duplicateIsbns: [],
        duplicateAsins: [],
        unmatchedAuthors: [],
      },
    };
  }

  // Validate each row
  for (let i = 0; i < parseResult.rows.length; i++) {
    const row = parseResult.rows[i];
    const rowNumber = i + 1; // 1-indexed for user display

    const validatedRow = validateCsvRow(row, rowNumber, mappings);
    validatedRows.push(validatedRow);

    if (!validatedRow.valid) {
      allErrors.push(...validatedRow.errors);
    }
  }

  // Find duplicates
  const duplicateIsbns = findDuplicateIsbns(validatedRows);
  const duplicateAsins = findDuplicateAsins(validatedRows);

  // Add duplicate errors
  for (const isbn of duplicateIsbns) {
    const affectedRows = validatedRows.filter((r) => r.data.isbn === isbn);
    for (const row of affectedRows) {
      const error: ImportRowError = {
        row: row.row,
        field: "isbn",
        value: isbn,
        message: `Duplicate ISBN in import file: ${isbn}`,
      };
      row.errors.push(error);
      row.valid = false;
      allErrors.push(error);
    }
  }

  for (const asin of duplicateAsins) {
    const affectedRows = validatedRows.filter((r) => r.data.asin === asin);
    for (const row of affectedRows) {
      const error: ImportRowError = {
        row: row.row,
        field: "asin",
        value: asin,
        message: `Duplicate ASIN in import file: ${asin}`,
      };
      row.errors.push(error);
      row.valid = false;
      allErrors.push(error);
    }
  }

  // Calculate stats
  const validCount = validatedRows.filter((r) => r.valid).length;
  const stats = {
    withAuthor: validatedRows.filter((r) => r.authorName).length,
    withIsbn: validatedRows.filter((r) => r.data.isbn).length,
    withAsin: validatedRows.filter((r) => r.data.asin).length,
    withBisac: validatedRows.filter((r) => r.data.bisac_code).length,
    duplicateIsbns,
    duplicateAsins,
    unmatchedAuthors: [], // Will be populated by server action after DB lookup
  };

  return {
    allValid: allErrors.length === 0,
    totalRows: parseResult.rowCount,
    validCount,
    invalidCount: parseResult.rowCount - validCount,
    rows: validatedRows,
    errors: allErrors,
    stats,
  };
}

// =============================================================================
// AUTO-MAPPING HELPERS
// =============================================================================

/**
 * Auto-generate column mappings based on header names
 */
export function autoMapColumns(
  headers: string[],
  rows: string[][],
): ColumnMapping[] {
  return headers.map((header, index) => {
    const normalizedHeader = header.toLowerCase().trim();
    const targetField = HEADER_AUTO_MAP[normalizedHeader] || null;

    // Get sample values for preview
    const sampleValues = rows
      .slice(0, 5)
      .map((row) => row[index]?.trim() || "")
      .filter((v) => v !== "");

    return {
      csvColumnIndex: index,
      csvColumnHeader: header,
      targetField,
      sampleValues,
    };
  });
}
