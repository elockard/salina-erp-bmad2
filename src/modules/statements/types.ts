/**
 * Statement Module Types
 *
 * TypeScript interfaces for royalty statement calculations and JSONB storage.
 * These types define the structure of the calculations JSONB field in the
 * statements table.
 *
 * Story: 5.1 - Create Statements Database Schema and PDF Storage
 * AC-5.1.2: JSONB calculations field stores full breakdown structure
 *
 * Story 7.3: Migrate Authors to Contacts
 * Author type supports both legacy authors table and contacts table during transition.
 *
 * Related:
 * - src/db/schema/statements.ts (statements.calculations column)
 * - src/modules/royalties/types.ts (similar calculation structures)
 * - tech-spec-epic-5.md (StatementCalculations interface spec)
 */

import type { Author as LegacyAuthor } from "@/db/schema/authors";
import type { Contract, ContractFormat } from "@/db/schema/contracts";
import type { Statement } from "@/db/schema/statements";

/**
 * Author type for statements - supports both legacy and contact-based
 * Story 7.3: During migration transition, this maintains backward compatibility
 * with the legacy authors table while supporting the new contacts table.
 */
export type Author = LegacyAuthor;

/**
 * Tier breakdown within a format calculation
 * Shows how units were allocated and royalty calculated within a tier
 *
 * AC-5.1.2: Part of formatBreakdowns.tierBreakdowns array
 * Story 10.4: Extended with lifetime position fields for lifetime mode
 */
export interface StatementTierBreakdown {
  /** Minimum quantity threshold for this tier */
  tierMinQuantity: number;
  /** Maximum quantity threshold (null = infinity/no limit) */
  tierMaxQuantity: number | null;
  /** Royalty rate for this tier (0.10 = 10%) */
  tierRate: number;
  /** Number of units that fell within this tier */
  quantityInTier: number;
  /** Royalty amount earned in this tier */
  royaltyEarned: number;
  /**
   * Lifetime sales position at start of this tier allocation
   * Story 10.4: Only present for lifetime mode calculations
   */
  lifetimePositionStart?: number;
  /**
   * Lifetime sales position at end of this tier allocation
   * Story 10.4: Only present for lifetime mode calculations
   */
  lifetimePositionEnd?: number;
}

/**
 * Format breakdown in statement calculations
 * Contains sales data and tier-by-tier royalty breakdown for a single format
 *
 * AC-5.1.2: Part of StatementCalculations.formatBreakdowns array
 */
export interface StatementFormatBreakdown {
  /** Format type: physical, ebook, or audiobook */
  format: ContractFormat;
  /** Total quantity sold in this format for the period */
  totalQuantity: number;
  /** Total revenue generated in this format */
  totalRevenue: number;
  /** Tier-by-tier breakdown of royalty calculation */
  tierBreakdowns: StatementTierBreakdown[];
  /** Total royalty earned for this format */
  formatRoyalty: number;
}

/**
 * Advance recoupment details in statement
 * Tracks how advance is being paid back from royalties
 *
 * AC-5.1.2: Part of StatementCalculations.advanceRecoupment
 */
export interface StatementAdvanceRecoupment {
  /** Original advance amount from contract */
  originalAdvance: number;
  /** Amount already recouped from previous statements */
  previouslyRecouped: number;
  /** Amount being recouped from this statement */
  thisPeriodsRecoupment: number;
  /** Remaining advance balance after this statement */
  remainingAdvance: number;
}

/**
 * Lifetime sales context for royalty statements
 * Story 10.4: AC-10.4.6 - Stored in calculations JSONB for display
 *
 * Tracks lifetime sales context when contract uses tier_calculation_mode: 'lifetime'
 */
