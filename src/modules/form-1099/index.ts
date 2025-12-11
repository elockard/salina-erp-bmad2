/**
 * Form 1099 Module
 *
 * Exports for 1099-MISC form generation and management.
 *
 * Story: 11.3 - Generate 1099-MISC Forms
 */

// Server Actions
export {
  downloadAll1099sZipAction,
  generate1099Action,
  generateBatch1099sAction,
  get1099DownloadUrlAction,
  get1099StatsAction,
  getAuthors1099InfoAction,
  regenerate1099Action,
} from "./actions";
// Generator (tsx file for JSX support)
export {
  generate1099S3Key,
  generateForm1099PDF,
  generateForm1099PDFUint8Array,
  parse1099S3Key,
} from "./generator";
// PDF Template
export { Form1099PDF } from "./pdf/form-1099-pdf";

// Storage
export {
  form1099PDFExists,
  generate1099ZipBuffer,
  get1099DownloadUrl,
  get1099PDFBuffer,
  upload1099PDF,
  upload1099ZipAndGetUrl,
} from "./storage";
// Types
export * from "./types";
