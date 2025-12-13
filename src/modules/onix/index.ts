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
// Types
export * from "./types";
// Validator
export {
  validateBusinessRules,
  validateISBN13,
  validateONIXMessage,
  validateStructure,
} from "./validator";
