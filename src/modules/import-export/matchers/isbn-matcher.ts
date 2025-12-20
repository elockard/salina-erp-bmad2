/**
 * ISBN Matcher for Bulk Updates
 *
 * Story: 19.4 - Bulk Update via CSV
 * Tasks: 2.2-2.8
 *
 * Provides ISBN-based matching of CSV rows to existing titles,
 * with diff computation for preview and selective updates.
 *
 * FRs: FR174
 */

import { eq } from "drizzle-orm";
import { titles } from "@/db/schema/titles";
import type { getDb } from "@/lib/auth";
import type {
  ExistingTitleData,
  FieldChange,
  ImportableTitleField,
  ImportRowError,
  MatchResult,
  TitleDiff,
  TitleMatch,
  ValidatedTitleRow,
} from "../types";

/** Database client type */
type DbClient = Awaited<ReturnType<typeof getDb>>;

// =============================================================================
// ISBN NORMALIZATION
// =============================================================================

/**
 * Normalize ISBN for matching
 * Removes hyphens, spaces, and converts to uppercase
 *
 * @param isbn - Raw ISBN string
 * @returns Normalized ISBN (digits and X only)
 *
 * @example
 * normalizeIsbn("978-0-7432-7356-5") // "9780743273565"
 * normalizeIsbn("978 0 7432 7356 5") // "9780743273565"
 * normalizeIsbn("  978-0-7432-7356-5  ") // "9780743273565"
 */
export function normalizeIsbn(isbn: string): string {
  return isbn.replace(/[-\s]/g, "").toUpperCase().trim();
}

// =============================================================================
// DIFF COMPUTATION
// =============================================================================

/**
 * Field mappings for diff computation
 * Maps CSV field keys to database field keys and display labels
 */
const DIFF_FIELD_MAPPINGS: Array<{
  csvField: keyof ValidatedTitleRow["data"];
  dbField: keyof ExistingTitleData;
  fieldKey: ImportableTitleField;
  label: string;
  isArray?: boolean;
}> = [
  { csvField: "title", dbField: "title", fieldKey: "title", label: "Title" },
  {
    csvField: "subtitle",
    dbField: "subtitle",
    fieldKey: "subtitle",
    label: "Subtitle",
  },
  { csvField: "genre", dbField: "genre", fieldKey: "genre", label: "Genre" },
  {
    csvField: "publication_date",
    dbField: "publication_date",
    fieldKey: "publication_date",
    label: "Publication Date",
  },
  {
    csvField: "publication_status",
    dbField: "publication_status",
    fieldKey: "publication_status",
    label: "Status",
  },
  {
    csvField: "word_count",
    dbField: "word_count",
    fieldKey: "word_count",
    label: "Word Count",
  },
  { csvField: "asin", dbField: "asin", fieldKey: "asin", label: "ASIN" },
  {
    csvField: "bisac_code",
    dbField: "bisac_code",
    fieldKey: "bisac_code",
    label: "BISAC Code",
  },
  {
    csvField: "bisac_codes",
    dbField: "bisac_codes",
    fieldKey: "bisac_codes",
    label: "Secondary BISAC",
    isArray: true,
  },
];

/**
 * Compute diff between existing title and CSV row
 * Only includes fields that are present in the CSV data
 *
 * Task 2.4: Implement computeTitleDiff()
 *
 * @param existingTitle - Current title data from database
 * @param csvRow - Validated CSV row data
 * @returns TitleDiff with changed and unchanged fields
 */
export function computeTitleDiff(
  existingTitle: ExistingTitleData,
  csvRow: ValidatedTitleRow,
): TitleDiff {
  const changedFields: FieldChange[] = [];
  const unchangedFields: string[] = [];

  for (const {
    csvField,
    dbField,
    fieldKey,
    label,
    isArray,
  } of DIFF_FIELD_MAPPINGS) {
    const newValue = csvRow.data[csvField];
    const oldValue = existingTitle[dbField];

    // Skip if field not in CSV (undefined means not mapped)
    if (newValue === undefined) continue;

    // Normalize values for comparison
    // Treat null, undefined, and empty string as equivalent
    const oldStr = normalizeValue(oldValue, isArray);
    const newStr = normalizeValue(newValue, isArray);

    if (oldStr !== newStr) {
      changedFields.push({
        field: label,
        fieldKey,
        // For FieldChange, we need string | number | null, so convert arrays to string
        oldValue: isArray
          ? oldValue
            ? String(oldValue)
            : null
          : ((oldValue as string | number | null) ?? null),
        newValue: isArray
          ? newValue
            ? String(newValue)
            : null
          : ((newValue as string | number | null) ?? null),
      });
    } else {
      unchangedFields.push(label);
    }
  }

  return {
    changedFields,
    unchangedFields,
    totalFields: changedFields.length + unchangedFields.length,
  };
}

/**
 * Normalize a value for comparison
 * Converts to string and treats empty/null/undefined as equivalent
 */
function normalizeValue(value: unknown, isArray?: boolean): string {
  if (value === null || value === undefined) return "";
  if (isArray && Array.isArray(value)) {
    // Sort array for consistent comparison
    return [...value].sort().join(",");
  }
  const str = String(value).trim();
  return str;
}

