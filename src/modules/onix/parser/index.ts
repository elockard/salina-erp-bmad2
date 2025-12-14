/**
 * ONIX Import Parser Module
 *
 * Story: 14.5 - Implement ONIX Import Parser
 * Task 1: Create parser infrastructure
 *
 * Module exports for ONIX import parsing functionality.
 */

export { getParser } from "./base-parser";
// Encoding
export { detectAndConvertEncoding } from "./encoding-handler";
// Field mapping
export { mapPublishingStatus, mapToSalinaTitle } from "./field-mapper";
export { ONIX21Parser } from "./onix-21-parser";
export { ONIX30Parser } from "./onix-30-parser";
// Parsers
export { ONIX31Parser } from "./onix-31-parser";
// Short tags (ONIX 2.1)
export { expandShortTags, SHORT_TAG_MAP } from "./short-tags";
// Types
export * from "./types";
// Validation
export { validateImportBatch, validateImportProduct } from "./validation";
// Version detection
export { detectONIXVersion } from "./version-detector";
