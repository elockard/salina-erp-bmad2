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
 */
export interface ContractWithRelations extends Contract {
  author: Author;
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
 * Related FRs: FR52 (Detailed calculation breakdown)
 */
export interface RoyaltyCalculation {
  /** Calculation period */
  period: {
    startDate: Date;
    endDate: Date;
  };
  /** Author receiving royalties */
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
