/**
 * Royalty Calculation Engine
 *
 * Core calculation engine for computing royalties based on contract terms.
 * Implements tiered royalty rate application with advance recoupment.
 *
 * Story 4.4: Implement Tiered Royalty Calculation Engine
 * Related FRs: FR45-FR52 (Royalty Calculation Engine)
 *
 * IMPORTANT: This is a PURE CALCULATION function.
 * - Does NOT persist any results to database
 * - Does NOT update advance_recouped (caller handles persistence)
 * - Returns detailed breakdown for statement generation
 *
 * Architecture Reference:
 * - architecture.md Pattern 1: Tiered Royalty Calculation Engine
 * - ALWAYS use Decimal.js for ALL financial calculations
 */

import Decimal from "decimal.js";
import type { ContractFormat, ContractTier } from "@/db/schema/contracts";
import {
  type FormatSalesData,
  getApprovedReturnsByFormatForPeriod,
  getApprovedReturnsByFormatForPeriodAdmin,
  getContractByAuthorAndTenant,
  getContractByAuthorAndTenantAdmin,
  getLifetimeSalesByFormatBeforeDate,
  getLifetimeSalesByFormatBeforeDateAdmin,
  getSalesByFormatForPeriod,
  getSalesByFormatForPeriodAdmin,
  getTitleAuthorsWithContracts,
  getTitleAuthorsWithContractsAdmin,
  type LifetimeSalesData,
} from "./queries";
import type {
  ContractWithRelations,
  FormatCalculation,
  NetSalesData,
  RoyaltyCalculation,
  RoyaltyCalculationResult,
  TierBreakdown,
} from "./types";

/**
 * Calculate royalty for a specific author and period
 *
 * Story 4.4 AC 1: Function signature - calculateRoyaltyForPeriod
 *
 * @param authorId - Author UUID
 * @param tenantId - Tenant UUID
 * @param startDate - Period start date (inclusive)
 * @param endDate - Period end date (inclusive)
 * @returns RoyaltyCalculationResult with success/failure and calculation details
 */
export async function calculateRoyaltyForPeriod(
  authorId: string,
  tenantId: string,
  startDate: Date,
  endDate: Date,
): Promise<RoyaltyCalculationResult> {
  // Step 1: Load contract with all tiered rates (AC 2)
  const contract = await getContractByAuthorAndTenant(authorId, tenantId);

  if (!contract) {
    return {
      success: false,
      error: `No active contract found for author ${authorId} in tenant ${tenantId}`,
    };
  }

  // Step 2: Calculate net sales per format (AC 3)
  const [salesByFormat, returnsByFormat] = await Promise.all([
    getSalesByFormatForPeriod(tenantId, contract.title_id, startDate, endDate),
    getApprovedReturnsByFormatForPeriod(
      tenantId,
      contract.title_id,
      startDate,
      endDate,
    ),
  ]);

  // Group tiers by format for efficient lookup
  const tiersByFormat = groupTiersByFormat(contract.tiers);

  // Calculate for each format
  const formatCalculations: FormatCalculation[] = [];
  let totalRoyaltyEarned = new Decimal(0);

  // Get all unique formats from sales, returns, and tiers
  const allFormats = new Set<ContractFormat>([
    ...salesByFormat.map((s) => s.format),
    ...returnsByFormat.map((r) => r.format),
    ...(Object.keys(tiersByFormat) as ContractFormat[]),
  ]);

  for (const format of allFormats) {
    const salesData = salesByFormat.find((s) => s.format === format);
    const returnsData = returnsByFormat.find((r) => r.format === format);
    const formatTiers = tiersByFormat[format] || [];

    // Calculate net sales for this format (AC 3, 6)
    const netSales = calculateNetSales(salesData, returnsData);

    // Apply tiered rates (AC 4, 8)
    const { tierBreakdowns, formatRoyalty } = applyTieredRates(
      netSales,
      formatTiers,
    );

    formatCalculations.push({
      format,
      netSales,
      tierBreakdowns,
      formatRoyalty: formatRoyalty.toNumber(),
    });

    totalRoyaltyEarned = totalRoyaltyEarned.plus(formatRoyalty);
  }

  // Step 4: Calculate advance recoupment (AC 5)
  const { advanceRecoupment, netPayable } = calculateAdvanceRecoupment(
    contract,
    totalRoyaltyEarned,
  );

  // Step 6: Return detailed breakdown (AC 7)
  // Story 10.2: Include split calculation fields for backward compatibility
  const calculation: RoyaltyCalculation = {
    period: {
      startDate,
      endDate,
    },
    authorId,
    contractId: contract.id,
    titleId: contract.title_id,
    formatCalculations,
    totalRoyaltyEarned: totalRoyaltyEarned.toNumber(),
    advanceRecoupment: advanceRecoupment.toNumber(),
    netPayable: netPayable.toNumber(),
    // Story 10.2: Single author = no split calculation
    titleTotalRoyalty: totalRoyaltyEarned.toNumber(),
    isSplitCalculation: false,
    authorSplits: [],
  };

  return {
    success: true,
    calculation,
  };
}

