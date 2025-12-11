/**
 * Royalties Module Types
 *
 * TypeScript interfaces for royalty contracts and tiers.
 * Matches database schema from src/db/schema/contracts.ts
 *
 * Story 4.2: Build Contract Creation Form with Tiered Royalty Configuration
 * Related FRs: FR38-FR40 (Royalty Contract Management)
 */

import type { Author } from "@/db/schema/authors";
import type {
  Contract,
  ContractFormat,
  ContractStatus,
  ContractTier,
} from "@/db/schema/contracts";
import type { Title } from "@/db/schema/titles";

/**
 * Contract with related author, title, and tiers
 * Used for detail views and lists
 * Story 7.3: author is nullable since new contracts use contact_id
 */
export interface ContractWithRelations extends Contract {
  author: Author | null;
  title: Title;
  tiers: ContractTier[];
}

/**
 * Author option for dropdown selection
 */
export interface AuthorOption {
  id: string;
  name: string;
  email: string | null;
}

/**
 * Title option for dropdown selection
 */
export interface TitleOption {
  id: string;
  title: string;
  author_name: string;
}

/**
 * Tier input for form submission
 * Rate is stored as decimal (0.10 = 10%)
 */
export interface TierInput {
  format: ContractFormat;
  min_quantity: number;
  max_quantity: number | null;
  rate: number;
}

/**
 * Contract form data for wizard submission
 */
export interface ContractFormData {
  author_id: string;
  title_id: string;
  status: ContractStatus;
  advance_amount: string;
  advance_paid: string;
  tiers: TierInput[];
}

/**
 * Contract creation result
 * Returned from createContract server action
 */
export interface ContractCreationResult {
  id: string;
  author_name: string;
  title_name: string;
}

/**
 * Paginated contracts list
 */
export interface PaginatedContracts {
  items: ContractWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Re-export schema types for convenience
export type { Contract, ContractTier, ContractFormat, ContractStatus };

// ============================================================================
// Royalty Calculation Types (Story 4.4)
// ============================================================================

/**
 * Net sales data for a single format
 * Aggregates sales and approved returns for royalty calculation
 *
 * Story 4.4 AC 3: Calculate net sales per format (sales - approved returns)
 * Related FRs: FR46 (Net sales calculation)
 */
export interface NetSalesData {
  /** Total quantity sold */
  grossQuantity: number;
  /** Total revenue from sales */
  grossRevenue: number;
  /** Total quantity of approved returns */
  returnsQuantity: number;
  /** Total amount of approved returns */
  returnsAmount: number;
  /** Net quantity after returns (capped at 0) */
  netQuantity: number;
  /** Net revenue after returns (capped at 0) */
  netRevenue: number;
}

/**
 * Breakdown of royalty calculation for a single tier
 * Shows how units were allocated and royalty calculated within a tier
 *
 * Story 4.4 AC 4: Apply tiered rates per format
 * Related FRs: FR47 (Tiered royalty rates)
 */
export interface TierBreakdown {
  /** Tier database ID */
  tierId: string;
  /** Minimum quantity threshold for this tier */
  minQuantity: number;
  /** Maximum quantity threshold (null = infinity) */
  maxQuantity: number | null;
  /** Royalty rate for this tier (0.10 = 10%) */
  rate: number;
  /** Number of units allocated to this tier */
  unitsApplied: number;
  /** Royalty amount earned in this tier */
  royaltyAmount: number;
}

/**
 * Royalty calculation for a single format
 * Contains net sales data and tier-by-tier breakdown
 *
 * Story 4.4 AC 8: Multiple formats supported independently
 * Related FRs: FR51 (Multiple formats with different rates)
 */
export interface FormatCalculation {
  /** Format type: physical, ebook, or audiobook */
  format: ContractFormat;
  /** Net sales data for this format */
  netSales: NetSalesData;
  /** Tier-by-tier breakdown of royalty calculation */
  tierBreakdowns: TierBreakdown[];
  /** Total royalty earned for this format */
  formatRoyalty: number;
}

/**
 * Complete royalty calculation result
 * Returned by calculateRoyaltyForPeriod function
 *
 * Story 4.4 AC 7: Return detailed breakdown
 * Story 10.2: Extended with split calculation support
 * Related FRs: FR52 (Detailed calculation breakdown)
 */
export interface RoyaltyCalculation {
  /** Calculation period */
  period: {
    startDate: Date;
    endDate: Date;
  };
  /** Author receiving royalties (primary author for split calculations) */
  authorId: string;
  /** Contract ID used for calculation */
  contractId: string;
  /** Title ID from contract */
  titleId: string;
  /** Per-format calculation breakdowns */
  formatCalculations: FormatCalculation[];
  /** Total royalty earned across all formats */
  totalRoyaltyEarned: number;
  /** Amount deducted for advance recoupment */
  advanceRecoupment: number;
  /** Net amount payable to author */
  netPayable: number;
  /** Error message if calculation failed */
  error?: string;

  // =========================================================================
  // Story 10.2: Split Calculation Fields
  // =========================================================================

