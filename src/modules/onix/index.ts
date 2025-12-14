/**
 * ONIX Module Exports
 *
 * Story: 14.1 - Create ONIX 3.1 Message Generator
 *
 * Central export point for ONIX 3.1 message generation functionality.
 */

// Server Actions
export {
  exportBatchTitles,
  exportSingleTitle,
  validateONIXExport,
} from "./actions";
// Builders
export { ONIXMessageBuilder } from "./builder/message-builder";
// Utilities
export {
  escapeXML,
  formatPublishingDate,
  formatSentDateTime,
  optionalElement,
} from "./builder/utils/xml-escape";
// Components
export { ONIXExportModal, ValidationResultsDisplay } from "./components";
export type {
  ImportPreview,
  ImportResult,
  MappedTitle,
  ONIXVersion,
  ParsedONIXMessage,
  ParsedProduct,
  PreviewProduct,
} from "./parser";
// Parser (Import)
export {
  detectONIXVersion,
  getParser,
  mapToSalinaTitle,
  ONIX21Parser,
  ONIX30Parser,
  ONIX31Parser,
} from "./parser";
// Import Actions
export {
  getImportHistory,
  importONIXTitles,
  uploadONIXFile,
} from "./parser/actions";
// Types
export * from "./types";
// Validator
export {
  validateBusinessRules,
  validateISBN13,
  validateONIXMessage,
  validateStructure,
} from "./validator";