/**
 * Group contract tiers by format for efficient lookup
 *
 * @param tiers - Array of contract tiers
 * @returns Map of format to tiers (sorted by min_quantity ascending)
 */
function groupTiersByFormat(
  tiers: ContractTier[],
): Record<ContractFormat, ContractTier[]> {
  const result: Partial<Record<ContractFormat, ContractTier[]>> = {};

  for (const tier of tiers) {
    const format = tier.format as ContractFormat;
    if (!result[format]) {
      result[format] = [];
    }
    result[format]?.push(tier);
  }

  // Sort each format's tiers by min_quantity ascending
  for (const format of Object.keys(result) as ContractFormat[]) {
    result[format]?.sort((a, b) => a.min_quantity - b.min_quantity);
  }

  return result as Record<ContractFormat, ContractTier[]>;
}

/**
 * Calculate net sales from gross sales and approved returns
 *
 * Story 4.4 AC 3: Calculate net: sales_quantity - approved_returns_quantity per format
 * Story 4.4 AC 6: Handle negative periods - cap at zero (FR50)
 *
 * @param salesData - Sales aggregation for format (may be undefined)
 * @param returnsData - Returns aggregation for format (may be undefined)
 * @returns NetSalesData with all values
 */
function calculateNetSales(
  salesData: FormatSalesData | undefined,
  returnsData: FormatSalesData | undefined,
): NetSalesData {
  const grossQuantity = new Decimal(salesData?.totalQuantity || 0);
  const grossRevenue = new Decimal(salesData?.totalAmount || 0);
  const returnsQuantity = new Decimal(returnsData?.totalQuantity || 0);
  const returnsAmount = new Decimal(returnsData?.totalAmount || 0);

  // Calculate net values, capping at zero (AC 6, FR50)
  const netQuantity = Decimal.max(grossQuantity.minus(returnsQuantity), 0);
  const netRevenue = Decimal.max(grossRevenue.minus(returnsAmount), 0);

  return {
    grossQuantity: grossQuantity.toNumber(),
    grossRevenue: grossRevenue.toNumber(),
    returnsQuantity: returnsQuantity.toNumber(),
    returnsAmount: returnsAmount.toNumber(),
    netQuantity: netQuantity.toNumber(),
    netRevenue: netRevenue.toNumber(),
  };
}

/**
 * Lifetime context for tier calculation
 *
 * Story 10.4: Implement Escalating Lifetime Royalty Rates
 * Used when tier_calculation_mode is 'lifetime' to determine
 * tier positioning based on cumulative sales history.
 */
export interface LifetimeContext {
  /** Lifetime quantity sold BEFORE this period */
  lifetimeQuantityBefore: number;
  /** Lifetime revenue BEFORE this period */
  lifetimeRevenueBefore: number;
}

/**
 * Apply tiered royalty rates to net sales
 *
 * Story 4.4 AC 4: Apply tiered rates per format
 * Story 10.4 AC 10.4.3: Lifetime Tier Calculation Engine
 *
 * - Sort tiers by min_quantity ascending
 * - Iterate through tiers, allocating units to each tier
 * - Apply tier rate to units within tier range
 * - Handle max_quantity = null as infinity
 * - Use Decimal.js for all financial math
 *
 * For lifetime mode (when lifetimeContext is provided):
 * - Start tier position based on lifetimeQuantityBefore
 * - Current period sales escalate through remaining tier capacity
 * - Handle mid-period tier transitions correctly
 *
 * Royalty calculation formula per tier:
 * tier_royalty = (units_in_tier / total_units) * net_revenue * rate
 *
 * @param netSales - Net sales data for format (current period only)
 * @param tiers - Sorted tiers for format
 * @param lifetimeContext - Optional lifetime context for lifetime tier mode
 * @returns Tier breakdowns and total format royalty
 */
