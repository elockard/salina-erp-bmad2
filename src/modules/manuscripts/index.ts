/**
 * Manuscripts Module
 *
 * Story: 21.3 - Upload Manuscript Files
 *
 * Exports all manuscript submission functionality for use by other modules.
 */

export type { ActionResult } from "./actions";
// Actions
export {
  createDraftProductionProject,
  MANUSCRIPT_ALLOWED_TYPES,
  MANUSCRIPT_MAX_SIZE,
  uploadManuscriptSubmission,
} from "./actions";

// Queries
export {
  getAuthorManuscriptSubmissions,
  getAuthorTitleOptions,
  getSubmissionById,
  verifyTitleAccess,
} from "./queries";
// Types
export * from "./types";
