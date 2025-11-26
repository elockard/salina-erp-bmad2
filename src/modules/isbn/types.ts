import type { Title, User } from "@/db/schema";
import type { ISBN, ISBNStatus, ISBNType } from "@/db/schema/isbns";

/**
 * Re-export types from schema for convenience
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
 * Aggregates ISBN counts by status and type
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
  /** Breakdown by type */
  byType: {
    physical: number;
    ebook: number;
  };
  /** Breakdown of available by type */
  availableByType: {
    physical: number;
    ebook: number;
  };
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
 * Lightweight type for list views
 */
export interface ISBNListItem {
  id: string;
  isbn_13: string;
  type: ISBNType;
  status: ISBNStatus;
  assignedTitleName: string | null;
  assignedAt: Date | null;
}

/**
 * Result of ISBN assignment to a title
 * Story 2.9 - Smart ISBN Assignment with Row Locking
 */
export interface AssignedISBN {
  /** ISBN record ID */
  id: string;
  /** ISBN-13 value that was assigned */
  isbn_13: string;
  /** Type of ISBN (physical or ebook) */
  type: ISBNType;
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