function applyTieredRates(
  netSales: NetSalesData,
  tiers: ContractTier[],
  lifetimeContext?: LifetimeContext,
): { tierBreakdowns: TierBreakdown[]; formatRoyalty: Decimal } {
  const tierBreakdowns: TierBreakdown[] = [];
  let formatRoyalty = new Decimal(0);

  // If no net sales or no tiers, return empty result
  if (netSales.netQuantity <= 0 || tiers.length === 0) {
    return { tierBreakdowns, formatRoyalty };
  }

  const currentPeriodUnits = new Decimal(netSales.netQuantity);
  const netRevenue = new Decimal(netSales.netRevenue);

  // Story 10.4: For lifetime mode, we need to:
  // 1. Calculate starting position based on lifetime sales before this period
  // 2. Apply current period units starting from that position
  // 3. Handle mid-period tier transitions (AC-10.4.4)
  const lifetimeStartPosition = lifetimeContext
    ? new Decimal(lifetimeContext.lifetimeQuantityBefore)
    : new Decimal(0);

  // Total lifetime position after this period = lifetime before + current period
  const lifetimeEndPosition = lifetimeStartPosition.plus(currentPeriodUnits);

  // Track units remaining to allocate from current period
  let currentUnitsRemaining = currentPeriodUnits;

  for (const tier of tiers) {
    // Stop if all current period units have been allocated
    if (currentUnitsRemaining.lte(0)) {
      break;
    }

    const minQty = new Decimal(tier.min_quantity);
    const maxQty =
      tier.max_quantity !== null
        ? new Decimal(tier.max_quantity)
        : new Decimal(Number.MAX_SAFE_INTEGER); // null = infinity

    const rate = new Decimal(tier.rate);

    // Story 10.4: Calculate how many current period units fall into this tier
    // considering lifetime position
    //
    // For lifetime mode:
    // - If lifetime position is already past this tier, skip it
    // - If lifetime position is within this tier, allocate remaining capacity
    // - If lifetime position hasn't reached this tier yet, check if current period reaches it

    let unitsInTier: Decimal;

    if (lifetimeContext) {
      // LIFETIME MODE: Consider lifetime position
      //
      // Tier range: [minQty, maxQty]
      // Current window: [lifetimeStartPosition, lifetimeEndPosition)
      //
      // Units in this tier from current period =
      //   overlap between current window and tier range

      // Skip tier if lifetime position already past max
      if (lifetimeStartPosition.gt(maxQty)) {
        continue;
      }

      // Skip tier if current period doesn't reach min
      if (lifetimeEndPosition.lte(minQty)) {
        continue;
      }

      // Calculate overlap
      // Start of overlap = max(lifetimeStartPosition, minQty)
      // End of overlap = min(lifetimeEndPosition, maxQty + 1)
      const overlapStart = Decimal.max(lifetimeStartPosition, minQty);
      const overlapEnd = Decimal.min(lifetimeEndPosition, maxQty.plus(1));

      unitsInTier = Decimal.max(overlapEnd.minus(overlapStart), 0);
    } else {
      // PERIOD MODE: Original behavior (backward compatible)
      if (tier.min_quantity === 0) {
        // First tier: allocate units from 0 to max_quantity (inclusive)
        const tierCapacity = maxQty.plus(1);
        unitsInTier = Decimal.min(currentUnitsRemaining, tierCapacity);
      } else {
        // Subsequent tiers: check if we have units above min_quantity
        const unitsAboveMin = currentPeriodUnits.minus(minQty);
        if (unitsAboveMin.lte(0)) {
          // Total units don't reach this tier
          break;
        }

        // Calculate tier capacity (exclusive of lower tiers)
        const tierCapacity =
          tier.max_quantity !== null
            ? maxQty.minus(minQty).plus(1)
            : new Decimal(Number.MAX_SAFE_INTEGER);

        // Units for this tier = min(units above min, tier capacity, units remaining)
        const unitsQualifying = Decimal.min(unitsAboveMin, tierCapacity);
        unitsInTier = Decimal.min(unitsQualifying, currentUnitsRemaining);
      }
    }

    if (unitsInTier.gt(0)) {
      // Calculate royalty for this tier
      // Formula: (units_in_tier / total_units) * net_revenue * rate
      const tierRoyalty = unitsInTier
        .dividedBy(currentPeriodUnits)
        .times(netRevenue)
        .times(rate);

      tierBreakdowns.push({
        tierId: tier.id,
        minQuantity: tier.min_quantity,
        maxQuantity: tier.max_quantity,
        rate: rate.toNumber(),
        unitsApplied: unitsInTier.toNumber(),
        royaltyAmount: tierRoyalty.toNumber(),
      });

      formatRoyalty = formatRoyalty.plus(tierRoyalty);
      currentUnitsRemaining = currentUnitsRemaining.minus(unitsInTier);
    }
  }

  return { tierBreakdowns, formatRoyalty };
}

/**
 * Calculate advance recoupment from total royalty earned
 *
 * Story 4.4 AC 5: Calculate advance recoupment
 * - Recoupment = min(total_royalty_earned, remaining_advance_balance)
 * - Net payable = total_royalty_earned - recoupment
 * - DO NOT update advance_recouped in this function (dry run)
 *
 * Story 4.4 AC 6: Handle negative periods
 * - Net payable minimum is zero
 * - No reversal of already-recouped advances
 *
 * @param contract - Contract with advance details
 * @param totalRoyaltyEarned - Total royalty earned across all formats
 * @returns Recoupment amount and net payable
 */
function calculateAdvanceRecoupment(
  contract: ContractWithRelations,
  totalRoyaltyEarned: Decimal,
): { advanceRecoupment: Decimal; netPayable: Decimal } {
  const advanceAmount = new Decimal(contract.advance_amount || "0");
  const advanceRecouped = new Decimal(contract.advance_recouped || "0");

  // Calculate remaining advance balance
  const remainingAdvance = Decimal.max(advanceAmount.minus(advanceRecouped), 0);

  // Recoupment = min(total_royalty, remaining_advance)
  // Cannot recoup more than earned, and cannot recoup more than remaining
  const recoupment = Decimal.min(totalRoyaltyEarned, remainingAdvance);

  // Net payable = total_royalty - recoupment (capped at 0)
  const netPayable = Decimal.max(totalRoyaltyEarned.minus(recoupment), 0);

  return {
    advanceRecoupment: recoupment,
    netPayable,
  };
}

