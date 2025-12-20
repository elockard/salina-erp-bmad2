/**
 * Import/Export Module Types
 *
 * Story: 19.1 - Import Catalog via CSV
 * Task 1: CSV parser and column mapping types
 *
 * Story: 19.3 - Export Catalog to CSV
 * Task 1: Export types and configuration
 *
 * FRs: FR170, FR171, FR173
 */

// =============================================================================
// CSV PARSING TYPES
// =============================================================================

/**
 * Result of parsing a CSV file
 */
export interface CsvParseResult {
  /** Whether parsing succeeded */
  success: boolean;
  /** Parsed data rows (excluding header if detected) */
  rows: string[][];
  /** Detected or provided headers */
  headers: string[];
  /** Whether headers were auto-detected */
  headersDetected: boolean;
  /** Total row count (excluding header) */
  rowCount: number;
  /** Parsing errors */
  errors: CsvParseError[];
  /** Detected delimiter */
  delimiter: "," | "\t";
  /** Original filename */
  filename?: string;
  /** File size in bytes */
  fileSize?: number;
}

/**
 * CSV parsing error
 */
export interface CsvParseError {
  /** Row number (1-indexed, matches Excel) */
  row: number;
  /** Error message */
  message: string;
  /** Original line content */
  raw?: string;
}

// =============================================================================
// COLUMN MAPPING TYPES
// =============================================================================

/**
 * Importable title fields
 * These are the fields that can be mapped from CSV columns
 */
export const IMPORTABLE_TITLE_FIELDS = [
  "title",
  "subtitle",
  "author_name",
  "isbn",
  "genre",
  "publication_date",
  "publication_status",
  "word_count",
  "asin",
  "bisac_code",
  "bisac_codes",
] as const;

export type ImportableTitleField = (typeof IMPORTABLE_TITLE_FIELDS)[number];

/**
 * Field metadata for column mapping UI
 */
export interface TitleFieldMeta {
  field: ImportableTitleField;
  label: string;
  required: boolean;
  description: string;
  example: string;
}

/**
 * Metadata for all importable fields
 */
export const TITLE_FIELD_METADATA: TitleFieldMeta[] = [
  {
    field: "title",
    label: "Title",
    required: true,
    description: "The title of the work (required)",
    example: "The Great Gatsby",
  },
  {
    field: "subtitle",
    label: "Subtitle",
    required: false,
    description: "Subtitle of the work",
    example: "A Novel",
  },
  {
    field: "author_name",
    label: "Author Name",
    required: false,
    description: "Author's full name (must match existing contact)",
    example: "F. Scott Fitzgerald",
  },
  {
    field: "isbn",
    label: "ISBN",
    required: false,
    description: "ISBN-13 format (with or without hyphens)",
    example: "978-0-7432-7356-5",
  },
  {
    field: "genre",
    label: "Genre",
    required: false,
    description: "Genre classification",
    example: "Fiction",
  },
  {
    field: "publication_date",
    label: "Publication Date",
    required: false,
    description: "Date in YYYY-MM-DD format",
    example: "2024-01-15",
  },
  {
    field: "publication_status",
    label: "Publication Status",
    required: false,
    description: "Status: draft, pending, published, or out_of_print",
    example: "published",
  },
  {
    field: "word_count",
    label: "Word Count",
    required: false,
    description: "Number of words (positive integer)",
    example: "47094",
  },
  {
    field: "asin",
    label: "ASIN",
    required: false,
    description: "Amazon Standard Identification Number (10 characters)",
    example: "B08N5WRWNW",
  },
  {
    field: "bisac_code",
    label: "BISAC Code",
    required: false,
    description:
      "Primary BISAC subject code (9 characters: 3-letter prefix + 6-digit number)",
    example: "FIC009000",
  },
  {
    field: "bisac_codes",
    label: "Secondary BISAC Codes",
    required: false,
    description: "Additional BISAC codes (comma or semicolon separated, max 2)",
    example: "FIC009010;FIC004000",
  },
];

/**
 * A single column mapping
 */
