/**
 * ONIX Import Parser Types
 *
 * Story: 14.5 - Implement ONIX Import Parser
 * Task 1: Create parser infrastructure
 *
 * Type definitions for parsing ONIX 2.1, 3.0, and 3.1 messages.
 * Extends existing ONIX types from ../types.ts.
 */

import type { PublicationStatus } from "@/db/schema/titles";

/**
 * Supported ONIX versions
 */
export type ONIXVersion = "2.1" | "3.0" | "3.1";

/**
 * Parser interface - each ONIX version implements this
 */
export interface ONIXParser {
  version: ONIXVersion;
  parse(xml: string): ParsedONIXMessage;
}

/**
 * Parsed ONIX message header
 */
export interface ParsedHeader {
  senderName: string | null;
  senderEmail: string | null;
  sentDateTime: string | null;
}

/**
 * Parsed contributor from ONIX
 */
export interface ParsedContributor {
  sequenceNumber: number;
  role: string; // Codelist 17 value (A01, B01, etc.)
  personNameInverted: string | null;
  namesBeforeKey: string | null;
  keyNames: string | null;
  corporateName: string | null;
}

/**
 * Parsed price (for display only - not stored in titles)
 */
export interface ParsedPrice {
  priceType: string | null;
  amount: string | null;
  currency: string | null;
}

/**
 * Parsed subject (for display only - not stored in titles)
 */
export interface ParsedSubject {
  schemeIdentifier: string | null;
  code: string | null;
  headingText: string | null;
}

/**
 * Parsed product from ONIX message
 */
export interface ParsedProduct {
  recordReference: string;
  isbn13: string | null;
  gtin13: string | null;
  title: string;
  subtitle: string | null;
  contributors: ParsedContributor[];
  productForm: string | null; // For display only
  publishingStatus: string | null;
  publicationDate: Date | null;
  prices: ParsedPrice[]; // For display only
  subjects: ParsedSubject[]; // For display only
  rawIndex: number; // Original index in source file
}

/**
 * Parsing error during XML processing
 */
export interface ParsingError {
  productIndex: number | null; // null for message-level errors
  recordReference: string | null;
  field: string;
  message: string;
  severity: "error" | "warning";
}

/**
 * Complete parsed ONIX message
 */
export interface ParsedONIXMessage {
  version: ONIXVersion;
  header: ParsedHeader | null;
  products: ParsedProduct[];
  parsingErrors: ParsingError[];
}

/**
 * Mapped contributor ready for database
 */
export interface MappedContributor {
  firstName: string | null;
  lastName: string | null;
  role: string; // Codelist 17 value
  sequenceNumber: number;
  contactId?: string; // Set after contact matching/creation
}

/**
 * Field that was parsed but cannot be stored
 */
export interface UnmappedField {
  name: string;
  value: string;
  reason: string;
}

/**
 * Field-level validation error
 */
export interface FieldValidationError {
  field: string;
  message: string;
  value?: string;
}

/**
 * Mapped title ready for import
 */
export interface MappedTitle {
  /** Title fields that can be imported */
  title: {
    tenant_id?: string;
    title: string;
    subtitle: string | null;
    isbn: string | null;
    publication_status: PublicationStatus;
    publication_date: string | null;
  };
  /** Contributors to be created/linked */
  contributors: MappedContributor[];
  /** Fields parsed but not stored */
  unmappedFields: UnmappedField[];
  /** Validation errors for this product */
  validationErrors: FieldValidationError[];
  /** Original product index for reference */
  rawIndex: number;
}

/**
 * Import conflict detection result
 */
export interface ImportConflict {
  isbn: string;
  existingTitleId: string;
  existingTitleName: string;
  importProductIndex: number;
}

/**
 * Conflict resolution options
 */
export type ConflictResolution = "skip" | "update" | "create-new";

/**
 * Conflict resolution with optional new ISBN for create-new
 */
export interface ConflictResolutionEntry {
  resolution: ConflictResolution;
  /** New ISBN to use when resolution is "create-new" */
  newIsbn?: string;
}

/**
 * Preview product for UI display
 */
export interface PreviewProduct {
  index: number;
  recordReference: string;
  isbn: string | null;
  title: string;
  subtitle: string | null;
  contributors: {
    name: string;
    role: string;
  }[];
  publicationStatus: string | null;
  publicationDate: string | null;
  productForm: string | null; // Display only
  price: string | null; // Display only (formatted)
  subject: string | null; // Display only
  validationErrors: FieldValidationError[];
  unmappedFields: UnmappedField[];
  hasConflict: boolean;
  conflictTitleId: string | null;
  conflictTitleName: string | null;
}

/**
 * Import preview result
 */
export interface ImportPreview {
  version: ONIXVersion;
  totalProducts: number;
  validProducts: number;
  products: PreviewProduct[];
  errors: ImportError[];
  conflicts: ImportConflict[];
  unmappedFieldsSummary: string[];
}

/**
 * Import error (aggregated from parsing and validation)
 */
export interface ImportError {
  productIndex: number | null;
  recordReference: string | null;
  field: string;
  message: string;
  severity: "error" | "warning";
}

/**
 * Import result statistics
 */
export interface ImportResult {
  imported: number;
  skipped: number;
  updated: number;
  errors: number;
  importId: string;
}

/**
 * Ownership override for multi-author products
 */
export interface OwnershipOverride {
  contact_id: string;
  ownership_percentage: string;
  is_primary: boolean;
}