  /**
   * Title-level total royalty before split
   * For single author: equals totalRoyaltyEarned
   * For split calculation: the total that gets divided among co-authors
   *
   * Story 10.2 AC-10.2.7
   */
  titleTotalRoyalty: number;

  /**
   * Whether this is a split calculation (multiple authors)
   * - false: Single author with 100% ownership (backward compatible)
   * - true: Multiple authors with ownership percentages
   *
   * Story 10.2 AC-10.2.8
   */
  isSplitCalculation: boolean;

  /**
   * Per-author breakdown for split calculations
   * - Empty array for single author (isSplitCalculation = false)
   * - Contains breakdown for each co-author when isSplitCalculation = true
   *
   * Story 10.2 AC-10.2.7
   */
  authorSplits: AuthorSplitBreakdown[];
}

/**
 * Result type for calculation that may have failed
 * Used when author has no contract or other error conditions
 *
 * Story 4.4 AC 2: Handle case where no contract exists
 */
export type RoyaltyCalculationResult =
  | { success: true; calculation: RoyaltyCalculation }
  | { success: false; error: string };

// ============================================================================
// Split Royalty Types (Story 10.2)
// ============================================================================

/**
 * Per-author split breakdown for co-authored titles
 *
 * Story 10.2: Implement Split Royalty Calculation Engine
 * AC-10.2.7: Calculation Detail Per-Author Breakdown
 *
 * Each author's split includes their share of the title royalty,
 * individual advance recoupment, and net payable amount.
 */
export interface AuthorSplitBreakdown {
  /** Author's contact ID */
  contactId: string;
  /** Author's contract ID for this title */
  contractId: string;
  /** Ownership percentage (e.g., 60 for 60%) */
  ownershipPercentage: number;
  /** Author's share of title royalty before recoupment */
  splitAmount: number;
  /** Amount recouped from this author's advance */
  recoupment: number;
  /** Net payable to this author */
  netPayable: number;
  /** Author's advance status for context */
  advanceStatus: {
    /** Total advance amount from contract */
    totalAdvance: number;
    /** Amount already recouped before this period */
    previouslyRecouped: number;
    /** Remaining advance after this period's recoupment */
    remainingAfterThisPeriod: number;
  };
}

// ============================================================================
// Royalty Projection Types (Story 10.4)
// ============================================================================

/**
 * Sales velocity data for a contract
 * Used to calculate sales trajectory for projections
 *
 * Story 10.4 AC-10.4.7: Royalty Projection
 */
export interface SalesVelocity {
  /** Average units sold per month */
  unitsPerMonth: number;
  /** Average revenue per month */
  revenuePerMonth: number;
  /** Number of months used in calculation */
  monthsAnalyzed: number;
  /** Start date of analysis period */
  analysisStartDate: Date;
  /** End date of analysis period */
  analysisEndDate: Date;
}

/**
 * Tier crossover projection
 * Estimates when an author will reach the next tier
 *
 * Story 10.4 AC-10.4.7: Project tier crossover dates
 */
export interface TierCrossoverProjection {
  /** Current tier position */
  currentTier: {
    minQuantity: number;
    maxQuantity: number | null;
    rate: number;
  };
  /** Next tier threshold (null if at highest tier) */
  nextTierThreshold: number | null;
  /** Current lifetime sales */
  currentLifetimeSales: number;
  /** Units needed to reach next tier (null if at highest) */
  unitsToNextTier: number | null;
  /** Estimated date to reach next tier (null if at highest or velocity is 0) */
  estimatedCrossoverDate: Date | null;
  /** Months to reach next tier (null if at highest or velocity is 0) */
  monthsToNextTier: number | null;
}

/**
 * Annual royalty projection comparison
 * Compares projected earnings at current tier vs escalated rates
 *
 * Story 10.4 AC-10.4.7: Display projected annual royalty at current rate vs escalated rate
 */
export interface AnnualRoyaltyProjection {
  /** Projected annual sales quantity based on velocity */
  projectedAnnualUnits: number;
  /** Projected annual revenue based on velocity */
  projectedAnnualRevenue: number;
  /** Royalty at current fixed rate (if stayed at current tier) */
  royaltyAtCurrentRate: number;
  /** Royalty with escalation (applying tier transitions) */
  royaltyWithEscalation: number;
  /** Difference (benefit from escalation) */
  escalationBenefit: number;
  /** Current rate being used */
  currentRate: number;
  /** Whether any tier transitions would occur in projection period */
  wouldCrossoverInYear: boolean;
}

/**
 * Complete royalty projection for a contract
 * Combines velocity analysis, tier crossover, and annual comparison
 *
 * Story 10.4 AC-10.4.7: Finance users can view royalty projection
 */
export interface RoyaltyProjection {
  /** Contract ID */
  contractId: string;
  /** Title ID */
  titleId: string;
  /** Sales velocity analysis */
  velocity: SalesVelocity;
  /** Per-format tier crossover projections */
  tierCrossovers: Map<ContractFormat, TierCrossoverProjection>;
  /** Annual royalty projection comparison */
  annualProjection: AnnualRoyaltyProjection;
  /** Projection generated timestamp */
  generatedAt: Date;
  /** Warning messages (e.g., insufficient data) */
  warnings: string[];
}
