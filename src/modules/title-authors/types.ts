/**
 * Title Authors Module Types
 *
 * TypeScript interfaces for the title-author junction table with ownership percentages.
 * Supports multiple authors per title for co-authored books with royalty splits.
 *
 * Story: 10.1 - Add Multiple Authors Per Title with Ownership Percentages
 * Related FRs: FR111 (Multiple authors per title), FR118 (Co-author relationship history)
 */

import type { Contact } from "@/db/schema/contacts";
import type { titleAuthors } from "@/db/schema/title-authors";

// =============================================================================
// Base Types (from Drizzle schema)
// =============================================================================

/** Title author record from database */
export type TitleAuthor = typeof titleAuthors.$inferSelect;

/** Title author insert data (excludes auto-generated fields) */
export type InsertTitleAuthor = typeof titleAuthors.$inferInsert;

// =============================================================================
// Extended Types (with related data)
// =============================================================================

/**
 * Title author with contact information
 * Used when displaying authors with their details in the UI
 */
export interface TitleAuthorWithContact extends TitleAuthor {
  contact: Contact;
}

/**
 * Title author input for form submission
 * Simplified structure for creating/updating title authors
 */
export interface TitleAuthorInput {
  contact_id: string;
  ownership_percentage: string;
  is_primary: boolean;
}

/**
 * Title authors form data
 * Complete data structure for the title authors editor form
 */
export interface TitleAuthorsFormData {
  title_id: string;
  authors: TitleAuthorInput[];
}

// =============================================================================
// Preset Types
// =============================================================================

/**
 * Ownership preset for quick selection
 * Provides common percentage splits for co-authored works
 */
export interface OwnershipPreset {
  /** Display label for the preset (e.g., "50/50", "Equal Split") */
  label: string;
  /** Fixed percentage values (null for dynamic calculation) */
  values: number[] | null;
  /** Calculate percentages dynamically based on author count */
  calculate?: (authorCount: number) => number[];
}

/**
 * Predefined ownership presets (AC-10.1.4)
 * Common splits for co-authored books
 */
export const OWNERSHIP_PRESETS: OwnershipPreset[] = [
  { label: "50/50", values: [50, 50] },
  { label: "60/40", values: [60, 40] },
  { label: "70/30", values: [70, 30] },
  { label: "33/33/34", values: [33, 33, 34] },
  {
    label: "Equal Split",
    values: null,
    calculate: (count: number): number[] => {
      // Equal split with remainder to last author (AC dev notes)
      // Example: 3 authors -> [33.33, 33.33, 33.34] = 100%
      if (count <= 0) return [];
      if (count === 1) return [100];

      const baseValue = Math.floor(10000 / count) / 100; // 2 decimal places
      const result = new Array(count).fill(baseValue);

      // Calculate total and adjust last author
      const total = baseValue * count;
      const remainder = 100 - total;
      result[count - 1] =
        Math.round((result[count - 1] + remainder) * 100) / 100;

      return result;
    },
  },
];

// =============================================================================
// Validation Result Types
// =============================================================================

/**
 * Validation result for ownership percentage sum
 */
export interface OwnershipValidationResult {
  /** Whether the validation passed */
  valid: boolean;
  /** Total percentage sum */
  total: string;
  /** Error message if validation failed */
  error?: string;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for TitleAuthorWithContact
 */
export function isTitleAuthorWithContact(
  obj: unknown,
): obj is TitleAuthorWithContact {
  if (!obj || typeof obj !== "object") return false;
  const ta = obj as TitleAuthorWithContact;
  return (
    typeof ta.id === "string" &&
    typeof ta.title_id === "string" &&
    typeof ta.contact_id === "string" &&
    typeof ta.ownership_percentage === "string" &&
    typeof ta.is_primary === "boolean" &&
    ta.contact !== undefined &&
    typeof ta.contact === "object"
  );
}

/**
 * Type guard for TitleAuthorInput
 */
export function isTitleAuthorInput(obj: unknown): obj is TitleAuthorInput {
  if (!obj || typeof obj !== "object") return false;
  const input = obj as TitleAuthorInput;
  return (
    typeof input.contact_id === "string" &&
    typeof input.ownership_percentage === "string" &&
    typeof input.is_primary === "boolean"
  );
}