export interface ColumnMapping {
  /** Index of the CSV column (0-indexed) */
  csvColumnIndex: number;
  /** The CSV column header */
  csvColumnHeader: string;
  /** The Salina field to map to (null if unmapped) */
  targetField: ImportableTitleField | null;
  /** Sample values from the CSV for preview */
  sampleValues: string[];
}

/**
 * Common header variations that auto-map to fields
 */
export const HEADER_AUTO_MAP: Record<string, ImportableTitleField> = {
  // Title variations
  title: "title",
  "book title": "title",
  "work title": "title",
  name: "title",

  // Subtitle variations
  subtitle: "subtitle",
  "sub title": "subtitle",
  "sub-title": "subtitle",

  // Author variations
  author: "author_name",
  "author name": "author_name",
  author_name: "author_name",
  writer: "author_name",

  // ISBN variations
  isbn: "isbn",
  "isbn-13": "isbn",
  isbn13: "isbn",
  "isbn 13": "isbn",

  // Genre variations
  genre: "genre",
  category: "genre",
  subject: "genre",

  // Publication date variations
  "publication date": "publication_date",
  publication_date: "publication_date",
  "pub date": "publication_date",
  pubdate: "publication_date",
  "publish date": "publication_date",
  published: "publication_date",

  // Status variations
  status: "publication_status",
  "publication status": "publication_status",
  publication_status: "publication_status",
  "pub status": "publication_status",

  // Word count variations
  "word count": "word_count",
  word_count: "word_count",
  wordcount: "word_count",
  words: "word_count",

  // ASIN variations
  asin: "asin",
  "amazon asin": "asin",

  // BISAC variations
  bisac: "bisac_code",
  "bisac code": "bisac_code",
  bisac_code: "bisac_code",
  "primary bisac": "bisac_code",
  "bisac codes": "bisac_codes",
  bisac_codes: "bisac_codes",
  "secondary bisac": "bisac_codes",
  "additional bisac": "bisac_codes",
};

// =============================================================================
// IMPORT VALIDATION TYPES
// =============================================================================

/**
 * Validation error for a single row
 */
export interface ImportRowError {
  /** Row number (1-indexed, matches Excel) */
  row: number;
  /** Field that failed validation */
  field: string;
  /** Original value that failed */
  value: string;
  /** Human-readable error message */
  message: string;
}

/**
 * Validated row ready for import
 */
export interface ValidatedTitleRow {
  /** Row number from CSV (1-indexed) */
  row: number;
  /** Validated title data */
  data: {
    title: string;
    subtitle?: string;
    contact_id?: string; // Resolved from author_name
    isbn?: string;
    genre?: string;
    publication_date?: string;
    publication_status?: "draft" | "pending" | "published" | "out_of_print";
    word_count?: number;
    asin?: string;
    bisac_code?: string;
    bisac_codes?: string[];
  };
  /** Author name (for display, before resolution) */
  authorName?: string;
  /** Whether this row is valid */
  valid: boolean;
  /** Validation errors for this row */
  errors: ImportRowError[];
  /** Warnings (non-blocking issues) */
  warnings: string[];
  /** BISAC suggestions based on title metadata (Story 19.5) */
  bisacSuggestions?: import("./bisac").BisacSuggestion[];
}

/**
 * Result of validating CSV data
 */
export interface ImportValidationResult {
  /** Whether all rows are valid */
  allValid: boolean;
  /** Total rows processed */
  totalRows: number;
  /** Number of valid rows */
  validCount: number;
  /** Number of invalid rows */
  invalidCount: number;
  /** Validated rows */
  rows: ValidatedTitleRow[];
  /** All errors across all rows */
  errors: ImportRowError[];
  /** Summary statistics */
  stats: {
    withAuthor: number;
    withIsbn: number;
    withAsin: number;
    withBisac: number;
    duplicateIsbns: string[];
    duplicateAsins: string[];
    unmatchedAuthors: string[];
  };
}

// =============================================================================
// IMPORT RESULT TYPES
// =============================================================================

