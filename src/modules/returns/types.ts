/**
 * Returns Module Types
 *
 * TypeScript type definitions for returns management.
 * Re-exports database types and defines additional application types.
 *
 * Story 3.4: Create Returns Database Schema with Approval Workflow
 * Story 3.5: Build Return Request Entry Form
 */

import type { ReturnStatus, SalesFormat } from "@/db/schema";
import type { Return as DbReturn, InsertReturn } from "@/db/schema/returns";
import type { ReturnReason } from "./schema";

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
export type { ReturnReason };
export type ReturnFormat = SalesFormat; // Returns use same format enum as sales

/**
 * Title data for returns form autocomplete
 * Similar to TitleForSalesSelect but for returns
 *
 * Story 7.6: Removed has_eisbn - ISBNs are unified without type distinction
 */
export interface TitleForReturnSelect {
  /** Title UUID for form submission */
  id: string;
  /** Title name for display */
  title: string;
  /** Author name for display in autocomplete */
  author_name: string;
  /** Whether title has an ISBN assigned */
  has_isbn: boolean;
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
 * Returns form field values (Story 3.5)
 * Used by React Hook Form for form state
 */
export interface ReturnsFormValues {
  title_id: string;
  format: SalesFormat;
  quantity: number;
  unit_price: string;
  return_date: Date;
  reason: ReturnReason;
  reason_other?: string;
  original_sale_reference?: string;
}

/**
 * Selected title state for the form
 * Stores title info after selection from autocomplete
 *
 * Story 7.6: Removed has_eisbn - ISBNs are unified without type distinction
 */
export interface SelectedTitleForReturn {
  id: string;
  title: string;
  author_name: string;
  has_isbn: boolean;
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
 * Filter parameters for returns history query
 * Story 3.7: AC 3-8 (filtering, sorting, pagination)
 * All filters sync with URL query params
 */
export interface ReturnsHistoryFilters {
  /** Status filter: all, pending, approved, rejected */
  status?: "all" | "pending" | "approved" | "rejected";
  /** Start date for date range filter (ISO format) */
  from_date?: string;
  /** End date for date range filter (ISO format) */
  to_date?: string;
  /** Title name search (debounced 300ms) */
  search?: string;
  /** Format filter: all, physical, ebook, audiobook */
  format?: "all" | "physical" | "ebook" | "audiobook";
  /** Sort column: date, amount, status */
  sort?: "date" | "amount" | "status";
  /** Sort order: asc or desc */
  order?: "asc" | "desc";
  /** Current page number (1-indexed) */
  page?: number;
  /** Items per page */
  pageSize?: number;
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

/**
 * Approval confirmation dialog state
 * Story 3.6: AC 5, 6 - Approve confirmation dialog
 */
export interface ApprovalConfirmData {
  /** Return being approved */
  returnId: string;
  /** Return amount for display */
  amount: string;
  /** Optional internal note */
  internalNote?: string;
}

/**
 * Rejection confirmation dialog state
 * Story 3.6: AC 7, 8 - Reject confirmation dialog
 */
export interface RejectionConfirmData {
  /** Return being rejected */
  returnId: string;
  /** Required rejection reason */
  reason: string;
}
