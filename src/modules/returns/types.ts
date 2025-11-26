/**
 * Returns Module Types
 *
 * TypeScript type definitions for returns management.
 * Re-exports database types and defines additional application types.
 *
 * Story 3.4: Create Returns Database Schema with Approval Workflow
 * Story 3.5+: Return request entry and approval forms
 */

import type { ReturnStatus, SalesFormat } from "@/db/schema";
import type { Return as DbReturn, InsertReturn } from "@/db/schema/returns";

/**
 * Return record as stored in database
 * Inferred from Drizzle schema
 */
export type Return = DbReturn;

/**
 * Return record for INSERT operations
 * Excludes auto-generated fields (id, created_at, updated_at)
 */
export type NewReturn = InsertReturn;

/**
 * Re-export enum types for use in components
 */
export type { ReturnStatus };
export type ReturnFormat = SalesFormat; // Returns use same format enum as sales

/**
 * Title data for returns form autocomplete
 * Similar to TitleForSalesSelect but for returns
 */
export interface TitleForReturnSelect {
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
 * Return record with related data for history view
 * Story 3.7: Returns History View with Status Filtering
 */
export interface ReturnWithRelations {
  id: string;
  return_date: string;
  format: SalesFormat;
  quantity: number;
  unit_price: string;
  total_amount: string;
  reason: string | null;
  status: ReturnStatus;
  reviewed_at: Date | null;
  created_at: Date;
  title: {
    id: string;
    title: string;
    author_name: string;
  };
  createdBy: {
    name: string;
  };
  reviewedBy: {
    name: string;
  } | null;
  originalSale: {
    id: string;
    sale_date: string;
  } | null;
}

/**
 * Pending return for approval queue
 * Story 3.6: Return Approval Queue for Finance
 * FR35: System tracks who approved/rejected returns and when
 */
export interface PendingReturn {
  id: string;
  return_date: string;
  format: SalesFormat;
  quantity: number;
  unit_price: string;
  total_amount: string;
  reason: string | null;
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
 * Return approval action data
 * Used when Finance approves or rejects a return
 */
export interface ReturnApproval {
  return_id: string;
  action: "approve" | "reject";
  reason?: string;
}

/**
 * Returns form field values
 * Used by React Hook Form for form state
 */
export interface ReturnsFormValues {
  title_id: string;
  original_sale_id?: string;
  format: SalesFormat;
  quantity: number;
  unit_price: string;
  return_date: string;
  reason?: string;
}

/**
 * Selected title state for the form
 * Stores title info after selection from autocomplete
 */
export interface SelectedTitleForReturn {
  id: string;
  title: string;
  author_name: string;
  has_isbn: boolean;
  has_eisbn: boolean;
}

/**
 * Return entry success response data
 * Returned by createReturn action on success
 */
export interface ReturnRecordResult {
  id: string;
  title_name: string;
  quantity: number;
  total_amount: string;
  status: ReturnStatus;
}

/**
 * Paginated returns response
 * Story 3.7: Returns History View
 */
export interface PaginatedReturns {
  items: ReturnWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Returns stats for dashboard cards
 */
export interface ReturnsStats {
  /** Total pending returns awaiting approval */
  pendingCount: number;
  /** Total approved returns this month */
  approvedThisMonth: number;
  /** Total return amount this month (formatted currency string) */
  totalReturnsThisMonth: string;
}

/**
 * Approval queue summary
 * For Finance dashboard widgets
 */
export interface ApprovalQueueSummary {
  /** Number of pending returns */
  pendingCount: number;
  /** Total value of pending returns */
  pendingTotal: string;
  /** Oldest pending return date */
  oldestPendingDate: Date | null;
}