/**
 * Result summary for import tracking (mirrors onix-imports.ts)
 */
export interface ImportResultSummary {
  imported: number;
  skipped: number;
  updated: number;
  errors: number;
  conflicts: number;
}

/**
 * Final import result
 */
export interface ImportResult {
  /** Whether import succeeded */
  success: boolean;
  /** Total rows attempted */
  totalRows: number;
  /** Number of titles imported */
  imported: number;
  /** Number of rows skipped */
  skipped: number;
  /** Errors that occurred */
  errors: ImportRowError[];
  /** IDs of created titles */
  createdTitleIds: string[];
  /** Import record ID for tracking */
  importId: string;
}

// =============================================================================
// IMPORT WIZARD STATE
// =============================================================================

/**
 * Steps in the import wizard
 */
export type ImportWizardStep =
  | "upload"
  | "map"
  | "preview"
  | "import"
  | "complete";

/**
 * Import wizard state
 */
export interface ImportWizardState {
  /** Current step */
  step: ImportWizardStep;
  /** Parsed CSV data */
  parseResult: CsvParseResult | null;
  /** Column mappings */
  columnMappings: ColumnMapping[];
  /** Validation result */
  validationResult: ImportValidationResult | null;
  /** Import result */
  importResult: ImportResult | null;
  /** Whether import is in progress */
  isImporting: boolean;
  /** Whether validation is in progress */
  isValidating: boolean;
}

// =============================================================================
// EXPORT TYPES (Story 19.3)
// =============================================================================

/**
 * Exportable data types
 * AC 1: I can select data type (titles, contacts, sales)
 */
export const EXPORT_DATA_TYPES = ["titles", "contacts", "sales"] as const;
export type ExportDataType = (typeof EXPORT_DATA_TYPES)[number];

/**
 * Export status values for tracking
 * AC 4: Large exports processed in background
 * AC 5: I'm notified when export is ready
 */
export const EXPORT_STATUS_VALUES = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;
export type ExportStatus = (typeof EXPORT_STATUS_VALUES)[number];

/**
 * Export filters for date range and type-specific filtering
 * AC 2: I can filter by date range
 */
export interface ExportFilters {
  /** Date range filter (applies to created_at for titles/contacts, sale_date for sales) */
  dateRange?: {
    from: Date;
    to: Date;
  };
  /** Publication status filter (titles only) */
  publicationStatus?: "draft" | "pending" | "published" | "out_of_print";
  /** Sales format filter (sales only) */
  format?: "physical" | "ebook" | "audiobook";
  /** Sales channel filter (sales only) */
  channel?: "retail" | "wholesale" | "direct" | "distributor" | "amazon";
  /** Contact role filter (contacts only) */
  role?: "author" | "customer" | "vendor" | "distributor";
}

/**
 * Export result tracking
 * Used for both sync and async exports
 */
export interface ExportResult {
  /** Export record ID */
  id: string;
  /** Current status */
  status: ExportStatus;
  /** Type of data exported */
  exportType: ExportDataType;
  /** Number of rows exported */
  rowCount: number;
  /** File size in bytes */
  fileSize?: number;
  /** Presigned S3 URL for download (async exports) */
  fileUrl?: string;
  /** Filters that were applied */
  filters?: ExportFilters;
  /** Error message if failed */
  errorMessage?: string;
  /** When export was requested */
  createdAt: Date;
  /** When processing started */
  startedAt?: Date;
  /** When export completed */
  completedAt?: Date;
  /** When presigned URL expires */
  expiresAt?: Date;
}

// =============================================================================
// EXPORTABLE FIELD DEFINITIONS (Story 19.3)
// =============================================================================

/**
 * Exportable title fields
 * Based on Dev Notes: Titles Export table
 */
export const EXPORTABLE_TITLE_FIELDS = [
  "title",
  "subtitle",
  "author_name",
  "isbn",
  "genre",
  "publication_date",
  "publication_status",
  "word_count",
  "asin",
  "bisac_code",
  "bisac_codes",
  "created_at",
  "updated_at",
] as const;

