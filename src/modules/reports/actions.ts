"use server";

/**
 * Reports Module Server Actions
 *
 * Server actions for report data fetching and export.
 *
 * Story: 6.1 - Implement Revenue and Liability Tracking
 * AC: 1-8 (Revenue and Liability reporting)
 */

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import {
  exportAuditLogsCsv,
  getAuditLogs,
  getAuditLogUsers,
  getFinanceDashboardStats,
  getLiabilityMetrics,
  getRevenueMetrics,
  getRoyaltyLiabilitySummary,
  getSalesReport,
} from "./queries";
import type { ReportPeriodInput, SalesReportFilterInput } from "./schema";
import type {
  AuditLogFilters,
  FinanceDashboardStats,
  LiabilityMetrics,
  PaginatedAuditLogs,
  RevenueMetrics,
  RoyaltyLiabilitySummary,
  SalesReportResult,
} from "./types";

/**
 * Action result wrapper for consistent error handling
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Fetch revenue metrics action
 *
 * AC-1, AC-2, AC-3, AC-4: Revenue with breakdowns
 *
 * @param period - Time period grouping
 * @param dateRange - Optional date range filter
 * @returns Revenue metrics or error
 */
export async function fetchRevenueMetrics(
  period: ReportPeriodInput = "month",
  dateRange?: { startDate: string; endDate: string },
): Promise<ActionResult<RevenueMetrics>> {
  try {
    await requirePermission(["finance", "admin", "owner"]);

    const parsedDateRange = dateRange
      ? {
          startDate: new Date(dateRange.startDate),
          endDate: new Date(dateRange.endDate),
        }
      : undefined;

    const metrics = await getRevenueMetrics(period, parsedDateRange);

    return { success: true, data: metrics };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to view revenue reports",
      };
    }
    console.error("[Reports] fetchRevenueMetrics error:", error);
    return { success: false, error: "Failed to fetch revenue metrics" };
  }
}

/**
 * Fetch liability metrics action
 *
 * AC-5, AC-6: Liability with author breakdown
 *
 * @returns Liability metrics or error
 */
export async function fetchLiabilityMetrics(): Promise<
  ActionResult<LiabilityMetrics>
> {
  try {
    await requirePermission(["finance", "admin", "owner"]);

    const metrics = await getLiabilityMetrics();

    return { success: true, data: metrics };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to view liability reports",
      };
    }
    console.error("[Reports] fetchLiabilityMetrics error:", error);
    return { success: false, error: "Failed to fetch liability metrics" };
  }
}

/**
 * Fetch finance dashboard stats action
 *
 * AC-7: Stats cards for dashboard
 *
 * @returns Dashboard stats or error
 */
export async function fetchDashboardStats(): Promise<
  ActionResult<FinanceDashboardStats>
> {
  try {
    await requirePermission(["finance", "admin", "owner"]);

    const stats = await getFinanceDashboardStats();

    return { success: true, data: stats };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to view dashboard stats",
      };
    }
    console.error("[Reports] fetchDashboardStats error:", error);
    return { success: false, error: "Failed to fetch dashboard stats" };
  }
}

/**
 * Refresh dashboard data (revalidate cache)
 */
export async function refreshDashboard(): Promise<void> {
  try {
    await requirePermission(["finance", "admin", "owner"]);
    revalidatePath("/dashboard");
  } catch {
    // Silently fail for unauthorized users
  }
}

/**
 * Fetch sales report data action
 *
 * Story: 6.2 - Build Sales Reports with Multi-Dimensional Filtering
 * AC: 5, 6 (Sales report results)
 *
 * @param filters - Filter parameters for the report
 * @returns Sales report result or error
 */
export async function fetchSalesReport(
  filters: SalesReportFilterInput,
): Promise<ActionResult<SalesReportResult>> {
  try {
    await requirePermission(["finance", "admin", "owner", "editor"]);

    // Convert filter input to expected format
    const reportFilters = {
      startDate: new Date(filters.startDate),
      endDate: new Date(filters.endDate),
      titleIds: filters.titleIds,
      authorIds: filters.authorIds,
      format: filters.format,
      channel: filters.channel,
      groupBy: filters.groupBy,
    };

    const result = await getSalesReport(reportFilters);

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to view sales reports",
      };
    }
    console.error("[Reports] fetchSalesReport error:", error);
    return { success: false, error: "Failed to fetch sales report" };
  }
}

