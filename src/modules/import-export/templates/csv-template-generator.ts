/**
 * CSV Template Generator
 *
 * Story: 19.2 - Download CSV Templates
 * Task 1: Create CSV template generator utility
 *
 * FR172: Publisher can download CSV templates for bulk data entry
 *
 * Generates downloadable CSV templates with:
 * - Correct column headers matching IMPORTABLE_TITLE_FIELDS
 * - Example row with valid sample data
 * - Validation rules as comment rows
 * - UTF-8 BOM for Excel compatibility
 */

import { format } from "date-fns";

import { IMPORTABLE_TITLE_FIELDS, TITLE_FIELD_METADATA } from "../types";

/**
 * Generate CSV template for title imports
 *
 * AC-1: Provides CSV file with correct column headers
 * AC-2: Headers match importable fields exactly
 * AC-3: Includes example row with valid sample data
 * AC-4: Includes data format notes (validation rules)
 *
 * @returns CSV template string with UTF-8 BOM prefix
 */
export function generateTitlesTemplate(): string {
  const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");

  // Header row from IMPORTABLE_TITLE_FIELDS - AC-2
  const headers = IMPORTABLE_TITLE_FIELDS.join(",");

  // Example row from TITLE_FIELD_METADATA examples - AC-3
  const examples = IMPORTABLE_TITLE_FIELDS.map((field) => {
    const meta = TITLE_FIELD_METADATA.find((m) => m.field === field);
    return meta?.example || "";
  });
  const exampleRow = examples.join(",");

  // Format notes from TITLE_FIELD_METADATA descriptions - AC-4
  const formatNotes = TITLE_FIELD_METADATA.map(
    (meta) =>
      `# ${meta.field}: ${meta.required ? "Required" : "Optional"}. ${meta.description}`,
  );

  const content = [
    `# Salina ERP Title Import Template`,
    `# Generated: ${timestamp}`,
    `# See validation rules at bottom of file`,
    `# Empty cells are allowed for optional fields. Do NOT use "N/A" or "null" - leave blank.`,
    ``,
    headers,
    exampleRow,
    ``,
    `# VALIDATION RULES:`,
    ...formatNotes,
  ].join("\n");

  // UTF-8 BOM for Excel compatibility
  return `\ufeff${content}`;
}
