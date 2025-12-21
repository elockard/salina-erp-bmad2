/**
 * Marketing Assets Module
 *
 * Story: 21.2 - Access Marketing Asset Library
 *
 * Exports all marketing asset functionality for use by other modules.
 */

export type { ActionResult } from "./actions";
// Actions
export { downloadAsset } from "./actions";

// Queries
export {
  getAssetWithTitleAuthorCheck,
  getAuthorMarketingAssets,
} from "./queries";
// Storage utilities
export {
  ALLOWED_MIME_TYPES,
  deleteMarketingAsset,
  formatFileSize,
  generateAssetS3Key,
  getAssetDownloadUrl,
  MAX_FILE_SIZES,
  uploadMarketingAsset,
  validateAssetFile,
} from "./storage";
// Types
export * from "./types";