export type ExportableTitleField = (typeof EXPORTABLE_TITLE_FIELDS)[number];

/**
 * Exportable contact fields
 * Based on Dev Notes: Contacts Export table
 * SECURITY: Does NOT include tin_encrypted
 */
export const EXPORTABLE_CONTACT_FIELDS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "address_line1",
  "address_line2",
  "city",
  "state",
  "postal_code",
  "country",
  "tin_last_four",
  "tin_type",
  "roles",
  "created_at",
] as const;

export type ExportableContactField = (typeof EXPORTABLE_CONTACT_FIELDS)[number];

/**
 * Exportable sales fields
 * Based on Dev Notes: Sales Export table
 * Uses sale_date (NOT transaction_date)
 */
export const EXPORTABLE_SALES_FIELDS = [
  "title",
  "isbn",
  "author_name",
  "format",
  "channel",
  "quantity",
  "unit_price",
  "total_amount",
  "sale_date",
  "created_at",
] as const;

export type ExportableSalesField = (typeof EXPORTABLE_SALES_FIELDS)[number];

// =============================================================================
// EXPORT FIELD METADATA (Story 19.3)
// =============================================================================

/**
 * Field metadata for export CSV headers
 */
export interface ExportFieldMeta<T extends string> {
  /** Field key */
  field: T;
  /** Display label */
  label: string;
  /** CSV column header */
  columnHeader: string;
  /** Description for documentation */
  description: string;
}

/**
 * Title export field metadata
 * Maps to CSV column headers
 */
export const TITLE_EXPORT_FIELD_METADATA: ExportFieldMeta<ExportableTitleField>[] =
  [
    {
      field: "title",
      label: "Title",
      columnHeader: "Title",
      description: "The title of the work",
    },
    {
      field: "subtitle",
      label: "Subtitle",
      columnHeader: "Subtitle",
      description: "Subtitle of the work",
    },
    {
      field: "author_name",
      label: "Author",
      columnHeader: "Author",
      description: "Computed from titleAuthors or contact",
    },
    {
      field: "isbn",
      label: "ISBN",
      columnHeader: "ISBN",
      description: "ISBN-13 identifier",
    },
    {
      field: "genre",
      label: "Genre",
      columnHeader: "Genre",
      description: "Genre classification",
    },
    {
      field: "publication_date",
      label: "Publication Date",
      columnHeader: "Publication Date",
      description: "Date of publication",
    },
    {
      field: "publication_status",
      label: "Status",
      columnHeader: "Status",
      description: "Publication status (draft/pending/published/out_of_print)",
    },
    {
      field: "word_count",
      label: "Word Count",
      columnHeader: "Word Count",
      description: "Number of words in the work",
    },
    {
      field: "asin",
      label: "ASIN",
      columnHeader: "ASIN",
      description: "Amazon Standard Identification Number",
    },
    {
      field: "bisac_code",
      label: "BISAC Code",
      columnHeader: "BISAC Code",
      description: "Primary BISAC subject classification code",
    },
    {
      field: "bisac_codes",
      label: "Secondary BISAC",
      columnHeader: "Secondary BISAC Codes",
      description: "Additional BISAC codes (semicolon-separated)",
    },
    {
      field: "created_at",
      label: "Created",
      columnHeader: "Created",
      description: "Record creation timestamp",
    },
    {
      field: "updated_at",
      label: "Updated",
      columnHeader: "Updated",
      description: "Last update timestamp",
    },
  ];

/**
 * Contact export field metadata
 * Maps to CSV column headers
 */