// ============================================================================
// Story 10.2: Split Royalty Calculation Functions
// ============================================================================

/**
 * Minimal author info needed for split calculation
 * Story 10.2: AC-10.2.2
 */
export interface TitleAuthorForSplit {
  contactId: string;
  ownershipPercentage: number;
}

/**
 * Result of splitting royalty by ownership
 * Story 10.2: AC-10.2.2
 */
export interface OwnershipSplit {
  contactId: string;
  ownershipPercentage: number;
  splitAmount: number;
}

/**
 * Split total royalty by ownership percentages
 *
 * Story 10.2 AC-10.2.2: Split Royalty by Ownership Percentage
 * Story 10.2 AC-10.2.5: Handle negative periods (cap at zero)
 *
 * Uses Decimal.js for precision. Splits must sum to total.
 *
 * @param totalRoyalty - Total royalty to split (Decimal)
 * @param titleAuthors - Authors with ownership percentages
 * @returns Array of splits with contactId and splitAmount
 */
export function splitRoyaltyByOwnership(
  totalRoyalty: Decimal,
  titleAuthors: TitleAuthorForSplit[],
): OwnershipSplit[] {
  // AC-10.2.5: If total royalty is zero or negative, all splits are zero
  if (totalRoyalty.lte(0)) {
    return titleAuthors.map((author) => ({
      contactId: author.contactId,
      ownershipPercentage: author.ownershipPercentage,
      splitAmount: 0,
    }));
  }

  // Calculate each author's split using Decimal.js for precision
  const splits: OwnershipSplit[] = titleAuthors.map((author) => {
    // splitAmount = totalRoyalty * (ownershipPercentage / 100)
    const percentage = new Decimal(author.ownershipPercentage).dividedBy(100);
    const splitAmount = totalRoyalty.times(percentage);

    return {
      contactId: author.contactId,
      ownershipPercentage: author.ownershipPercentage,
      splitAmount: splitAmount.toNumber(),
    };
  });

  // AC-10.2.2: Verify splits sum to total (within precision tolerance)
  // Using Decimal.js to verify sum matches total
  const splitSum = splits.reduce(
    (sum, s) => sum.plus(new Decimal(s.splitAmount)),
    new Decimal(0),
  );

  // Allow for small floating point precision differences (< 0.01)
  // This tolerance accounts for decimal representation in JavaScript
  const difference = splitSum.minus(totalRoyalty).abs();
  if (difference.gt(0.01)) {
    // Financial precision mismatch is a critical error - throw rather than log
    throw new Error(
      `[splitRoyaltyByOwnership] Split sum ${splitSum.toNumber()} differs from total ${totalRoyalty.toNumber()} by ${difference.toNumber()}. Ownership percentages may not sum to 100%.`,
    );
  }

  return splits;
}

/**
 * Contract info needed for recoupment calculation
 * Story 10.2: AC-10.2.3
 */
export interface AuthorContractForRecoupment {
  advanceAmount: number | string;
  advancePaid: number | string;
  advanceRecouped: number | string;
}

/**
 * Result of author recoupment calculation
 * Story 10.2: AC-10.2.3
 */
export interface AuthorRecoupmentResult {
  recoupment: number;
  netPayable: number;
  advanceStatus: {
    totalAdvance: number;
    previouslyRecouped: number;
    remainingAfterThisPeriod: number;
  };
}

/**
 * Calculate advance recoupment for a single author's split
 *
 * Story 10.2 AC-10.2.3: Per-Author Advance Recoupment
 * Story 10.2 AC-10.2.4: Handle fully recouped advance
 * Story 10.2 AC-10.2.6: Different advance amounts per author
 *
 * Uses same recoupment logic as existing calculator but per-author.
 * Recoupment = min(author_split, remaining_advance)
 * NetPayable = author_split - recoupment
 *
 * @param authorSplitAmount - Author's share of title royalty (Decimal)
 * @param contract - Contract with advance details
 * @returns Recoupment amount, net payable, and advance status
 */
export function calculateAuthorRecoupment(
  authorSplitAmount: Decimal,
  contract: AuthorContractForRecoupment,
): AuthorRecoupmentResult {
  // Handle string values from database
  const advanceAmount = new Decimal(contract.advanceAmount || "0");
  const advanceRecouped = new Decimal(contract.advanceRecouped || "0");

  // Calculate remaining advance balance
  const remainingAdvance = Decimal.max(advanceAmount.minus(advanceRecouped), 0);

  // Recoupment = min(author_split, remaining_advance)
  // Cannot recoup more than earned, and cannot recoup more than remaining
  const recoupment = Decimal.min(authorSplitAmount, remainingAdvance);

  // Net payable = split - recoupment (capped at 0)
  const netPayable = Decimal.max(authorSplitAmount.minus(recoupment), 0);

  // Calculate remaining after this period's recoupment
  const remainingAfterThisPeriod = Decimal.max(
    remainingAdvance.minus(recoupment),
    0,
  );

  return {
    recoupment: recoupment.toNumber(),
    netPayable: netPayable.toNumber(),
    advanceStatus: {
      totalAdvance: advanceAmount.toNumber(),
      previouslyRecouped: advanceRecouped.toNumber(),
      remainingAfterThisPeriod: remainingAfterThisPeriod.toNumber(),
    },
  };
}