// =============================================================================
// ISBN MATCHING
// =============================================================================

/**
 * Match CSV rows to existing titles by ISBN
 *
 * Tasks 2.3, 2.5, 2.6, 2.7, 2.8
 *
 * @param db - Database client
 * @param tenantId - Current tenant ID for filtering
 * @param rows - Validated CSV rows
 * @returns MatchResult with matched, unmatched, and errors
 */
export async function matchTitlesByIsbn(
  db: DbClient,
  tenantId: string,
  rows: ValidatedTitleRow[],
): Promise<MatchResult> {
  const matched: TitleMatch[] = [];
  const unmatched: string[] = [];
  const noIsbn: number[] = [];
  const errors: ImportRowError[] = [];

  // Task 2.7: Track rows without ISBN
  const rowsWithIsbn: Array<{
    row: ValidatedTitleRow;
    normalizedIsbn: string;
  }> = [];

  for (const row of rows) {
    if (!row.data.isbn) {
      noIsbn.push(row.row);
      continue;
    }
    rowsWithIsbn.push({
      row,
      normalizedIsbn: normalizeIsbn(row.data.isbn),
    });
  }

  // Early return if no ISBNs to match
  if (rowsWithIsbn.length === 0) {
    return { matched, unmatched, noIsbn, errors };
  }

  // Look up existing titles by ISBN
  // Note: We need to match against normalized ISBNs in the database too
  // Since ISBNs may be stored with hyphens, we compare normalized versions
  const existingTitles = await db
    .select({
      id: titles.id,
      title: titles.title,
      subtitle: titles.subtitle,
      isbn: titles.isbn,
      genre: titles.genre,
      publication_date: titles.publication_date,
      publication_status: titles.publication_status,
      word_count: titles.word_count,
      asin: titles.asin,
      bisac_code: titles.bisac_code,
      bisac_codes: titles.bisac_codes,
    })
    .from(titles)
    .where(eq(titles.tenant_id, tenantId));

  // Build normalized ISBN -> title map
  const titleMap = new Map<string, ExistingTitleData>();
  for (const title of existingTitles) {
    if (title.isbn) {
      const normalizedDbIsbn = normalizeIsbn(title.isbn);
      titleMap.set(normalizedDbIsbn, {
        id: title.id,
        title: title.title,
        subtitle: title.subtitle,
        isbn: title.isbn,
        genre: title.genre,
        publication_date: title.publication_date,
        publication_status: title.publication_status,
        word_count: title.word_count,
        asin: title.asin,
        bisac_code: title.bisac_code,
        bisac_codes: title.bisac_codes,
      });
    }
  }

  // Match rows to titles
  for (const { row, normalizedIsbn } of rowsWithIsbn) {
    const existingTitle = titleMap.get(normalizedIsbn);

    // row.data.isbn is guaranteed to exist at this point (filtered above)
    const isbn = row.data.isbn ?? "";
    if (existingTitle) {
      const diff = computeTitleDiff(existingTitle, row);
      matched.push({
        isbn,
        titleId: existingTitle.id,
        existingTitle,
        csvRow: row,
        diff,
        hasChanges: diff.changedFields.length > 0,
        rowNumber: row.row,
        selected: diff.changedFields.length > 0, // Pre-select rows with changes
      });
    } else {
      unmatched.push(isbn);
    }
  }

  return { matched, unmatched, noIsbn, errors };
}

/**
 * Compute bulk diff for matched titles
 *
 * Task 2.5: Batch diff computation
 *
 * @param matches - Array of title matches
 * @returns Summary statistics
 */
export function computeBulkDiffSummary(matches: TitleMatch[]): {
  totalMatched: number;
  withChanges: number;
  withoutChanges: number;
  totalFieldsChanged: number;
  fieldChangeCounts: Record<string, number>;
} {
  let withChanges = 0;
  let withoutChanges = 0;
  let totalFieldsChanged = 0;
  const fieldChangeCounts: Record<string, number> = {};

  for (const match of matches) {
    if (match.hasChanges) {
      withChanges++;
      totalFieldsChanged += match.diff.changedFields.length;

      for (const change of match.diff.changedFields) {
        fieldChangeCounts[change.field] =
          (fieldChangeCounts[change.field] || 0) + 1;
      }
    } else {
      withoutChanges++;
    }
  }

  return {
    totalMatched: matches.length,
    withChanges,
    withoutChanges,
    totalFieldsChanged,
    fieldChangeCounts,
  };
}

/**
 * Filter matches to only those selected for update
 *
 * @param matches - All matched titles
 * @returns Only matches with hasChanges AND selected
 */
export function getSelectedUpdates(matches: TitleMatch[]): TitleMatch[] {
  return matches.filter((m) => m.hasChanges && m.selected);
}

/**
 * Check if a field change involves the title field (significant change)
 *
 * @param diff - Title diff to check
 * @returns Whether the title field is being changed
 */
export function hasTitleFieldChange(diff: TitleDiff): boolean {
  return diff.changedFields.some((c) => c.fieldKey === "title");
}