export interface LifetimeSalesContext {
  /** Tier calculation mode: 'period' (default) or 'lifetime' */
  tierCalculationMode: "period" | "lifetime";
  /** Total lifetime sales quantity before this period (all formats combined) */
  lifetimeSalesBefore: number;
  /** Total lifetime sales quantity after this period (all formats combined) */
  lifetimeSalesAfter: number;
  /** Lifetime revenue before this period */
  lifetimeRevenueBefore: number;
  /** Lifetime revenue after this period */
  lifetimeRevenueAfter: number;
  /** Current tier rate based on lifetime position (highest applicable rate) */
  currentTierRate: number;
  /** Next tier threshold in units (null if at highest tier) */
  nextTierThreshold: number | null;
  /** Units remaining until next tier (null if at highest tier) */
  unitsToNextTier: number | null;
}

/**
 * Per-format lifetime context for detailed breakdown
 * Story 10.4: Tracks lifetime position per format
 */
export interface FormatLifetimeContext {
  /** Format this context applies to */
  format: ContractFormat;
  /** Lifetime sales for this format before this period */
  lifetimeSalesBefore: number;
  /** Lifetime sales for this format after this period */
  lifetimeSalesAfter: number;
  /** Current tier based on this format's lifetime position */
  currentTierRate: number;
}

/**
 * Split calculation context for co-authored title statements
 * Story 10.3: Stored in calculations JSONB for display
 *
 * AC-10.3.4: Include splitCalculation object in calculations JSONB field
 */
export interface SplitCalculationContext {
  /** Total royalty for title before split */
  titleTotalRoyalty: number;
  /** This author's ownership percentage (e.g., 60 for 60%) */
  ownershipPercentage: number;
  /** Indicates split calculation statement - discriminant for type narrowing */
  isSplitCalculation: true;
}

/**
 * Complete statement calculations stored in JSONB column
 * Contains full breakdown of royalty calculation for audit and display
 *
 * AC-5.1.2: JSONB calculations field stores full breakdown structure
 * - period: Statement period dates
 * - formatBreakdowns: Per-format sales and royalty breakdown
 * - returnsDeduction: Amount deducted for approved returns
 * - grossRoyalty: Total royalty before recoupment
 * - advanceRecoupment: Advance payback details
 * - netPayable: Final amount payable to author
 *
 * Story 10.3: Added splitCalculation for co-authored titles
 * - splitCalculation: Context about ownership split (optional)
 */
export interface StatementCalculations {
  /** Statement period dates */
  period: {
    /** Start date of period (ISO string format) */
    startDate: string;
    /** End date of period (ISO string format) */
    endDate: string;
  };
  /** Per-format breakdown of sales and royalty calculations */
  formatBreakdowns: StatementFormatBreakdown[];
  /** Amount deducted for approved returns during period */
  returnsDeduction: number;
  /** Gross royalty earned before recoupment */
  grossRoyalty: number;
  /** Advance recoupment details */
  advanceRecoupment: StatementAdvanceRecoupment;
  /** Net amount payable to author after recoupment */
  netPayable: number;
  /**
   * Split calculation context for co-authored titles
   * Story 10.3: AC-10.3.4 - Present when this is a split statement
   * Undefined for single-author titles
   */
  splitCalculation?: SplitCalculationContext;
  /**
   * Lifetime sales context for escalating royalty rates
   * Story 10.4: AC-10.4.6 - Present when contract uses tier_calculation_mode: 'lifetime'
   * Undefined for period-based (default) contracts
   */
  lifetimeContext?: LifetimeSalesContext;
}

/**
 * Contact type for statements (Story 7.3)
 * Used for new statements created with contact_id
 */
export interface StatementContact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  address: string | null;
}

/**
 * Statement with related entities for detail views
 * Story 7.3: author is nullable (legacy), contact is the new relation
 */
export interface StatementWithRelations extends Statement {
  /** @deprecated Use contact instead - nullable during migration */
  author: Author | null;
  /** Contact with author role (Story 7.3) */
  contact: StatementContact | null;
  contract: Contract;
}

/**
 * Paginated statements list result
 */