// ============================================================================
// Task 4: Multi-Author Split Building Function
// ============================================================================

/**
 * Author data needed for building multi-author splits
 * Story 10.2: AC-10.2.1
 */
export interface AuthorDataForSplit {
  contactId: string;
  ownershipPercentage: number;
  contract: {
    id: string;
    advance_amount: string | number;
    advance_paid: string | number; // Actual amount paid (may differ from advance_amount)
    advance_recouped: string | number;
  };
}

/**
 * Build complete author splits with recoupment for multi-author titles
 *
 * Story 10.2 AC-10.2.1: Multi-Author Split Calculation
 * Story 10.2 AC-10.2.7: Calculation Detail Per-Author Breakdown
 *
 * Combines splitRoyaltyByOwnership and calculateAuthorRecoupment
 * to build complete AuthorSplitBreakdown for each author.
 *
 * @param titleTotalRoyalty - Total royalty for the title (Decimal)
 * @param authorData - Authors with ownership percentages and contracts
 * @returns Array of AuthorSplitBreakdown for each author
 */
export function buildMultiAuthorSplits(
  titleTotalRoyalty: Decimal,
  authorData: AuthorDataForSplit[],
): import("./types").AuthorSplitBreakdown[] {
  // First, split royalty by ownership
  const titleAuthors: TitleAuthorForSplit[] = authorData.map((a) => ({
    contactId: a.contactId,
    ownershipPercentage: a.ownershipPercentage,
  }));

  const ownershipSplits = splitRoyaltyByOwnership(
    titleTotalRoyalty,
    titleAuthors,
  );

  // Build complete breakdown for each author with recoupment
  const authorSplits: import("./types").AuthorSplitBreakdown[] = authorData.map(
    (author, index) => {
      const ownershipSplit = ownershipSplits[index];
      const splitAmountDecimal = new Decimal(ownershipSplit.splitAmount);

      // Calculate recoupment for this author's contract
      const recoupmentResult = calculateAuthorRecoupment(splitAmountDecimal, {
        advanceAmount: author.contract.advance_amount,
        advancePaid: author.contract.advance_paid,
        advanceRecouped: author.contract.advance_recouped,
      });

      return {
        contactId: author.contactId,
        contractId: author.contract.id,
        ownershipPercentage: author.ownershipPercentage,
        splitAmount: ownershipSplit.splitAmount,
        recoupment: recoupmentResult.recoupment,
        netPayable: recoupmentResult.netPayable,
        advanceStatus: recoupmentResult.advanceStatus,
      };
    },
  );

  return authorSplits;
}

// ============================================================================
// Title-Level Split Royalty Calculation (Story 10.2)
// ============================================================================

/**
 * Result type for split royalty calculation
 * Story 10.2: AC-10.2.1, AC-10.2.9
 */
export type SplitRoyaltyCalculationResult =
  | { success: true; calculation: RoyaltyCalculation }
  | { success: false; error: string; missingContractAuthors?: string[] };

/**
 * Calculate split royalty for a title with multiple authors (Admin mode)
 *
 * Story 10.2 AC-10.2.1: Multi-Author Split Calculation
 * Story 10.2 AC-10.2.9: Error if any author lacks contract
 * Story 10.2 AC-10.2.10: Atomic failure handling
 *
 * This is the main entry point for calculating royalties on titles with
 * multiple authors. It orchestrates:
 * 1. Fetching title authors with their contracts
 * 2. Calculating title-level royalty using primary author's contract tiers
 * 3. Splitting royalty by ownership percentages
 * 4. Applying per-author advance recoupment
 *
 * @param titleId - Title UUID
 * @param tenantId - Tenant UUID
 * @param startDate - Period start date (inclusive)
 * @param endDate - Period end date (inclusive)
 * @returns SplitRoyaltyCalculationResult with calculation or error
 */
