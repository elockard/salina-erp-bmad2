"use server";

/**
 * Tax Preparation Queries
 *
 * Story 11.2: Track Annual Earnings for 1099 Threshold
 * AC-11.2.2: Annual Earnings Calculation
 *
 * Queries for 1099 tax preparation report.
 * - Calculates annual earnings per author from statements
 * - Filters for US-based, active contacts with author role
 * - Uses Decimal.js for financial calculations
 *
 * CRITICAL Security Requirements:
 * - tenant_id filter MUST be FIRST in WHERE clause
 * - NEVER expose tin_encrypted in queries/results
 * - TIN status derived from presence of tin_encrypted (provided/missing)
 */

import Decimal from "decimal.js";
import { and, eq, gte, lte, sum } from "drizzle-orm";
import { contactRoles, contacts } from "@/db/schema/contacts";
import { statements } from "@/db/schema/statements";
import { getCurrentTenantId, getDb, requirePermission } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";
import {
  type AuthorEarnings,
  calculateStats,
  IRS_1099_THRESHOLD,
  type TaxPreparationStats,
} from "./tax-preparation-utils";

// Re-export types for external use (calculateStats is exported from utils file)
export type { AuthorEarnings, TaxPreparationStats };

/**
 * Get annual earnings by author for 1099 tax preparation
 *
 * AC-11.2.2: Annual Earnings Calculation
 * - Earnings calculated from all statements where period_end falls within calendar year
 * - Uses net_payable field from statements
 * - Sums all statements per author
 * - Filters to US-based, active contacts with author role
 *
 * CRITICAL: tenant_id filter MUST be FIRST in WHERE clause
 *
 * Required roles: finance, admin, owner
 *
 * @param year - Calendar year for earnings (e.g., 2024)
 * @returns ActionResult with array of AuthorEarnings
 */
export async function getAnnualEarningsByAuthor(
  year: number,
): Promise<ActionResult<AuthorEarnings[]>> {
  try {
    await requirePermission(["finance", "admin", "owner"]);
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    const yearStart = new Date(`${year}-01-01`);
    const yearEnd = new Date(`${year}-12-31`);

    // Query statements joined with contacts and contact_roles
    // CRITICAL: tenant_id MUST be FIRST filter condition
    const results = await db
      .select({
        contactId: contacts.id,
        firstName: contacts.first_name,
        lastName: contacts.last_name,
        email: contacts.email,
        tinEncrypted: contacts.tin_encrypted,
        tinType: contacts.tin_type,
        isUsBased: contacts.is_us_based,
        w9Received: contacts.w9_received,
        totalEarnings: sum(statements.net_payable),
      })
      .from(statements)
      .innerJoin(contacts, eq(statements.contact_id, contacts.id))
      .innerJoin(
        contactRoles,
        and(
          eq(contactRoles.contact_id, contacts.id),
          eq(contactRoles.role, "author"),
        ),
      )
      .where(
        and(
          eq(statements.tenant_id, tenantId), // CRITICAL: tenant_id FIRST
          gte(statements.period_end, yearStart),
          lte(statements.period_end, yearEnd),
          eq(contacts.is_us_based, true),
          eq(contacts.status, "active"),
        ),
      )
      .groupBy(
        contacts.id,
        contacts.first_name,
        contacts.last_name,
        contacts.email,
        contacts.tin_encrypted,
        contacts.tin_type,
        contacts.is_us_based,
        contacts.w9_received,
      );

    // Map to AuthorEarnings interface
    const authorEarnings: AuthorEarnings[] = results
      .map((row) => {
        const earnings = new Decimal(row.totalEarnings || 0).toNumber();
        const name =
          `${row.firstName || ""} ${row.lastName || ""}`.trim() || "Unknown";

        return {
          contactId: row.contactId,
          name,
          email: row.email,
          tinStatus: (row.tinEncrypted ? "provided" : "missing") as
            | "provided"
            | "missing",
          tinType: row.tinType as "ssn" | "ein" | null,
          isUsBased: row.isUsBased ?? true,
          w9Received: row.w9Received ?? false,
          annualEarnings: earnings,
          requires1099: earnings >= IRS_1099_THRESHOLD,
        };
      })
      .filter((author) => author.annualEarnings > 0); // Exclude authors with no earnings

    return {
      success: true,
      data: authorEarnings,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    if (message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to view tax preparation data",
      };
    }

    console.error(`[Query] getAnnualEarningsByAuthor failed:`, error);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Get tax preparation statistics for a calendar year
 *
 * AC-11.2.6: Summary Statistics
 * - Total Authors: count of authors with earnings in year
 * - Requiring 1099: count where earnings >= $10 (royalty threshold)
 * - Total Earnings: sum of all earnings
 * - Missing TIN: count where requires1099=true AND tinStatus="missing"
 *
 * Required roles: finance, admin, owner
 *
 * @param year - Calendar year for stats (e.g., 2024)
 * @returns ActionResult with TaxPreparationStats
 */
export async function getTaxPreparationStats(
  year: number,
): Promise<ActionResult<TaxPreparationStats>> {
  try {
    // Get earnings data first
    const earningsResult = await getAnnualEarningsByAuthor(year);

    if (!earningsResult.success) {
      return {
        success: false,
        error: earningsResult.error,
      };
    }

    const stats = calculateStats(earningsResult.data);

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    console.error(`[Query] getTaxPreparationStats failed:`, error);
    return {
      success: false,
      error: message,
    };
  }
}