export interface PaginatedStatements {
  items: StatementWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Statement generation request parameters
 * Note: Dates can be Date or string due to server action serialization
 */
export interface StatementGenerationRequest {
  /** Start of royalty period */
  periodStart: Date | string;
  /** End of royalty period */
  periodEnd: Date | string;
  /** Author IDs to generate statements for (empty = all authors) */
  authorIds: string[];
  /** Whether to send email after generation */
  sendEmail: boolean;
}

/**
 * Statement generation job result
 */
export interface StatementGenerationResult {
  /** Inngest job ID */
  jobId: string;
  /** Number of authors included in generation */
  authorCount: number;
}

/**
 * PDF Generation Types
 *
 * Story: 5.2 - Implement PDF Statement Generation
 * Task 7: Create type definitions
 */

/**
 * Data structure for PDF template rendering
 * Maps StatementCalculations and related data for PDF generation
 *
 * AC-5.2.1: Author information, period dates
 * AC-5.2.2: Summary section data
 * AC-5.2.3: Sales breakdown data
 * AC-5.2.4: Returns data
 * AC-5.2.5: Advance recoupment data
 */
export interface StatementPDFData {
  /** Unique statement ID for footer */
  statementId: string;
  /** Title name for sales breakdown table */
  titleName: string;
  /** Author information for header */
  author: {
    name: string;
    address: string | null;
    email: string | null;
  };
  /** Full calculation breakdown */
  calculations: StatementCalculations;
}

/**
 * Result from PDF generation operation
 */
export interface PDFGenerationResult {
  /** Whether generation succeeded */
  success: boolean;
  /** S3 key where PDF was uploaded (on success) */
  s3Key?: string;
  /** Error message (on failure) */
  error?: string;
}

/**
 * Statement with all related data needed for PDF generation
 */
export interface StatementWithDetails extends Statement {
  author: {
    id: string;
    name: string;
    address: string | null;
    email: string | null;
  };
  contract: {
    id: string;
    title_id: string;
  };
  title: {
    id: string;
    title: string;
  };
}

/**
 * Wizard Types
 *
 * Story: 5.3 - Build Statement Generation Wizard for Finance
 */

/**
 * Author with pending royalties estimate for wizard selection
 * AC-5.3.3: Author selection with pending royalties display
 */
export interface AuthorWithPendingRoyalties {
  id: string;
  name: string;
  email: string | null;
  /** Estimated pending royalty amount for display in selection */
  pendingRoyalties: number;
}

/**
 * Preview calculation data for a single author
 * AC-5.3.4: Preview step shows calculation estimates
 */
export interface PreviewCalculation {
  authorId: string;
  authorName: string;
  /** Total sales quantity for period */
  totalSales: number;
  /** Total returns quantity for period */
  totalReturns: number;
  /** Gross royalty earned */
  royaltyEarned: number;
  /** Amount recouped from advance */
  advanceRecouped: number;
  /** Net amount payable */
  netPayable: number;
  /** Warning flags for edge cases */
  warnings: PreviewWarning[];
  /**
   * Story 10.3: AC-10.3.7 - Co-author context for preview
   * Present when this is a co-authored title
   */
  coAuthorInfo?: {
    /** This author's ownership percentage */
    ownershipPercentage: number;
    /** Title name for context */
    titleName: string;
  };
}

/**
 * Warning types for preview edge cases
 * AC-5.3.4: Warning callouts for edge cases
 */
export type PreviewWarningType =
  | "negative_net" // Returns exceed royalties
  | "zero_net" // Fully recouped advance
  | "no_sales"; // No sales in period

export interface PreviewWarning {
  type: PreviewWarningType;
  message: string;
}

/**
 * Aggregated preview totals
 */
export interface PreviewTotals {
  totalSales: number;
  totalReturns: number;
  totalRoyaltyEarned: number;
  totalAdvanceRecouped: number;
  totalNetPayable: number;
  authorCount: number;
  warningCount: number;
}

// Re-export schema types for convenience
export type {
  InsertStatement,
  Statement,
  StatementStatus,
} from "@/db/schema/statements";