export async function calculateSplitRoyaltyForTitleAdmin(
  titleId: string,
  tenantId: string,
  startDate: Date,
  endDate: Date,
): Promise<SplitRoyaltyCalculationResult> {
  // Step 1: Get all title authors with their contracts (using static import)
  const titleAuthors = await getTitleAuthorsWithContractsAdmin(
    titleId,
    tenantId,
  );

  // Handle no authors case
  if (titleAuthors.length === 0) {
    return {
      success: false,
      error: `No authors found for title ${titleId}`,
    };
  }

  // Step 2: Check all authors have contracts (AC-10.2.9)
  const authorsWithoutContracts = titleAuthors.filter(
    (a) => a.contract === null,
  );
  if (authorsWithoutContracts.length > 0) {
    const missingNames = authorsWithoutContracts.map((a) => a.contactName);
    return {
      success: false,
      error: `Cannot calculate split royalty: ${authorsWithoutContracts.length} author(s) lack contracts: ${missingNames.join(", ")}`,
      missingContractAuthors: authorsWithoutContracts.map((a) => a.contactId),
    };
  }

  // Step 3: Find primary author (or first author as fallback)
  // At this point, all authors have contracts (validated in Step 2)
  const primaryAuthor =
    titleAuthors.find((a) => a.isPrimary) || titleAuthors[0];
  const primaryContract = primaryAuthor.contract;
  if (!primaryContract) {
    // This should never happen due to Step 2 validation, but satisfies linter
    return {
      success: false,
      error: "Primary author contract unexpectedly null after validation",
    };
  }

  // Step 4: Calculate title-level royalty using primary contract's tiers (using static imports)
  const [salesByFormat, returnsByFormat] = await Promise.all([
    getSalesByFormatForPeriodAdmin(tenantId, titleId, startDate, endDate),
    getApprovedReturnsByFormatForPeriodAdmin(
      tenantId,
      titleId,
      startDate,
      endDate,
    ),
  ]);

  // Group tiers by format for efficient lookup
  const tiersByFormat = groupTiersByFormat(primaryContract.tiers);

  // Story 10.4: Check if contract uses lifetime tier calculation mode
  const isLifetimeMode = primaryContract.tier_calculation_mode === "lifetime";

  // Story 10.4: Fetch lifetime sales if needed (AC-10.4.8)
  let lifetimeSalesByFormat: Map<ContractFormat, LifetimeSalesData> | null =
    null;
  if (isLifetimeMode) {
    lifetimeSalesByFormat = await getLifetimeSalesByFormatBeforeDateAdmin(
      tenantId,
      titleId,
      startDate,
    );
  }

  // Calculate for each format
  const formatCalculations: FormatCalculation[] = [];
  let titleTotalRoyalty = new Decimal(0);

  // Get all unique formats from sales, returns, and tiers
  const allFormats = new Set<ContractFormat>([
    ...salesByFormat.map((s) => s.format),
    ...returnsByFormat.map((r) => r.format),
    ...(Object.keys(tiersByFormat) as ContractFormat[]),
  ]);

  for (const format of allFormats) {
    const salesData = salesByFormat.find((s) => s.format === format);
    const returnsData = returnsByFormat.find((r) => r.format === format);
    const formatTiers = tiersByFormat[format] || [];

    // Calculate net sales for this format
    const netSales = calculateNetSales(salesData, returnsData);

    // Story 10.4: Build lifetime context for this format if lifetime mode (AC-10.4.8)
    let lifetimeContext: LifetimeContext | undefined;
    if (isLifetimeMode && lifetimeSalesByFormat) {
      const lifetimeData = lifetimeSalesByFormat.get(format);
      lifetimeContext = {
        lifetimeQuantityBefore: lifetimeData?.lifetimeQuantity || 0,
        lifetimeRevenueBefore: lifetimeData?.lifetimeRevenue || 0,
      };
    }

    // Apply tiered rates (with lifetime context for split + lifetime compatibility)
    const { tierBreakdowns, formatRoyalty } = applyTieredRates(
      netSales,
      formatTiers,
      lifetimeContext,
    );

    formatCalculations.push({
      format,
      netSales,
      tierBreakdowns,
      formatRoyalty: formatRoyalty.toNumber(),
    });

    titleTotalRoyalty = titleTotalRoyalty.plus(formatRoyalty);
  }

  // Step 5: Build author splits with individual recoupment
  // Filter to only authors with contracts (TypeScript narrowing for linter)
  const authorsWithContracts = titleAuthors.filter(
    (a): a is typeof a & { contract: NonNullable<typeof a.contract> } =>
      a.contract !== null,
  );
  const authorData: AuthorDataForSplit[] = authorsWithContracts.map(
    (author) => ({
      contactId: author.contactId,
      ownershipPercentage: author.ownershipPercentage,
      contract: {
        id: author.contract.id,
        advance_amount: author.contract.advance_amount || "0",
        advance_paid: author.contract.advance_paid || "0",
        advance_recouped: author.contract.advance_recouped || "0",
      },
    }),
  );

  const authorSplits = buildMultiAuthorSplits(titleTotalRoyalty, authorData);

  // Step 6: Calculate aggregate totals
  const totalRecoupment = authorSplits.reduce(
    (sum, s) => sum + s.recoupment,
    0,
  );
  const totalNetPayable = authorSplits.reduce(
    (sum, s) => sum + s.netPayable,
    0,
  );

  // Step 7: Build the complete RoyaltyCalculation result
  const isSplitCalculation = titleAuthors.length > 1;

  const calculation: RoyaltyCalculation = {
    period: {
      startDate,
      endDate,
    },
    // Use primary author's ID for authorId field (backward compatibility)
    authorId: primaryAuthor.contactId,
    contractId: primaryContract.id,
    titleId,
    formatCalculations,
    totalRoyaltyEarned: titleTotalRoyalty.toNumber(),
    advanceRecoupment: totalRecoupment,
    netPayable: totalNetPayable,
    // Story 10.2 fields
    titleTotalRoyalty: titleTotalRoyalty.toNumber(),
    isSplitCalculation,
    authorSplits: isSplitCalculation ? authorSplits : [],
  };

  return {
    success: true,
    calculation,
  };
}

