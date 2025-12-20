/**
 * BISAC Types
 *
 * Type definitions for BISAC (Book Industry Standards and Communications)
 * subject code handling. Used for categorizing titles during import and
 * for ONIX export Subject elements.
 *
 * Story 19.5: BISAC Code Suggestions (FR175)
 */

/**
 * BISAC code entry in the reference data
 * Matches the structure in bisac-codes.json
 */
export interface BisacCode {
  /** BISAC code (e.g., "FIC000000") - 9 characters: 3-letter prefix + 6-digit number */
  code: string;
  /** Display description (e.g., "FICTION / General") */
  description: string;
  /** Parent code for hierarchy (e.g., "FIC000000" for Fiction subcategories) */
  parentCode: string | null;
  /** Keywords for matching during import */
  keywords: string[];
  /** Category prefix (e.g., "FIC", "NON", "JUV") */
  category: string;
  /** Depth in hierarchy (1=root category, 2=subcategory, 3=sub-subcategory) */
  depth: number;
}

/**
 * BISAC suggestion result from the matching algorithm
 */
export interface BisacSuggestion {
  /** The suggested BISAC code */
  code: string;
  /** Full description from BISAC data */
  description: string;
  /** Confidence score (0-100) - higher means better match */
  confidence: number;
  /** Keywords that matched from the title/subtitle/genre */
  matchedKeywords: string[];
  /** Type of match that contributed most to the score */
  matchType: "exact" | "partial" | "fuzzy";
}

/**
 * Input for BISAC suggestion
 */
export interface BisacSuggestionInput {
  /** Title of the work (required) */
  title: string;
  /** Subtitle of the work (optional) */
  subtitle?: string;
  /** Genre/category hint (optional - boosts matching) */
  genre?: string;
}

/**
 * BISAC category group for hierarchical display
 */
export interface BisacCategory {
  /** Category prefix (e.g., "FIC") */
  prefix: string;
  /** Category name (e.g., "FICTION") */
  name: string;
  /** Number of codes in this category */
  count: number;
}

/**
 * Regular expression for validating BISAC code format
 * Format: 3 uppercase letters followed by 6 digits
 * Examples: FIC000000, COM051360, YAF019030
 */
export const BISAC_CODE_REGEX = /^[A-Z]{3}\d{6}$/;

/**
 * Validate if a string is a valid BISAC code format
 */
export function isValidBisacCode(code: string): boolean {
  return BISAC_CODE_REGEX.test(code);
}

/**
 * Maximum number of BISAC codes per title (industry standard)
 */
export const MAX_BISAC_CODES = 3;

/**
 * Number of suggestions to return from the matcher
 */
export const DEFAULT_SUGGESTION_COUNT = 5;