export const CONTACT_EXPORT_FIELD_METADATA: ExportFieldMeta<ExportableContactField>[] =
  [
    {
      field: "first_name",
      label: "First Name",
      columnHeader: "First Name",
      description: "Contact first name",
    },
    {
      field: "last_name",
      label: "Last Name",
      columnHeader: "Last Name",
      description: "Contact last name",
    },
    {
      field: "email",
      label: "Email",
      columnHeader: "Email",
      description: "Email address",
    },
    {
      field: "phone",
      label: "Phone",
      columnHeader: "Phone",
      description: "Phone number",
    },
    {
      field: "address_line1",
      label: "Address Line 1",
      columnHeader: "Address Line 1",
      description: "Street address",
    },
    {
      field: "address_line2",
      label: "Address Line 2",
      columnHeader: "Address Line 2",
      description: "Apartment, suite, etc.",
    },
    {
      field: "city",
      label: "City",
      columnHeader: "City",
      description: "City",
    },
    {
      field: "state",
      label: "State",
      columnHeader: "State",
      description: "State/Province",
    },
    {
      field: "postal_code",
      label: "Postal Code",
      columnHeader: "Postal Code",
      description: "ZIP/Postal code",
    },
    {
      field: "country",
      label: "Country",
      columnHeader: "Country",
      description: "Country",
    },
    {
      field: "tin_last_four",
      label: "Tax ID (Last 4)",
      columnHeader: "Tax ID (Last 4)",
      description: "Last 4 digits of TIN (already masked)",
    },
    {
      field: "tin_type",
      label: "TIN Type",
      columnHeader: "TIN Type",
      description: "SSN or EIN classification",
    },
    {
      field: "roles",
      label: "Roles",
      columnHeader: "Roles",
      description: "Contact roles (comma-separated)",
    },
    {
      field: "created_at",
      label: "Created",
      columnHeader: "Created",
      description: "Record creation timestamp",
    },
  ];

/**
 * Sales export field metadata
 * Maps to CSV column headers
 */
export const SALES_EXPORT_FIELD_METADATA: ExportFieldMeta<ExportableSalesField>[] =
  [
    {
      field: "title",
      label: "Title",
      columnHeader: "Title",
      description: "Title name via sales.title_id",
    },
    {
      field: "isbn",
      label: "ISBN",
      columnHeader: "ISBN",
      description: "Title ISBN",
    },
    {
      field: "author_name",
      label: "Author",
      columnHeader: "Author",
      description: "Computed from titleAuthors or contact",
    },
    {
      field: "format",
      label: "Format",
      columnHeader: "Format",
      description: "physical/ebook/audiobook",
    },
    {
      field: "channel",
      label: "Channel",
      columnHeader: "Channel",
      description: "retail/wholesale/direct/distributor/amazon",
    },
    {
      field: "quantity",
      label: "Quantity",
      columnHeader: "Quantity",
      description: "Number of units sold",
    },
    {
      field: "unit_price",
      label: "Unit Price",
      columnHeader: "Unit Price",
      description: "Price per unit (DECIMAL 10,2)",
    },
    {
      field: "total_amount",
      label: "Total",
      columnHeader: "Total",
      description: "Total sale amount (DECIMAL 10,2)",
    },
    {
      field: "sale_date",
      label: "Sale Date",
      columnHeader: "Sale Date",
      description: "Date of the sale",
    },
    {
      field: "created_at",
      label: "Created",
      columnHeader: "Created",
      description: "Record creation timestamp",
    },
  ];

// =============================================================================
// EXPORT THRESHOLD CONSTANTS (Story 19.3)
// =============================================================================

/**
 * Row count threshold for background processing
 * ≤ 1000 rows: Synchronous (immediate download)
 * > 1000 rows: Background (Inngest job)
 */
export const EXPORT_SYNC_THRESHOLD = 1000;

/**
 * Presigned URL expiry time in seconds (24 hours)
 */
export const EXPORT_URL_EXPIRY_SECONDS = 86400;

// =============================================================================
// BULK UPDATE TYPES (Story 19.4)
// =============================================================================

/**
 * Steps in the update wizard
 * Story 19.4 Task 1.1
 */
export type UpdateWizardStep =
  | "upload"
  | "map"
  | "match"
  | "preview"
  | "update"
  | "complete";

/**
 * Import/Update mode
 * Story 19.4 Task 1.2
 * - create: Only create new records (import flow)
 * - update: Only update existing records (update flow)
 * - upsert: Update existing or create new if not found
 */