/**
 * Calculate split royalty for a title with multiple authors (Auth context version)
 *
 * Same as calculateSplitRoyaltyForTitleAdmin but uses tenant-scoped queries.
 * Use this when auth context is available (API routes, server actions).
 *
 * @param titleId - Title UUID
 * @param tenantId - Tenant UUID
 * @param startDate - Period start date (inclusive)
 * @param endDate - Period end date (inclusive)
 * @returns SplitRoyaltyCalculationResult with calculation or error
 */
export async function calculateSplitRoyaltyForTitle(
  titleId: string,
  tenantId: string,
  startDate: Date,
  endDate: Date,
): Promise<SplitRoyaltyCalculationResult> {
  // Step 1: Get all title authors with their contracts (using static import)
  const titleAuthors = await getTitleAuthorsWithContracts(titleId, tenantId);

  // Handle no authors case
  if (titleAuthors.length === 0) {
    return {
      success: false,
      error: `No authors found for title ${titleId}`,
    };
  }

  // Step 2: Check all authors have contracts (AC-10.2.9)
  const authorsWithoutContracts = titleAuthors.filter(
    (a) => a.contract === null,
  );
  if (authorsWithoutContracts.length > 0) {
    const missingNames = authorsWithoutContracts.map((a) => a.contactName);
    return {
      success: false,
      error: `Cannot calculate split royalty: ${authorsWithoutContracts.length} author(s) lack contracts: ${missingNames.join(", ")}`,
      missingContractAuthors: authorsWithoutContracts.map((a) => a.contactId),
    };
  }

  // Step 3: Find primary author (or first author as fallback)
  // At this point, all authors have contracts (validated in Step 2)
  const primaryAuthor =
    titleAuthors.find((a) => a.isPrimary) || titleAuthors[0];
  const primaryContract = primaryAuthor.contract;
  if (!primaryContract) {
    // This should never happen due to Step 2 validation, but satisfies linter
    return {
      success: false,
      error: "Primary author contract unexpectedly null after validation",
    };
  }

  // Step 4: Calculate title-level royalty using primary contract's tiers (using static imports)
  const [salesByFormat, returnsByFormat] = await Promise.all([
    getSalesByFormatForPeriod(tenantId, titleId, startDate, endDate),
    getApprovedReturnsByFormatForPeriod(tenantId, titleId, startDate, endDate),
  ]);

  // Group tiers by format for efficient lookup
  const tiersByFormat = groupTiersByFormat(primaryContract.tiers);

  // Story 10.4: Check if contract uses lifetime tier calculation mode
  const isLifetimeMode = primaryContract.tier_calculation_mode === "lifetime";

  // Story 10.4: Fetch lifetime sales if needed (AC-10.4.8)
  let lifetimeSalesByFormat: Map<ContractFormat, LifetimeSalesData> | null =
    null;
  if (isLifetimeMode) {
    lifetimeSalesByFormat = await getLifetimeSalesByFormatBeforeDate(
      tenantId,
      titleId,
      startDate,
    );
  }

  // Calculate for each format
  const formatCalculations: FormatCalculation[] = [];
  let titleTotalRoyalty = new Decimal(0);

  // Get all unique formats from sales, returns, and tiers
  const allFormats = new Set<ContractFormat>([
    ...salesByFormat.map((s) => s.format),
    ...returnsByFormat.map((r) => r.format),
    ...(Object.keys(tiersByFormat) as ContractFormat[]),
  ]);

  for (const format of allFormats) {
    const salesData = salesByFormat.find((s) => s.format === format);
    const returnsData = returnsByFormat.find((r) => r.format === format);
    const formatTiers = tiersByFormat[format] || [];

    // Calculate net sales for this format
    const netSales = calculateNetSales(salesData, returnsData);

    // Story 10.4: Build lifetime context for this format if lifetime mode (AC-10.4.8)
    let lifetimeContext: LifetimeContext | undefined;
    if (isLifetimeMode && lifetimeSalesByFormat) {
      const lifetimeData = lifetimeSalesByFormat.get(format);
      lifetimeContext = {
        lifetimeQuantityBefore: lifetimeData?.lifetimeQuantity || 0,
        lifetimeRevenueBefore: lifetimeData?.lifetimeRevenue || 0,
      };
    }

    // Apply tiered rates (with lifetime context for split + lifetime compatibility)
    const { tierBreakdowns, formatRoyalty } = applyTieredRates(
      netSales,
      formatTiers,
      lifetimeContext,
    );

    formatCalculations.push({
      format,
      netSales,
      tierBreakdowns,
      formatRoyalty: formatRoyalty.toNumber(),
    });

    titleTotalRoyalty = titleTotalRoyalty.plus(formatRoyalty);
  }

  // Step 5: Build author splits with individual recoupment
  // Filter to only authors with contracts (TypeScript narrowing for linter)
  const authorsWithContracts = titleAuthors.filter(
    (a): a is typeof a & { contract: NonNullable<typeof a.contract> } =>
      a.contract !== null,
  );
  const authorData: AuthorDataForSplit[] = authorsWithContracts.map(
    (author) => ({
      contactId: author.contactId,
      ownershipPercentage: author.ownershipPercentage,
      contract: {
        id: author.contract.id,
        advance_amount: author.contract.advance_amount || "0",
        advance_paid: author.contract.advance_paid || "0",
        advance_recouped: author.contract.advance_recouped || "0",
      },
    }),
  );

  const authorSplits = buildMultiAuthorSplits(titleTotalRoyalty, authorData);

  // Step 6: Calculate aggregate totals
  const totalRecoupment = authorSplits.reduce(
    (sum, s) => sum + s.recoupment,
    0,
  );
  const totalNetPayable = authorSplits.reduce(
    (sum, s) => sum + s.netPayable,
    0,
  );

  // Step 7: Build the complete RoyaltyCalculation result
  const isSplitCalculation = titleAuthors.length > 1;

  const calculation: RoyaltyCalculation = {
    period: {
      startDate,
      endDate,
    },
    // Use primary author's ID for authorId field (backward compatibility)
    authorId: primaryAuthor.contactId,
    contractId: primaryContract.id,
    titleId,
    formatCalculations,
    totalRoyaltyEarned: titleTotalRoyalty.toNumber(),
    advanceRecoupment: totalRecoupment,
    netPayable: totalNetPayable,
    // Story 10.2 fields
    titleTotalRoyalty: titleTotalRoyalty.toNumber(),
    isSplitCalculation,
    authorSplits: isSplitCalculation ? authorSplits : [],
  };

  return {
    success: true,
    calculation,
  };
}

