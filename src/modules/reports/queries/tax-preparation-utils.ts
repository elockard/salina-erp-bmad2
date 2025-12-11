/**
 * Tax Preparation Utilities
 *
 * Story 11.2: Track Annual Earnings for 1099 Threshold
 *
 * Pure utility functions for tax preparation calculations.
 * These functions have no database access and can be used in both
 * server and client contexts.
 */

/**
 * IRS 1099-MISC threshold for royalty reporting
 * Authors earning >= $10 in royalties in a calendar year require 1099-MISC form
 * Note: This is different from the $600 threshold for non-employee compensation
 * See IRS Form 1099-MISC Instructions, Box 2 (Royalties)
 */
export const IRS_1099_THRESHOLD = 10;

/**
 * Author earnings data for tax preparation report
 * Derived from statement data joined with contact tax info
 */
export interface AuthorEarnings {
  /** Contact UUID */
  contactId: string;
  /** Contact full name */
  name: string;
  /** Contact email (optional) */
  email: string | null;
  /** TIN status: "provided" if tin_encrypted exists, else "missing" */
  tinStatus: "provided" | "missing";
  /** TIN type: "ssn" or "ein" (null if no TIN) */
  tinType: "ssn" | "ein" | null;
  /** Whether author is US-based (required for 1099) */
  isUsBased: boolean;
  /** Whether W-9 form has been received */
  w9Received: boolean;
  /** Total annual earnings from statements (net_payable sum) */
  annualEarnings: number;
  /** Whether author requires 1099 form (earnings >= $10 for royalties) */
  requires1099: boolean;
}

/**
 * Summary statistics for tax preparation report
 */
export interface TaxPreparationStats {
  /** Total number of authors with earnings in the year */
  totalAuthors: number;
  /** Count of authors requiring 1099 (earnings >= $10 for royalties) */
  authorsRequiring1099: number;
  /** Sum of all annual earnings */
  totalEarnings: number;
  /** Count of authors requiring 1099 but missing TIN */
  authorsMissingTin: number;
}

/**
 * Calculate statistics from author earnings data
 *
 * Pure function - no DB access, just calculations
 * Stats are calculated from UNFILTERED data (totals regardless of UI filter)
 *
 * @param authors - Array of AuthorEarnings
 * @returns TaxPreparationStats
 */
export function calculateStats(authors: AuthorEarnings[]): TaxPreparationStats {
  const requiring1099 = authors.filter((a) => a.requires1099);

  return {
    totalAuthors: authors.length,
    authorsRequiring1099: requiring1099.length,
    totalEarnings: authors.reduce((sum, a) => sum + a.annualEarnings, 0),
    authorsMissingTin: requiring1099.filter((a) => a.tinStatus === "missing")
      .length,
  };
}
