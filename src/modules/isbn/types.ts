import type { Title, User } from "@/db/schema";
import type { ISBN, ISBNStatus, ISBNType } from "@/db/schema/isbns";

/**
 * Re-export types from schema for convenience
 * Story 7.6: ISBNType is deprecated - ISBNs are unified without type distinction
 */
export type { ISBN, ISBNStatus, ISBNType };

/**
 * ISBN with related title and user data
 * Used when querying ISBNs with relational data included
 */
export interface ISBNWithRelations extends ISBN {
  assignedTitle: Title | null;
  assignedByUser: User | null;
}

/**
 * ISBN pool statistics for dashboard display
 * Story 7.6: Removed byType and availableByType - ISBNs are unified without type distinction
 */
export interface ISBNPoolStats {
  /** Total ISBNs in pool */
  total: number;
  /** Count of available ISBNs */
  available: number;
  /** Count of assigned ISBNs */
  assigned: number;
  /** Count of registered ISBNs */
  registered: number;
  /** Count of retired ISBNs */
  retired: number;
}

/**
 * ISBN assignment result
 * Returned after successfully assigning ISBN to a title
 */
export interface ISBNAssignmentResult {
  isbn: ISBN;
  previousStatus: ISBNStatus;
  assignedAt: Date;
}

/**
 * ISBN import result for batch operations
 */
export interface ISBNImportResult {
  /** Number of ISBNs successfully imported */
  imported: number;
  /** Number of ISBNs that were duplicates (skipped) */
  duplicates: number;
  /** Number of ISBNs that failed validation */
  errors: number;
  /** Details of failed records */
  errorDetails: Array<{
    isbn_13: string;
    error: string;
  }>;
}

/**
 * ISBN list item for display
 * Story 7.6: Removed type field - ISBNs are unified without type distinction
 */
export interface ISBNListItem {
  id: string;
  isbn_13: string;
  status: ISBNStatus;
  assignedTitleName: string | null;
  assignedAt: Date | null;
  /** Prefix ID if ISBN was generated from a prefix (null for legacy imports) */
  prefixId: string | null;
  /** Formatted prefix for display (e.g., "978-1-234567") */
  prefixName: string | null;
}

/**
 * Result of ISBN assignment to a title
 * Story 7.6: Removed type field - ISBNs are unified without type distinction
 */
export interface AssignedISBN {
  /** ISBN record ID */
  id: string;
  /** ISBN-13 value that was assigned */
  isbn_13: string;
  /** Title ID the ISBN was assigned to */
  titleId: string;
  /** Title name for display */
  titleName: string;
  /** Timestamp when assignment occurred */
  assignedAt: Date;
  /** User ID who performed the assignment */
  assignedByUserId: string;
}

/**
 * Preview of next available ISBN for assignment modal
 * Story 2.9 AC 1 - Modal shows next available ISBN preview
 */
export interface NextAvailableISBNPreview {
  /** ISBN-13 that will be assigned */
  isbn_13: string;
  /** ISBN record ID */
  id: string;
  /** Count of available ISBNs for this format */
  availableCount: number;
}