// ============================================================================
// Admin Version for Background Jobs (Inngest)
// ============================================================================

/**
 * Calculate royalty for a specific author and period (admin mode)
 *
 * Same as calculateRoyaltyForPeriod but uses adminDb queries.
 * Use this for background jobs (Inngest) that don't have auth context.
 *
 * @param authorId - Author UUID (or contact ID for new contracts)
 * @param tenantId - Tenant UUID
 * @param startDate - Period start date (inclusive)
 * @param endDate - Period end date (inclusive)
 * @returns RoyaltyCalculationResult with success/failure and calculation details
 */
export async function calculateRoyaltyForPeriodAdmin(
  authorId: string,
  tenantId: string,
  startDate: Date,
  endDate: Date,
): Promise<RoyaltyCalculationResult> {
  // Step 1: Load contract with all tiered rates (AC 2)
  const contract = await getContractByAuthorAndTenantAdmin(authorId, tenantId);

  if (!contract) {
    return {
      success: false,
      error: `No active contract found for author ${authorId} in tenant ${tenantId}`,
    };
  }

  // Step 2: Calculate net sales per format (AC 3)
  const [salesByFormat, returnsByFormat] = await Promise.all([
    getSalesByFormatForPeriodAdmin(
      tenantId,
      contract.title_id,
      startDate,
      endDate,
    ),
    getApprovedReturnsByFormatForPeriodAdmin(
      tenantId,
      contract.title_id,
      startDate,
      endDate,
    ),
  ]);

  // Group tiers by format for efficient lookup
  const tiersByFormat = groupTiersByFormat(contract.tiers);

  // Calculate for each format
  const formatCalculations: FormatCalculation[] = [];
  let totalRoyaltyEarned = new Decimal(0);

  // Get all unique formats from sales, returns, and tiers
  const allFormats = new Set<ContractFormat>([
    ...salesByFormat.map((s) => s.format),
    ...returnsByFormat.map((r) => r.format),
    ...(Object.keys(tiersByFormat) as ContractFormat[]),
  ]);

  for (const format of allFormats) {
    const salesData = salesByFormat.find((s) => s.format === format);
    const returnsData = returnsByFormat.find((r) => r.format === format);
    const formatTiers = tiersByFormat[format] || [];

    // Calculate net sales for this format (AC 3, 6)
    const netSales = calculateNetSales(salesData, returnsData);

    // Apply tiered rates (AC 4, 8)
    const { tierBreakdowns, formatRoyalty } = applyTieredRates(
      netSales,
      formatTiers,
    );

    formatCalculations.push({
      format,
      netSales,
      tierBreakdowns,
      formatRoyalty: formatRoyalty.toNumber(),
    });

    totalRoyaltyEarned = totalRoyaltyEarned.plus(formatRoyalty);
  }

  // Step 4: Calculate advance recoupment (AC 5)
  const { advanceRecoupment, netPayable } = calculateAdvanceRecoupment(
    contract,
    totalRoyaltyEarned,
  );

  // Step 6: Return detailed breakdown (AC 7)
  // Story 10.2: Include split calculation fields for backward compatibility
  const calculation: RoyaltyCalculation = {
    period: {
      startDate,
      endDate,
    },
    authorId,
    contractId: contract.id,
    titleId: contract.title_id,
    formatCalculations,
    totalRoyaltyEarned: totalRoyaltyEarned.toNumber(),
    advanceRecoupment: advanceRecoupment.toNumber(),
    netPayable: netPayable.toNumber(),
    // Story 10.2: Single author = no split calculation
    titleTotalRoyalty: totalRoyaltyEarned.toNumber(),
    isSplitCalculation: false,
    authorSplits: [],
  };

  return {
    success: true,
    calculation,
  };
}
