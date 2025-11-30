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
  getContractByAuthorAndTenant,
  getSalesByFormatForPeriod,
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
 * Apply tiered royalty rates to net sales
 *
 * Story 4.4 AC 4: Apply tiered rates per format
 * - Sort tiers by min_quantity ascending
 * - Iterate through tiers, allocating units to each tier
 * - Apply tier rate to units within tier range
 * - Handle max_quantity = null as infinity
 * - Use Decimal.js for all financial math
 *
 * Royalty calculation formula per tier:
 * tier_royalty = (units_in_tier / total_units) * net_revenue * rate
 *
 * @param netSales - Net sales data for format
 * @param tiers - Sorted tiers for format
 * @returns Tier breakdowns and total format royalty
 */
function applyTieredRates(
  netSales: NetSalesData,
  tiers: ContractTier[],
): { tierBreakdowns: TierBreakdown[]; formatRoyalty: Decimal } {
  const tierBreakdowns: TierBreakdown[] = [];
  let formatRoyalty = new Decimal(0);

  // If no net sales or no tiers, return empty result
  if (netSales.netQuantity <= 0 || tiers.length === 0) {
    return { tierBreakdowns, formatRoyalty };
  }

  const totalUnits = new Decimal(netSales.netQuantity);
  const netRevenue = new Decimal(netSales.netRevenue);
  let unitsRemaining = totalUnits;

  for (const tier of tiers) {
    // Stop if all units have been allocated
    if (unitsRemaining.lte(0)) {
      break;
    }

    const minQty = new Decimal(tier.min_quantity);
    const maxQty =
      tier.max_quantity !== null
        ? new Decimal(tier.max_quantity)
        : new Decimal(Number.MAX_SAFE_INTEGER); // null = infinity (AC 4)
    const rate = new Decimal(tier.rate);

    // Calculate how many units fall into this tier
    // Units in tier = min(units_remaining, tier_capacity)
    // where tier_capacity = max_quantity - min_quantity + 1 (inclusive range)
    // For the first tier (min=0), we include min_quantity units
    // For subsequent tiers, we allocate remaining units up to capacity

    let unitsInTier: Decimal;

    if (tier.min_quantity === 0) {
      // First tier: allocate units from 0 to max_quantity (inclusive)
      const tierCapacity = maxQty.plus(1);
      unitsInTier = Decimal.min(unitsRemaining, tierCapacity);
    } else {
      // Subsequent tiers: check if we have units above min_quantity
      // Units that qualify for this tier start after min_quantity
      const unitsAboveMin = totalUnits.minus(minQty);
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
      unitsInTier = Decimal.min(unitsQualifying, unitsRemaining);
    }

    if (unitsInTier.gt(0)) {
      // Calculate royalty for this tier
      // Formula: (units_in_tier / total_units) * net_revenue * rate
      const tierRoyalty = unitsInTier
        .dividedBy(totalUnits)
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
      unitsRemaining = unitsRemaining.minus(unitsInTier);
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
