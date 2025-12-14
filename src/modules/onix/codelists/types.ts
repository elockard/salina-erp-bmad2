/**
 * EDItEUR Codelist Types
 *
 * Story: 14.4 - Build Codelist Management System
 * Task 9.1: Create types.ts with interfaces
 *
 * TypeScript interfaces for codelist operations.
 */

/**
 * Individual code entry from EDItEUR JSON
 */
export interface CodelistEntry {
  code: string;
  description: string;
  notes?: string;
  deprecated?: boolean;
  addedInIssue?: number;
}

/**
 * Metadata for a loaded codelist
 */
export interface CodelistMetadata {
  listNumber: number;
  issueNumber: number;
  listName: string;
  valueCount: number;
  loadedAt: Date;
}

/**
 * Result of checking for codelist updates
 */
export interface UpdateCheckResult {
  listNumber: number;
  currentIssue: number;
  availableIssue: number;
  needsUpdate: boolean;
}

/**
 * In-memory cached codelist for fast lookups
 */
export interface CachedCodelist {
  listNumber: number;
  values: Map<string, CodelistEntry>;
  loadedAt: Date;
}

/**
 * EDItEUR JSON format for a single code in a codelist
 */
export interface EditeurCodeJSON {
  CodeValue: string;
  CodeDescription: string;
  CodeNotes?: string;
  IssueNumber?: number;
  Deprecated?: string;
}

/**
 * EDItEUR JSON format for a complete codelist file
 */
export interface EditeurCodelistJSON {
  CodeListNumber: string;
  IssueNumber: number;
  ListName: string;
  Codes: EditeurCodeJSON[];
}

/**
 * Key codelists required for Salina ONIX exports
 */
export const REQUIRED_CODELISTS = [
  5, // Product Identifier Type (ISBN-13=15, GTIN-13=03)
  15, // Title Type (Distinctive title=01)
  17, // Contributor Role (Author=A01, Editor=B01)
  27, // Subject Scheme (BISAC=10, BIC=12, Thema=93)
  150, // Product Form (Paperback=BC, Hardback=BB, EPUB=ED)
  196, // E-publication Accessibility
] as const;

export type RequiredCodelistNumber = (typeof REQUIRED_CODELISTS)[number];

/**
 * Result of a codelist load/update operation
 */
export interface CodelistLoadResult {
  listNumber: number;
  success: boolean;
  valueCount?: number;
  error?: string;
}
