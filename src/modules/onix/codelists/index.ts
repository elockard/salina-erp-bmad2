/**
 * EDItEUR ONIX Codelists Module
 *
 * Story: 14.4 - Build Codelist Management System
 * Task 9: Create module exports
 *
 * Barrel export for codelist functionality.
 */

// Server Actions
export {
  checkCodelistsLoaded,
  checkCodelistUpdate,
  checkCodelistUpdates,
  getCodelists,
  getRequiredCodelistNumbers,
  loadAllCodelistsAction,
  loadCodelistAction,
  updateAllCodelistsAction,
  updateCodelistAction,
} from "./actions";
// Cache
export {
  codelistCache,
  getCodeDescription,
  getCodelistEntries,
  validateCodelistValue,
} from "./cache";
// Loader
export {
  BUNDLED_ISSUE_NUMBER,
  checkForUpdate,
  checkForUpdates,
  fetchCodelistFromSource,
  loadAllCodelists,
  loadCodelist,
  parseCodelistJSON,
  saveCodelist,
  updateAllCodelists,
  updateCodelist,
} from "./loader";
// Types
export type {
  CachedCodelist,
  CodelistEntry,
  CodelistLoadResult,
  CodelistMetadata,
  EditeurCodeJSON,
  EditeurCodelistJSON,
  RequiredCodelistNumber,
  UpdateCheckResult,
} from "./types";
export { REQUIRED_CODELISTS } from "./types";