/**
 * Export sales report as CSV
 *
 * Story: 6.2 - Build Sales Reports with Multi-Dimensional Filtering
 * AC: 9 (CSV export downloads report data with all filtered results)
 *
 * @param filters - Filter parameters for the report
 * @returns CSV string or error
 */
export async function exportSalesReportCSV(
  filters: SalesReportFilterInput,
): Promise<ActionResult<string>> {
  try {
    await requirePermission(["finance", "admin", "owner", "editor"]);

    // Convert filter input to expected format
    const reportFilters = {
      startDate: new Date(filters.startDate),
      endDate: new Date(filters.endDate),
      titleIds: filters.titleIds,
      authorIds: filters.authorIds,
      format: filters.format,
      channel: filters.channel,
      groupBy: filters.groupBy,
    };

    const result = await getSalesReport(reportFilters);

    // Generate CSV string (subtask 6.2, 6.3)
    const headers = ["Group", "Total Units", "Total Revenue", "Avg Unit Price"];
    const rows = result.rows.map((row) => [
      // Escape commas and quotes in group label
      `"${row.groupLabel.replace(/"/g, '""')}"`,
      row.totalUnits.toString(),
      row.totalRevenue.toFixed(2),
      row.avgUnitPrice.toFixed(2),
    ]);

    // Add totals row
    rows.push([
      `"${result.totals.groupLabel}"`,
      result.totals.totalUnits.toString(),
      result.totals.totalRevenue.toFixed(2),
      result.totals.avgUnitPrice.toFixed(2),
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
      "\n",
    );

    return { success: true, data: csv };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to export sales reports",
      };
    }
    console.error("[Reports] exportSalesReportCSV error:", error);
    return { success: false, error: "Failed to export sales report" };
  }
}

/**
 * Fetch royalty liability summary action
 *
 * Story: 6.4 - Build Royalty Liability Summary Report
 * AC: 2-6 (Liability summary with author breakdown and advances)
 *
 * @returns Royalty liability summary or error
 */
export async function fetchRoyaltyLiabilitySummary(): Promise<
  ActionResult<RoyaltyLiabilitySummary>
> {
  try {
    await requirePermission(["finance", "admin", "owner"]);

    const summary = await getRoyaltyLiabilitySummary();

    return { success: true, data: summary };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to view royalty liability reports",
      };
    }
    console.error("[Reports] fetchRoyaltyLiabilitySummary error:", error);
    return { success: false, error: "Failed to fetch royalty liability summary" };
  }
}

/**
 * Export royalty liability report as CSV
 *
 * Story: 6.4 - Build Royalty Liability Summary Report
 * AC: 7 (CSV export available for accounting system import)
 *
 * @returns CSV string or error
 */
