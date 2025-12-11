/**
 * Form 1099 Types
 *
 * Type definitions for 1099-MISC form generation.
 *
 * Story: 11.3 - Generate 1099-MISC Forms
 */

/**
 * Payer information for 1099 form
 * (Publisher/Tenant information)
 */
export interface Form1099Payer {
  /** Payer's legal business name */
  name: string;
  /** Last 4 digits of EIN for display (masked) */
  ein_last_four: string;
  /** Street address line 1 */
  address_line1: string;
  /** Street address line 2 (optional) */
  address_line2: string | null;
  /** City */
  city: string;
  /** State (2-letter code) */
  state: string;
  /** ZIP code */
  zip: string;
}

/**
 * Recipient information for 1099 form
 * (Author/Contact information)
 */
export interface Form1099Recipient {
  /** Recipient's unique ID (for account number field) */
  id: string;
  /** Recipient's full name */
  name: string;
  /** Last 4 digits of TIN for display (masked) */
  tin_last_four: string;
  /** TIN type for proper masking */
  tin_type: "ssn" | "ein";
  /** Street address line 1 */
  address_line1: string;
  /** Street address line 2 (optional) */
  address_line2: string | null;
  /** City */
  city: string;
  /** State (2-letter code) */
  state: string;
  /** ZIP code */
  zip: string;
}

/**
 * Data structure for generating a 1099-MISC PDF
 */
export interface Form1099PDFData {
  /** Unique form identifier */
  form_id: string;
  /** Tax year (e.g., 2024) */
  tax_year: number;
  /** Total amount for Box 2 (Royalties) */
  amount: string;
  /** Payer (publisher) information */
  payer: Form1099Payer;
  /** Recipient (author) information */
  recipient: Form1099Recipient;
}

/**
 * Author data for 1099 eligibility checking
 * Used in the 1099 generation page
 */
export interface Author1099Info {
  /** Contact ID */
  id: string;
  /** Author's full name */
  name: string;
  /** Email address */
  email: string | null;
  /** Whether author has complete tax info on file */
  has_tax_info: boolean;
  /** Last 4 digits of TIN (if available) */
  tin_last_four: string | null;
  /** TIN type */
  tin_type: "ssn" | "ein" | null;
  /** Whether author is US-based (required for 1099) */
  is_us_based: boolean;
  /** Total earnings for the tax year */
  total_earnings: string;
  /** Whether earnings meet $10 royalty threshold */
  meets_threshold: boolean;
  /** Whether 1099 has already been generated for this year */
  has_generated_1099: boolean;
  /** Date 1099 was generated (if applicable) */
  generated_1099_at: Date | null;
  /** Street address */
  address_line1: string | null;
  /** Street address line 2 */
  address_line2: string | null;
  /** City */
  city: string | null;
  /** State */
  state: string | null;
  /** ZIP code */
  postal_code: string | null;
}

/**
 * Result of generating a 1099 form
 */
export interface Generate1099Result {
  /** Form 1099 record ID */
  form_id: string;
  /** Contact ID */
  contact_id: string;
  /** Tax year */
  tax_year: number;
  /** Amount reported */
  amount: string;
  /** S3 key for PDF storage */
  pdf_s3_key: string;
}

/**
 * Batch generation request
 */
export interface BatchGenerate1099Request {
  /** Tax year to generate forms for */
  tax_year: number;
  /** Contact IDs to generate forms for (empty = all eligible) */
  contact_ids?: string[];
}

/**
 * Batch generation result
 */
export interface BatchGenerate1099Result {
  /** Number of forms successfully generated */
  success_count: number;
  /** Number of forms that failed to generate */
  failure_count: number;
  /** Details of each result */
  results: {
    contact_id: string;
    contact_name: string;
    success: boolean;
    error?: string;
    form_id?: string;
  }[];
}

/**
 * 1099 Generation filter options
 */
export interface Form1099FilterOptions {
  /** Filter by tax year */
  tax_year: number;
  /** Show only authors meeting threshold */
  meets_threshold_only?: boolean;
  /** Show only authors with complete tax info */
  has_tax_info_only?: boolean;
  /** Show only US-based authors */
  us_based_only?: boolean;
  /** Show only authors without generated 1099 */
  not_generated_only?: boolean;
}

/**
 * Regenerate 1099 request with force flag
 */
export interface Regenerate1099Request {
  /** Form 1099 ID to regenerate */
  form_id: string;
  /** Confirm regeneration even if amount changed */
  confirm_amount_change?: boolean;
}

/**
 * Regenerate result with change warnings
 */
export interface Regenerate1099Result {
  /** New form ID */
  form_id: string;
  /** Contact ID */
  contact_id: string;
  /** Tax year */
  tax_year: number;
  /** New amount */
  new_amount: string;
  /** Previous amount (if changed) */
  previous_amount?: string;
  /** Whether amount changed */
  amount_changed: boolean;
  /** S3 key for new PDF */
  pdf_s3_key: string;
}

/**
 * 1099 Audit event types
 */
export type Form1099AuditEvent =
  | "1099_generated"
  | "1099_regenerated"
  | "1099_batch_generated"
  | "1099_downloaded";

/**
 * 1099 Audit log entry
 */
export interface Form1099AuditEntry {
  event: Form1099AuditEvent;
  tenant_id: string;
  user_id: string;
  contact_id?: string;
  tax_year: number;
  amount?: string;
  previous_amount?: string;
  count?: number;
  duration_ms?: number;
  timestamp: Date;
}
