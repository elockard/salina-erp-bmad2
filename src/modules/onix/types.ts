/**
 * ONIX Type Definitions
 *
 * Story: 14.1 - Create ONIX 3.1 Message Generator
 * Story: 14.6 - Add ONIX 3.0 Export Fallback
 * Task 1: Create ONIX module structure
 *
 * TypeScript interfaces matching ONIX 3.0/3.1 reference schema elements.
 * These types are used by the builder classes to ensure type safety.
 */

// Re-export ONIXVersion for convenience (Story 14.6)
export type { ONIXVersion } from "./parser/types";

/**
 * ONIX Message Header - Sender identification
 */
export interface ONIXHeader {
  senderName: string;
  emailAddress?: string;
  sentDateTime: string;
  defaultLanguageOfText: string;
  defaultCurrencyCode: string;
}

/**
 * Product Identifier (ISBN-13, GTIN-13, etc.)
 */
export interface ProductIdentifier {
  productIDType: string; // Codelist 5: "15" = ISBN-13, "03" = GTIN-13
  idValue: string;
}

/**
 * Title Detail element structure
 */
export interface TitleDetail {
  titleType: string; // Codelist 15: "01" = Distinctive title
  titleText: string;
  subtitle?: string;
}

/**
 * Contributor (Author, Editor, etc.)
 */
export interface Contributor {
  sequenceNumber: number;
  contributorRole: string; // Codelist 17: "A01" = Author
  personNameInverted: string; // "Last, First"
  namesBeforeKey: string; // "First"
  keyNames: string; // "Last"
}

/**
 * Publisher information
 */
export interface Publisher {
  publishingRole: string; // Codelist 45: "01" = Publisher
  publisherName: string;
}

/**
 * Publishing Date with role
 */
export interface PublishingDate {
  publishingDateRole: string; // Codelist 163: "01" = Publication date
  date: string; // YYYYMMDD format
}

/**
 * Supplier information
 */
export interface Supplier {
  supplierRole: string; // Codelist 93: "01" = Publisher to retailer
  supplierName: string;
}

/**
 * Price information
 */
export interface Price {
  priceType: string; // Codelist 58: "01" = RRP excluding tax
  priceAmount: string;
  currencyCode: string;
}

/**
 * Supply Detail containing supplier and pricing
 */
export interface SupplyDetail {
  supplier: Supplier;
  productAvailability: string; // Codelist 65: "20" = Available
  price: Price;
}

/**
 * Territory for market definition
 */
export interface Territory {
  countriesIncluded: string; // ISO 3166-1 codes, e.g., "US"
}

/**
 * Market containing territory
 */
export interface Market {
  territory: Territory;
}

/**
 * Product Supply block (Block 6)
 */
export interface ProductSupply {
  market: Market;
  supplyDetail: SupplyDetail;
}

/**
 * ProductFormFeature for accessibility metadata (Codelist 196)
 *
 * Story: 14.3 - Add Accessibility Metadata Support
 * AC: 4 - ProductFormFeature elements include Codelist 196 values
 */
export interface ProductFormFeature {
  productFormFeatureType: string; // "09" for accessibility conformance/features, "12" for hazards
  productFormFeatureValue: string; // Codelist 196 code
  productFormFeatureDescription?: string; // Optional description
}

/**
 * Block 1: Descriptive Detail
 */
export interface DescriptiveDetail {
  productComposition: string; // Codelist 2: "00" = Single-item
  productForm: string; // Codelist 150: "BC" = Paperback
  productFormFeatures?: ProductFormFeature[]; // Accessibility metadata
  titleDetail: TitleDetail;
  contributors: Contributor[];
}

/**
 * Block 4: Publishing Detail
 */
export interface PublishingDetail {
  publisher: Publisher;
  publishingStatus: string; // Codelist 64: "04" = Active
  publishingDate: PublishingDate;
}

/**
 * Complete ONIX Product record
 */
export interface ONIXProduct {
  recordReference: string;
  notificationType: string; // Codelist 1: "03" = New/Update
  productIdentifiers: ProductIdentifier[];
  descriptiveDetail: DescriptiveDetail;
  publishingDetail: PublishingDetail;
  productSupply: ProductSupply;
}

/**
 * Complete ONIX Message
 */
export interface ONIXMessage {
  header: ONIXHeader;
  products: ONIXProduct[];
}

/**
 * Export options for builder
 * Story 14.6: Added onixVersion for 3.0/3.1 selection
 */
export interface ExportOptions {
  prettyPrint?: boolean;
  includeXMLDeclaration?: boolean;
  /** ONIX version to export (default: "3.1") - Story 14.6 */
  onixVersion?: "3.0" | "3.1";
}

/**
 * Export result returned from actions
 */
export interface ExportResult {
  xml: string;
  filename: string;
  productCount: number;
}

// =============================================================================
// VALIDATION TYPES (Story 14.2)
// =============================================================================

/**
 * Validation error detail
 *
 * Story: 14.2 - Implement ONIX Schema Validation
 * AC: 3 - Validation errors display field-level details
 */
export interface ValidationError {
  type: "schema" | "business";
  code: string;
  message: string;
  path: string;
  expected?: string;
  actual?: string;
  codelistRef?: string;
}

/**
 * Validation result
 *
 * Story: 14.2 - Implement ONIX Schema Validation
 * AC: 1, 2 - System validates against schema and business rules
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Extended export result with validation
 *
 * Story: 14.2 - Implement ONIX Schema Validation
 * Story: 14.6 - Add ONIX 3.0 Export Fallback
 * AC: 5, 6 - Only validated exports are sent; results stored
 */
export interface ExportResultWithValidation extends ExportResult {
  validation?: ValidationResult;
  /** Title IDs that were skipped during batch export (missing or no ISBN) */
  skippedTitleIds?: string[];
  /** ONIX version used for this export - Story 14.6 */
  onixVersion?: "3.0" | "3.1";
}