export type UpdateMode = "create" | "update" | "upsert";

/**
 * Single field change in a diff
 * Story 19.4 Task 1.3
 */
export interface FieldChange {
  /** Display label for the field */
  field: string;
  /** Database field key */
  fieldKey: ImportableTitleField;
  /** Current value in database */
  oldValue: string | number | null;
  /** New value from CSV */
  newValue: string | number | null;
}

/**
 * Diff between existing title and CSV row
 * Story 19.4 Task 1.3
 */
export interface TitleDiff {
  /** Fields that have changed */
  changedFields: FieldChange[];
  /** Fields that remain unchanged */
  unchangedFields: string[];
  /** Total number of compared fields */
  totalFields: number;
}

/**
 * Existing title data for diff comparison
 * Subset of title fields relevant to CSV updates
 */
export interface ExistingTitleData {
  id: string;
  title: string;
  subtitle: string | null;
  isbn: string | null;
  genre: string | null;
  publication_date: string | null;
  publication_status: string;
  word_count: number | null;
  asin: string | null;
  bisac_code: string | null;
  bisac_codes: string[] | null;
}

/**
 * Result of bulk update operation
 * Story 19.4 Task 1.4
 */
export interface BulkUpdateResult {
  /** Whether operation succeeded */
  success: boolean;
  /** Number of titles updated */
  updatedCount: number;
  /** Number of titles created (upsert mode) */
  createdCount: number;
  /** Number of rows skipped (no changes or errors) */
  skippedCount: number;
  /** Errors that occurred */
  errors: ImportRowError[];
  /** Import tracking record ID */
  importId: string;
  /** IDs of updated titles */
  updatedTitleIds: string[];
  /** IDs of created titles (upsert mode) */
  createdTitleIds: string[];
}

/**
 * Match result for a single CSV row to existing title
 * Story 19.4 Task 1.5
 */
export interface TitleMatch {
  /** ISBN from CSV (original format) */
  isbn: string;
  /** Matched title ID */
  titleId: string;
  /** Existing title data for display */
  existingTitle: ExistingTitleData;
  /** Validated CSV row data */
  csvRow: ValidatedTitleRow;
  /** Computed diff between existing and new */
  diff: TitleDiff;
  /** Whether this row has any changes */
  hasChanges: boolean;
  /** Row number from CSV (1-indexed) */
  rowNumber: number;
  /** Whether user selected this row for update */
  selected: boolean;
}

/**
 * Result of ISBN matching operation
 * Story 19.4 Task 2.8
 */
export interface MatchResult {
  /** Rows matched to existing titles */
  matched: TitleMatch[];
  /** ISBNs not found in database */
  unmatched: string[];
  /** Row numbers without ISBN field */
  noIsbn: number[];
  /** Validation errors during matching */
  errors: ImportRowError[];
}

/**
 * Update wizard state
 * Story 19.4 - Similar to ImportWizardState but for updates
 */
export interface UpdateWizardState {
  /** Current step */
  step: UpdateWizardStep;
  /** Parsed CSV data */
  parseResult: CsvParseResult | null;
  /** Column mappings */
  columnMappings: ColumnMapping[];
  /** Validation result from CSV parsing */
  validationResult: ImportValidationResult | null;
  /** Match result from ISBN lookup */
  matchResult: MatchResult | null;
  /** Update result */
  updateResult: BulkUpdateResult | null;
  /** Whether matching is in progress */
  isMatching: boolean;
  /** Whether update is in progress */
  isUpdating: boolean;
  /** Upsert mode: create unmatched titles */
  createUnmatched: boolean;
}

/**
 * Update details for audit trail
 * Stored in csv_imports.update_details
 */
export interface UpdateDetails {
  /** Individual update records */
  updates: Array<{
    /** Title ID that was updated */
    title_id: string;
    /** ISBN used for matching */
    isbn: string;
    /** Field-level changes made */
    changes: FieldChange[];
  }>;
  /** Total number of fields changed across all updates */
  totalFieldsChanged: number;
}
