/**
 * Sales Module Types
 *
 * TypeScript type definitions for sales transaction management.
 * Re-exports database types and defines additional application types.
 *
 * Story 3.2: Build Sales Transaction Entry Form
 * Related ACs: 2 (title autocomplete), 3 (format dropdown), 7 (channel dropdown)
 */

import type {
  Sale as DbSale,
  InsertSale,
  SalesChannel,
  SalesFormat,
} from "@/db/schema/sales";

/**
 * Sale record as stored in database
 * Inferred from Drizzle schema
 */
export type Sale = DbSale;

/**
 * Sale record for INSERT operations
 * Excludes auto-generated fields (id, created_at, updated_at)
 */
export type NewSale = InsertSale;

/**
 * Re-export enum types for use in components
 */
export type { SalesChannel, SalesFormat };

/**
 * Title data for sales form autocomplete
 * AC 2: Shows "[Title] ([Author]) - Physical, Ebook"
 * AC 3: Format dropdown shows only formats with assigned ISBN
 *
 * Used by:
 * - Title autocomplete component (searchTitlesForSales query)
 * - Format dropdown filtering (has_isbn, has_eisbn determine options)
 */
export interface TitleForSalesSelect {
  /** Title UUID for form submission */
  id: string;
  /** Title name for display */
  title: string;
  /** Author name for display in autocomplete */
  author_name: string;
  /** Whether title has physical ISBN assigned (enables "Physical Book" format) */
  has_isbn: boolean;
  /** Whether title has eISBN assigned (enables "Ebook" format) */
  has_eisbn: boolean;
}

/**
 * Format option for dropdown
 * Only formats with assigned ISBN are available
 */
export interface FormatOption {
  value: SalesFormat;
  label: string;
  disabled: boolean;
}

/**
 * Sales form field values
 * Used by React Hook Form for form state
 */
export interface SalesFormValues {
  title_id: string;
  format: SalesFormat;
  quantity: number;
  unit_price: string;
  sale_date: string;
  channel: SalesChannel;
}

/**
 * Selected title state for the form
 * Stores title info after selection from autocomplete
 */
export interface SelectedTitle {
  id: string;
  title: string;
  author_name: string;
  has_isbn: boolean;
  has_eisbn: boolean;
}

/**
 * Sales entry success response data
 * Returned by recordSale action on success
 */
export interface SaleRecordResult {
  id: string;
  title_name: string;
  quantity: number;
  total_amount: string;
}

/**
 * Sale record with related data for history view
 * Story 3.3: AC 3 (table columns), AC 6 (detail modal)
 */
export interface SaleWithRelations {
  id: string;
  sale_date: string;
  format: SalesFormat;
  quantity: number;
  unit_price: string;
  total_amount: string;
  channel: SalesChannel;
  created_at: Date;
  title: {
    id: string;
    title: string;
    author_name: string;
  };
  createdBy: {
    name: string;
  };
}

/**
 * Paginated sales response
 * Story 3.3: AC 5 (pagination)
 */
export interface PaginatedSales {
  items: SaleWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Sales stats for dashboard cards
 * Story 3.3: AC 2 (stats cards)
 */
export interface SalesStats {
  /** Total sales amount for current month (formatted currency string) */
  totalSalesThisMonth: string;
  /** Number of transactions this month */
  transactionsThisMonth: number;
  /** Best selling title with units sold */
  bestSellingTitle: {
    title: string;
    units: number;
  } | null;
}
