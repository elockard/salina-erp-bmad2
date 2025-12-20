/**
 * BISAC Module
 *
 * Exports BISAC (Book Industry Standards and Communications) subject code
 * functionality for title categorization during import and ONIX export.
 *
 * Story 19.5: BISAC Code Suggestions (FR175)
 */

// Matcher functions
export {
  getAllBisacCodes,
  getBisacCategories,
  getBisacCode,
  getBisacCodesByCategory,
  searchBisacCodes,
  suggestBisacCodes,
} from "./bisac-matcher";
// Types
export type {
  BisacCategory,
  BisacCode,
  BisacSuggestion,
  BisacSuggestionInput,
} from "./bisac-types";
export {
  BISAC_CODE_REGEX,
  DEFAULT_SUGGESTION_COUNT,
  isValidBisacCode,
  MAX_BISAC_CODES,
} from "./bisac-types";