export async function exportLiabilityReportCSV(): Promise<ActionResult<string>> {
  try {
    await requirePermission(["finance", "admin", "owner"]);

    const summary = await getRoyaltyLiabilitySummary();

    // Generate CSV for liability by author
    const liabilityHeaders = [
      "Author",
      "Titles",
      "Unpaid Statements",
      "Total Owed",
      "Oldest Statement",
      "Payment Method",
    ];
    const liabilityRows = summary.liabilityByAuthor.map((row) => [
      `"${row.authorName.replace(/"/g, '""')}"`,
      row.titleCount.toString(),
      row.unpaidStatements.toString(),
      row.totalOwed.toFixed(2),
      row.oldestStatement.toISOString().split("T")[0],
      row.paymentMethod ?? "Not specified",
    ]);

    // Generate CSV for advance balances
    const advanceHeaders = [
      "Author",
      "Title",
      "Advance Amount",
      "Recouped",
      "Remaining Balance",
    ];
    const advanceRows = summary.advanceBalances.map((row) => [
      `"${row.authorName.replace(/"/g, '""')}"`,
      `"${row.titleName.replace(/"/g, '""')}"`,
      row.advanceAmount.toFixed(2),
      row.advanceRecouped.toFixed(2),
      row.advanceRemaining.toFixed(2),
    ]);

    // Combine into single CSV with sections
    const csvParts: string[] = [];

    // Summary section
    csvParts.push("ROYALTY LIABILITY SUMMARY");
    csvParts.push(
      `Total Unpaid Liability,${summary.totalUnpaidLiability.toFixed(2)}`,
    );
    csvParts.push(
      `Authors with Pending Payments,${summary.authorsWithPendingPayments}`,
    );
    csvParts.push(
      `Oldest Unpaid Statement,${summary.oldestUnpaidStatement?.toISOString().split("T")[0] ?? "N/A"}`,
    );
    csvParts.push(
      `Average Payment per Author,${summary.averagePaymentPerAuthor.toFixed(2)}`,
    );
    csvParts.push("");

    // Liability by author section
    csvParts.push("LIABILITY BY AUTHOR");
    csvParts.push(liabilityHeaders.join(","));
    for (const row of liabilityRows) {
      csvParts.push(row.join(","));
    }
    csvParts.push("");

    // Advance balances section (if any)
    if (advanceRows.length > 0) {
      csvParts.push("ACTIVE ADVANCES");
      csvParts.push(advanceHeaders.join(","));
      for (const row of advanceRows) {
        csvParts.push(row.join(","));
      }
    }

    const csv = csvParts.join("\n");

    return { success: true, data: csv };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to export liability reports",
      };
    }
    console.error("[Reports] exportLiabilityReportCSV error:", error);
    return { success: false, error: "Failed to export liability report" };
  }
}

// ============================================================================
// Audit Log Actions (Story 6.5)
// ============================================================================

/**
 * Input type for audit log filters from client
 * Uses string dates for serialization over server action boundary
 */
export interface AuditLogFilterInput {
  actionType?: string;
  resourceType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Fetch paginated audit logs action
 *
 * Story: 6.5 - Implement Audit Logging for Compliance
 * AC-6.5.5: Query function supports pagination
 * AC-6.5.6: Support filtering by action_type, resource_type, user, date range
 *
 * @param filters - Filter parameters including pagination
 * @returns Paginated audit logs or error
 */
export async function fetchAuditLogs(
  filters: AuditLogFilterInput = {},
): Promise<ActionResult<PaginatedAuditLogs>> {
  try {
    await requirePermission(["finance", "admin", "owner"]);

    // Convert string dates to Date objects
    const queryFilters: AuditLogFilters = {
      ...filters,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    };

    const result = await getAuditLogs(queryFilters);

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to view audit logs",
      };
    }
    console.error("[Reports] fetchAuditLogs error:", error);
    return { success: false, error: "Failed to fetch audit logs" };
  }
}

/**
 * Fetch users for audit log filter dropdown
 *
 * Story: 6.5 - Implement Audit Logging for Compliance
 * AC-6.5.6: Support filtering by user
 *
 * @returns List of users with audit log entries or error
 */
export async function fetchAuditLogUsers(): Promise<
  ActionResult<Array<{ id: string; email: string }>>
> {
  try {
    await requirePermission(["finance", "admin", "owner"]);

    const users = await getAuditLogUsers();

    return { success: true, data: users };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to view audit log users",
      };
    }
    console.error("[Reports] fetchAuditLogUsers error:", error);
    return { success: false, error: "Failed to fetch audit log users" };
  }
}

/**
 * Export audit logs to CSV action
 *
 * Story: 6.5 - Implement Audit Logging for Compliance
 * AC-6.5.9: Export CSV functionality
 *
 * @param filters - Filter parameters (without pagination)
 * @returns CSV string or error
 */
export async function exportAuditLogsCSV(
  filters: Omit<AuditLogFilterInput, "page" | "pageSize"> = {},
): Promise<ActionResult<string>> {
  try {
    await requirePermission(["finance", "admin", "owner"]);

    // Convert string dates to Date objects
    const queryFilters = {
      ...filters,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    };

    const csv = await exportAuditLogsCsv(queryFilters);

    return { success: true, data: csv };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You do not have permission to export audit logs",
      };
    }
    console.error("[Reports] exportAuditLogsCSV error:", error);
    return { success: false, error: "Failed to export audit logs" };
  }
}
