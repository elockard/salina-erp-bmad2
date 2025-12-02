"use server";

/**
 * Reports Module Query Functions
 *
 * Revenue and liability query functions with tenant isolation.
 * All financial calculations use Decimal.js for precision.
 *
 * Story: 6.1 - Implement Revenue and Liability Tracking
 * AC: 1-6 (Revenue and Liability tracking)
 *
 * CRITICAL: Every query includes tenant_id filter as FIRST condition.
 */

import {
  addMonths,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  subMonths,
} from "date-fns";
import Decimal from "decimal.js";
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  lte,
  sql,
  sum,
} from "drizzle-orm";
import { auditLogs } from "@/db/schema/audit-logs";
import { authors } from "@/db/schema/authors";
import { contracts } from "@/db/schema/contracts";
import { isbns } from "@/db/schema/isbns";
import { sales } from "@/db/schema/sales";
import { statements } from "@/db/schema/statements";
import { titles } from "@/db/schema/titles";
import { users } from "@/db/schema/users";
import { getCurrentTenantId, getDb, requirePermission } from "@/lib/auth";
import type { ReportPeriodInput } from "./schema";
import { returns } from "@/db/schema/returns";
import type {
  AdvanceBalanceRow,
  AuditLogEntry,
  AuditLogFilters,
  AuthorLiabilityRow,
  AuthorPortalDashboardData,
  EditorDashboardData,
  FinanceDashboardData,
  FinanceDashboardStats,
  ISBNAssignmentHistoryItem,
  ISBNPoolMetrics,
  LiabilityMetrics,
  OwnerAdminDashboardData,
  PaginatedAuditLogs,
  RevenueChannelBreakdown,
  RevenueFormatBreakdown,
  RevenueMetrics,
  RevenuePeriodBreakdown,
  RoyaltyLiabilitySummary,
  SalesReportFilters,
  SalesReportResult,
  SalesReportRow,
} from "./types";

/**
 * Get comprehensive revenue metrics
 *
 * AC-1: Total revenue from all sales (sum of sales.total_amount)
 * AC-2: Revenue filtered by period (day/week/month/quarter/year)
 * AC-3: Revenue breakdown by format with percentages
 * AC-4: Revenue breakdown by channel with percentages
 *
 * Required roles: finance, admin, owner
 *
 * @param period - Time period grouping for trends
 * @param dateRange - Optional date range filter
 * @returns Complete revenue metrics
 */
export async function getRevenueMetrics(
  period: ReportPeriodInput = "month",
  dateRange?: { startDate: Date; endDate: Date },
): Promise<RevenueMetrics> {
  await requirePermission(["finance", "admin", "owner"]);
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Default to last 12 months if no date range provided
  const now = new Date();
  const effectiveEndDate = dateRange?.endDate ?? now;
  const effectiveStartDate = dateRange?.startDate ?? subMonths(now, 12);

  // Format dates for SQL comparison
  const startDateStr = effectiveStartDate.toISOString().split("T")[0];
  const endDateStr = effectiveEndDate.toISOString().split("T")[0];

  // Base conditions for all queries
  const baseConditions = and(
    eq(sales.tenant_id, tenantId), // CRITICAL: tenant_id FIRST
    gte(sales.sale_date, startDateStr),
    lte(sales.sale_date, endDateStr),
  );

  // 1. Get total revenue
  const [totalResult] = await db
    .select({ total: sum(sales.total_amount) })
    .from(sales)
    .where(baseConditions);

  const totalRevenue = new Decimal(totalResult?.total ?? "0").toNumber();

  // 2. Get revenue by period
  const revenueByPeriod = await getRevenueByPeriod(
    db,
    tenantId,
    period,
    effectiveStartDate,
    effectiveEndDate,
  );

  // 3. Get revenue by format
  const formatResults = await db
    .select({
      format: sales.format,
      amount: sum(sales.total_amount),
    })
    .from(sales)
    .where(baseConditions)
    .groupBy(sales.format);

  const revenueByFormat: RevenueFormatBreakdown[] = formatResults.map((row) => {
    const amount = new Decimal(row.amount ?? "0").toNumber();
    const percentage =
      totalRevenue > 0
        ? new Decimal(amount).div(totalRevenue).mul(100).toNumber()
        : 0;
    return {
      format: row.format,
      amount,
      percentage: Math.round(percentage * 10) / 10, // 1 decimal place
    };
  });

  // 4. Get revenue by channel
  const channelResults = await db
    .select({
      channel: sales.channel,
      amount: sum(sales.total_amount),
    })
    .from(sales)
    .where(baseConditions)
    .groupBy(sales.channel);

  const revenueByChannel: RevenueChannelBreakdown[] = channelResults.map(
    (row) => {
      const amount = new Decimal(row.amount ?? "0").toNumber();
      const percentage =
        totalRevenue > 0
          ? new Decimal(amount).div(totalRevenue).mul(100).toNumber()
          : 0;
      return {
        channel: row.channel,
        amount,
        percentage: Math.round(percentage * 10) / 10,
      };
    },
  );

  return {
    totalRevenue,
    revenueByPeriod,
    revenueByFormat,
    revenueByChannel,
  };
}

/**
 * Get revenue grouped by time period
 *
 * @internal
 */
async function getRevenueByPeriod(
  db: Awaited<ReturnType<typeof getDb>>,
  tenantId: string,
  period: ReportPeriodInput,
  startDate: Date,
  endDate: Date,
): Promise<RevenuePeriodBreakdown[]> {
  const results: RevenuePeriodBreakdown[] = [];

  // Generate period buckets and query each
  const buckets = generatePeriodBuckets(period, startDate, endDate);

  for (const bucket of buckets) {
    const [result] = await db
      .select({ amount: sum(sales.total_amount) })
      .from(sales)
      .where(
        and(
          eq(sales.tenant_id, tenantId),
          gte(sales.sale_date, bucket.start),
          lte(sales.sale_date, bucket.end),
        ),
      );

    results.push({
      period: bucket.label,
      amount: new Decimal(result?.amount ?? "0").toNumber(),
    });
  }

  return results;
}

/**
 * Generate period buckets for time-series aggregation
 *
 * @internal
 */
function generatePeriodBuckets(
  period: ReportPeriodInput,
  startDate: Date,
  endDate: Date,
): Array<{ start: string; end: string; label: string }> {
  const buckets: Array<{ start: string; end: string; label: string }> = [];
  let current = new Date(startDate);

  while (current <= endDate) {
    let bucketStart: Date;
    let bucketEnd: Date;
    let label: string;

    switch (period) {
      case "day":
        bucketStart = current;
        bucketEnd = current;
        label = format(current, "MMM d");
        current = new Date(current);
        current.setDate(current.getDate() + 1);
        break;
      case "week":
        bucketStart = startOfWeek(current, { weekStartsOn: 1 });
        bucketEnd = endOfWeek(current, { weekStartsOn: 1 });
        label = `Week of ${format(bucketStart, "MMM d")}`;
        current = new Date(bucketEnd);
        current.setDate(current.getDate() + 1);
        break;
      case "month":
        bucketStart = startOfMonth(current);
        bucketEnd = endOfMonth(current);
        label = format(current, "MMM yyyy");
        current = new Date(bucketEnd);
        current.setDate(current.getDate() + 1);
        break;
      case "quarter": {
        bucketStart = startOfQuarter(current);
        bucketEnd = endOfQuarter(current);
        const quarter = Math.ceil((current.getMonth() + 1) / 3);
        label = `Q${quarter} ${current.getFullYear()}`;
        current = new Date(bucketEnd);
        current.setDate(current.getDate() + 1);
        break;
      }
      case "year":
        bucketStart = startOfYear(current);
        bucketEnd = endOfYear(current);
        label = format(current, "yyyy");
        current = new Date(bucketEnd);
        current.setDate(current.getDate() + 1);
        break;
    }

    // Clamp to actual date range
    const clampedStart = bucketStart < startDate ? startDate : bucketStart;
    const clampedEnd = bucketEnd > endDate ? endDate : bucketEnd;

    buckets.push({
      start: clampedStart.toISOString().split("T")[0],
      end: clampedEnd.toISOString().split("T")[0],
      label,
    });
  }

  return buckets;
}

/**
 * Get comprehensive liability metrics
 *
 * AC-5: Total royalty liability (sum of net_payable from unpaid statements)
 * AC-6: Liability by author as a grouped view
 *
 * Required roles: finance, admin, owner
 *
 * @returns Complete liability metrics
 */
export async function getLiabilityMetrics(): Promise<LiabilityMetrics> {
  await requirePermission(["finance", "admin", "owner"]);
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // 1. Get total unpaid liability (status != 'paid')
  // Note: statements.status only has draft, sent, failed - none are "paid"
  // A statement is considered unpaid if status is NOT 'sent' or we track all as liability
  // Per schema: status is draft/sent/failed - "sent" means delivered, not paid
  // We'll treat ALL statements as liability since there's no "paid" status
  const [unpaidResult] = await db
    .select({ total: sum(statements.net_payable) })
    .from(statements)
    .where(eq(statements.tenant_id, tenantId));

  const totalLiability = new Decimal(unpaidResult?.total ?? "0").toNumber();
  const unpaidAmount = totalLiability; // All statements are unpaid by nature
  const paidAmount = 0; // No payment tracking in current schema

  // 2. Get liability by author with JOIN
  const authorLiabilityResults = await db
    .select({
      authorId: authors.id,
      authorName: authors.name,
      totalAmount: sum(statements.net_payable),
      statementCount: count(statements.id),
    })
    .from(statements)
    .innerJoin(authors, eq(statements.author_id, authors.id))
    .where(eq(statements.tenant_id, tenantId))
    .groupBy(authors.id, authors.name);

  // Get title counts per author via contracts
  const authorTitleCounts = await db
    .select({
      authorId: contracts.author_id,
      titleCount: count(contracts.title_id),
    })
    .from(contracts)
    .where(eq(contracts.tenant_id, tenantId))
    .groupBy(contracts.author_id);

  const titleCountMap = new Map(
    authorTitleCounts.map((r) => [r.authorId, Number(r.titleCount)]),
  );

  const liabilityByAuthor = authorLiabilityResults.map((row) => ({
    authorId: row.authorId,
    authorName: row.authorName,
    amount: new Decimal(row.totalAmount ?? "0").toNumber(),
    titlesCount: titleCountMap.get(row.authorId) ?? 0,
    unpaidStatementsCount: Number(row.statementCount),
  }));

  // Sort by amount DESC
  liabilityByAuthor.sort((a, b) => b.amount - a.amount);

  return {
    totalLiability,
    liabilityByAuthor,
    paidAmount,
    unpaidAmount,
  };
}

/**
 * Get finance dashboard stats for stats cards
 *
 * AC-7: Finance dashboard displays stats cards
 *
 * Required roles: finance, admin, owner
 *
 * @returns Dashboard stats for cards
 */
export async function getFinanceDashboardStats(): Promise<FinanceDashboardStats> {
  await requirePermission(["finance", "admin", "owner"]);
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Current month revenue
  const now = new Date();
  const currentMonthStart = startOfMonth(now).toISOString().split("T")[0];
  const currentMonthEnd = endOfMonth(now).toISOString().split("T")[0];

  const [currentRevenueResult] = await db
    .select({ total: sum(sales.total_amount) })
    .from(sales)
    .where(
      and(
        eq(sales.tenant_id, tenantId),
        gte(sales.sale_date, currentMonthStart),
        lte(sales.sale_date, currentMonthEnd),
      ),
    );

  const currentRevenue = new Decimal(
    currentRevenueResult?.total ?? "0",
  ).toNumber();

  // Previous month revenue for trend calculation
  const prevMonthStart = startOfMonth(subMonths(now, 1))
    .toISOString()
    .split("T")[0];
  const prevMonthEnd = endOfMonth(subMonths(now, 1))
    .toISOString()
    .split("T")[0];

  const [prevRevenueResult] = await db
    .select({ total: sum(sales.total_amount) })
    .from(sales)
    .where(
      and(
        eq(sales.tenant_id, tenantId),
        gte(sales.sale_date, prevMonthStart),
        lte(sales.sale_date, prevMonthEnd),
      ),
    );

  const prevRevenue = new Decimal(prevRevenueResult?.total ?? "0").toNumber();
  const revenueTrend =
    prevRevenue > 0
      ? new Decimal(currentRevenue)
          .minus(prevRevenue)
          .div(prevRevenue)
          .mul(100)
          .toNumber()
      : undefined;

  // Total liability
  const [liabilityResult] = await db
    .select({ total: sum(statements.net_payable) })
    .from(statements)
    .where(eq(statements.tenant_id, tenantId));

  const totalLiability = new Decimal(liabilityResult?.total ?? "0").toNumber();

  // Next statement deadline (estimate based on quarter end + 30 days)
  const currentQuarterEnd = endOfQuarter(now);
  const nextDeadline = new Date(currentQuarterEnd);
  nextDeadline.setDate(nextDeadline.getDate() + 30); // 30 days after quarter end

  const daysUntilDeadline = Math.max(
    0,
    Math.ceil((nextDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  );

  return {
    currentRevenue,
    revenueTrend: revenueTrend ? Math.round(revenueTrend * 10) / 10 : undefined,
    totalLiability,
    nextStatementDeadline: nextDeadline,
    daysUntilDeadline,
  };
}

/**
 * Get sales report with multi-dimensional filtering
 *
 * Story: 6.2 - Build Sales Reports with Multi-Dimensional Filtering
 * AC-5: Results table shows: Group, Total Units, Total Revenue, Avg Unit Price
 * AC-6: Totals row displays at bottom of table
 *
 * Required roles: finance, admin, owner, editor (NOT author)
 *
 * CRITICAL: tenant_id filter is ALWAYS the FIRST condition (subtask 3.11)
 *
 * @param filters - Filter parameters including date range, grouping, and optional filters
 * @returns Sales report rows and totals
 */
export async function getSalesReport(
  filters: SalesReportFilters,
): Promise<SalesReportResult> {
  await requirePermission(["finance", "admin", "owner", "editor"]);
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Format dates for SQL comparison (subtask 3.6)
  const startDateStr = filters.startDate.toISOString().split("T")[0];
  const endDateStr = filters.endDate.toISOString().split("T")[0];

  // Build base conditions - tenant_id FIRST (subtask 3.11)
  const conditions: ReturnType<typeof eq>[] = [
    eq(sales.tenant_id, tenantId),
    gte(sales.sale_date, startDateStr),
    lte(sales.sale_date, endDateStr),
  ];

  // Apply title filter (subtask 3.7)
  if (filters.titleIds && filters.titleIds.length > 0) {
    conditions.push(inArray(sales.title_id, filters.titleIds));
  }

  // Apply format filter (subtask 3.9)
  if (filters.format && filters.format !== "all") {
    conditions.push(eq(sales.format, filters.format));
  }

  // Apply channel filter (subtask 3.10)
  if (filters.channel && filters.channel !== "all") {
    conditions.push(eq(sales.channel, filters.channel));
  }

  // For author filtering, we need to get title IDs first (subtask 3.8)
  let authorFilteredTitleIds: string[] | null = null;
  if (filters.authorIds && filters.authorIds.length > 0) {
    // Get all titles associated with the selected authors via contracts
    const authorTitles = await db
      .select({ titleId: contracts.title_id })
      .from(contracts)
      .where(
        and(
          eq(contracts.tenant_id, tenantId),
          inArray(contracts.author_id, filters.authorIds),
        ),
      );
    authorFilteredTitleIds = authorTitles.map((t) => t.titleId);

    // If no titles match the author filter, return empty result
    if (authorFilteredTitleIds.length === 0) {
      return {
        rows: [],
        totals: {
          groupKey: "total",
          groupLabel: "Total",
          totalUnits: 0,
          totalRevenue: 0,
          avgUnitPrice: 0,
        },
      };
    }

    // Add title filter for author filtering
    conditions.push(inArray(sales.title_id, authorFilteredTitleIds));
  }

  const whereClause = and(...conditions);

  // Execute grouped query based on groupBy parameter (subtask 3.2)
  let rows: SalesReportRow[] = [];

  switch (filters.groupBy) {
    case "title": {
      // Group by title - join with titles to get name
      const titleResults = await db
        .select({
          groupKey: sales.title_id,
          groupLabel: titles.title,
          totalUnits: sum(sales.quantity),
          totalRevenue: sum(sales.total_amount),
        })
        .from(sales)
        .innerJoin(titles, eq(sales.title_id, titles.id))
        .where(whereClause)
        .groupBy(sales.title_id, titles.title);

      rows = titleResults.map((row) => {
        const units = Number(row.totalUnits) || 0;
        const revenue = new Decimal(row.totalRevenue ?? "0").toNumber();
        return {
          groupKey: row.groupKey,
          groupLabel: row.groupLabel,
          totalUnits: units,
          totalRevenue: revenue,
          avgUnitPrice:
            units > 0 ? new Decimal(revenue).div(units).toNumber() : 0,
        };
      });
      break;
    }

    case "format": {
      // Group by format (subtask 3.3, 3.4, 3.5)
      const formatResults = await db
        .select({
          groupKey: sales.format,
          totalUnits: sum(sales.quantity),
          totalRevenue: sum(sales.total_amount),
        })
        .from(sales)
        .where(whereClause)
        .groupBy(sales.format);

      const formatLabels: Record<string, string> = {
        physical: "Physical",
        ebook: "Ebook",
        audiobook: "Audiobook",
      };

      rows = formatResults.map((row) => {
        const units = Number(row.totalUnits) || 0;
        const revenue = new Decimal(row.totalRevenue ?? "0").toNumber();
        return {
          groupKey: row.groupKey,
          groupLabel: formatLabels[row.groupKey] ?? row.groupKey,
          totalUnits: units,
          totalRevenue: revenue,
          avgUnitPrice:
            units > 0 ? new Decimal(revenue).div(units).toNumber() : 0,
        };
      });
      break;
    }

    case "channel": {
      // Group by channel
      const channelResults = await db
        .select({
          groupKey: sales.channel,
          totalUnits: sum(sales.quantity),
          totalRevenue: sum(sales.total_amount),
        })
        .from(sales)
        .where(whereClause)
        .groupBy(sales.channel);

      const channelLabels: Record<string, string> = {
        retail: "Retail",
        wholesale: "Wholesale",
        direct: "Direct",
        distributor: "Distributor",
      };

      rows = channelResults.map((row) => {
        const units = Number(row.totalUnits) || 0;
        const revenue = new Decimal(row.totalRevenue ?? "0").toNumber();
        return {
          groupKey: row.groupKey,
          groupLabel: channelLabels[row.groupKey] ?? row.groupKey,
          totalUnits: units,
          totalRevenue: revenue,
          avgUnitPrice:
            units > 0 ? new Decimal(revenue).div(units).toNumber() : 0,
        };
      });
      break;
    }

    case "date": {
      // Group by date (month buckets)
      const dateResults = await db
        .select({
          groupKey: sql<string>`to_char(${sales.sale_date}::date, 'YYYY-MM')`,
          totalUnits: sum(sales.quantity),
          totalRevenue: sum(sales.total_amount),
        })
        .from(sales)
        .where(whereClause)
        .groupBy(sql`to_char(${sales.sale_date}::date, 'YYYY-MM')`)
        .orderBy(sql`to_char(${sales.sale_date}::date, 'YYYY-MM')`);

      rows = dateResults.map((row) => {
        const units = Number(row.totalUnits) || 0;
        const revenue = new Decimal(row.totalRevenue ?? "0").toNumber();
        // Parse YYYY-MM to readable format
        const [year, month] = row.groupKey.split("-");
        const date = new Date(Number(year), Number(month) - 1);
        return {
          groupKey: row.groupKey,
          groupLabel: format(date, "MMM yyyy"),
          totalUnits: units,
          totalRevenue: revenue,
          avgUnitPrice:
            units > 0 ? new Decimal(revenue).div(units).toNumber() : 0,
        };
      });
      break;
    }
  }

  // Sort by revenue descending (default sort)
  rows.sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Calculate totals (subtask 3.12)
  const totalUnits = rows.reduce((sum, row) => sum + row.totalUnits, 0);
  const totalRevenue = rows.reduce(
    (sum, row) => new Decimal(sum).plus(row.totalRevenue).toNumber(),
    0,
  );

  const totals: SalesReportRow = {
    groupKey: "total",
    groupLabel: "Total",
    totalUnits,
    totalRevenue,
    avgUnitPrice:
      totalUnits > 0 ? new Decimal(totalRevenue).div(totalUnits).toNumber() : 0,
  };

  return { rows, totals };
}

/**
 * Get ISBN pool metrics for status report
 *
 * Story: 6.3 - Build ISBN Pool Status Report
 * AC-2: Stats cards show Physical ISBNs (Available/Assigned/Total), Ebook ISBNs (Available/Assigned/Total)
 * AC-3: Utilization percentage is calculated and displayed
 * AC-7: Burn rate calculation shows ISBNs assigned per month
 * AC-8: Estimated runout date displayed based on burn rate
 *
 * Required roles: finance, admin, owner, editor (NOT author)
 *
 * CRITICAL: tenant_id filter is ALWAYS the FIRST condition
 *
 * @returns ISBN pool metrics with counts, utilization, burn rate, and runout estimate
 */
export async function getISBNPoolMetrics(): Promise<ISBNPoolMetrics> {
  await requirePermission(["finance", "admin", "owner", "editor"]);
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Query ISBN counts by type and status
  // CRITICAL: tenant_id FIRST in all conditions
  const countsResult = await db
    .select({
      type: isbns.type,
      status: isbns.status,
      count: count(),
    })
    .from(isbns)
    .where(eq(isbns.tenant_id, tenantId))
    .groupBy(isbns.type, isbns.status);

  // Initialize counters
  const physical = { available: 0, assigned: 0, total: 0 };
  const ebook = { available: 0, assigned: 0, total: 0 };

  // Aggregate counts by type
  // ISBN statuses: available, assigned, registered, retired
  // For pool metrics: available = "available", assigned = "assigned" + "registered"
  for (const row of countsResult) {
    const countValue = Number(row.count);

    if (row.type === "physical") {
      if (row.status === "available") {
        physical.available += countValue;
      } else if (row.status === "assigned" || row.status === "registered") {
        physical.assigned += countValue;
      }
      // retired ISBNs don't count toward total
      if (row.status !== "retired") {
        physical.total += countValue;
      }
    } else if (row.type === "ebook") {
      if (row.status === "available") {
        ebook.available += countValue;
      } else if (row.status === "assigned" || row.status === "registered") {
        ebook.assigned += countValue;
      }
      if (row.status !== "retired") {
        ebook.total += countValue;
      }
    }
  }

  // Calculate utilization percentage (AC-3)
  const totalAll = physical.total + ebook.total;
  const assignedAll = physical.assigned + ebook.assigned;
  const utilizationPercent =
    totalAll > 0
      ? new Decimal(assignedAll).div(totalAll).mul(100).toNumber()
      : 0;

  // Calculate burn rate - ISBNs assigned per month (last 6 months average) (AC-7)
  const now = new Date();
  const sixMonthsAgo = subMonths(now, 6);

  const [burnRateResult] = await db
    .select({
      assignedCount: count(),
    })
    .from(isbns)
    .where(
      and(eq(isbns.tenant_id, tenantId), gte(isbns.assigned_at, sixMonthsAgo)),
    );

  const assignedLast6Months = Number(burnRateResult?.assignedCount ?? 0);
  const burnRate = new Decimal(assignedLast6Months).div(6).toNumber();

  // Calculate estimated runout date (AC-8)
  // Available / burnRate = months until runout
  const totalAvailable = physical.available + ebook.available;
  let estimatedRunout: Date | null = null;

  if (burnRate > 0 && totalAvailable > 0) {
    const monthsUntilRunout = Math.ceil(totalAvailable / burnRate);
    estimatedRunout = addMonths(now, monthsUntilRunout);
  }

  return {
    physical,
    ebook,
    utilizationPercent: Math.round(utilizationPercent * 10) / 10, // 1 decimal
    burnRate: Math.round(burnRate * 10) / 10, // 1 decimal
    estimatedRunout,
  };
}

/**
 * Get ISBN assignment history for timeline chart
 *
 * Story: 6.3 - Build ISBN Pool Status Report
 * AC-5: Timeline chart shows ISBN assignments over time
 * AC-7: Burn rate calculation (uses this data)
 *
 * Required roles: finance, admin, owner, editor (NOT author)
 *
 * CRITICAL: tenant_id filter is ALWAYS the FIRST condition
 *
 * Performance optimized: Uses single SQL query with GROUP BY instead of N queries.
 *
 * @param months - Number of months to include in history (default: 6)
 * @returns Array of monthly assignment counts
 */
export async function getISBNAssignmentHistory(
  months: number = 6,
): Promise<ISBNAssignmentHistoryItem[]> {
  await requirePermission(["finance", "admin", "owner", "editor"]);
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const now = new Date();
  const startDate = startOfMonth(subMonths(now, months - 1));

  // Single query with SQL-level month grouping for better performance
  const dbResults = await db
    .select({
      yearMonth: sql<string>`to_char(${isbns.assigned_at}, 'YYYY-MM')`,
      assigned: count(),
    })
    .from(isbns)
    .where(
      and(
        eq(isbns.tenant_id, tenantId), // tenant_id FIRST
        gte(isbns.assigned_at, startDate),
      ),
    )
    .groupBy(sql`to_char(${isbns.assigned_at}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${isbns.assigned_at}, 'YYYY-MM')`);

  // Create a map for quick lookup
  const assignmentMap = new Map<string, number>();
  for (const row of dbResults) {
    if (row.yearMonth) {
      assignmentMap.set(row.yearMonth, Number(row.assigned));
    }
  }

  // Generate all month buckets (including months with 0 assignments)
  const results: ISBNAssignmentHistoryItem[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const yearMonth = format(monthDate, "yyyy-MM");
    const displayMonth = format(monthDate, "MMM yyyy");

    results.push({
      month: displayMonth,
      assigned: assignmentMap.get(yearMonth) ?? 0,
    });
  }

  return results;
}

/**
 * Get comprehensive royalty liability summary for report
 *
 * Story: 6.4 - Build Royalty Liability Summary Report
 * AC-2: Summary stats show: Total Unpaid Liability, Authors with Pending Payments, Oldest Unpaid Statement
 * AC-3: Average payment per author is calculated
 * AC-4: Liability by author table shows: Author, Titles, Unpaid Statements, Total Owed, Oldest Statement
 * AC-5: Table is sortable by amount owed (default: highest first)
 * AC-6: Advance tracking section shows authors with active advances and remaining balances
 *
 * Required roles: finance, admin, owner (NOT editor, NOT author)
 *
 * CRITICAL: tenant_id filter is ALWAYS the FIRST condition
 *
 * @returns Complete royalty liability summary
 */
export async function getRoyaltyLiabilitySummary(): Promise<RoyaltyLiabilitySummary> {
  await requirePermission(["finance", "admin", "owner"]);
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Note: Per statements schema, status only has draft/sent/failed - no "paid" status
  // All statements represent unpaid liability until a payment tracking system is added
  // For now, we treat ALL statements as unpaid liability

  // 1. Get total unpaid liability (AC-2.3: SUM of net_payable from unpaid statements)
  const [totalResult] = await db
    .select({ total: sum(statements.net_payable) })
    .from(statements)
    .where(eq(statements.tenant_id, tenantId)); // CRITICAL: tenant_id FIRST

  const totalUnpaidLiability = new Decimal(
    totalResult?.total ?? "0",
  ).toNumber();

  // 2. Get authors with pending payments count (AC-2.4: COUNT DISTINCT author_id)
  const [authorsCountResult] = await db
    .select({
      count: sql<number>`COUNT(DISTINCT ${statements.author_id})`,
    })
    .from(statements)
    .where(eq(statements.tenant_id, tenantId));

  const authorsWithPendingPayments = Number(authorsCountResult?.count ?? 0);

  // 3. Get oldest unpaid statement (AC-2.5: MIN of period_end)
  const [oldestResult] = await db
    .select({ oldest: sql<string>`MIN(${statements.period_end})` })
    .from(statements)
    .where(eq(statements.tenant_id, tenantId));

  const oldestUnpaidStatement = oldestResult?.oldest
    ? new Date(oldestResult.oldest)
    : null;

  // 4. Calculate average payment per author (AC-2.6)
  const averagePaymentPerAuthor =
    authorsWithPendingPayments > 0
      ? new Decimal(totalUnpaidLiability)
          .div(authorsWithPendingPayments)
          .toNumber()
      : 0;

  // 5. Get liability by author with aggregations (AC-4, AC-5)
  // GROUP BY author_id to aggregate: title count, unpaid statement count, total owed, oldest statement date
  const authorLiabilityResults = await db
    .select({
      authorId: authors.id,
      authorName: authors.name,
      paymentMethod: authors.payment_method,
      totalOwed: sum(statements.net_payable),
      unpaidStatements: count(statements.id),
      oldestStatement: sql<string>`MIN(${statements.period_end})`,
    })
    .from(statements)
    .innerJoin(authors, eq(statements.author_id, authors.id))
    .where(eq(statements.tenant_id, tenantId)) // CRITICAL: tenant_id FIRST
    .groupBy(authors.id, authors.name, authors.payment_method);

  // Get title counts per author via contracts
  const authorTitleCounts = await db
    .select({
      authorId: contracts.author_id,
      titleCount: sql<number>`COUNT(DISTINCT ${contracts.title_id})`,
    })
    .from(contracts)
    .where(eq(contracts.tenant_id, tenantId))
    .groupBy(contracts.author_id);

  const titleCountMap = new Map(
    authorTitleCounts.map((r) => [r.authorId, Number(r.titleCount)]),
  );

  const liabilityByAuthor: AuthorLiabilityRow[] = authorLiabilityResults.map(
    (row) => ({
      authorId: row.authorId,
      authorName: row.authorName,
      titleCount: titleCountMap.get(row.authorId) ?? 0,
      unpaidStatements: Number(row.unpaidStatements),
      totalOwed: new Decimal(row.totalOwed ?? "0").toNumber(),
      oldestStatement: new Date(row.oldestStatement),
      paymentMethod: row.paymentMethod,
    }),
  );

  // Sort by totalOwed DESC (highest first) - AC-5
  liabilityByAuthor.sort((a, b) => b.totalOwed - a.totalOwed);

  // 6. Get advance balances (AC-6)
  // Query contracts where advance_amount > advance_recouped (active advances)
  const advanceResults = await db
    .select({
      authorId: authors.id,
      authorName: authors.name,
      contractId: contracts.id,
      titleName: titles.title,
      advanceAmount: contracts.advance_amount,
      advanceRecouped: contracts.advance_recouped,
    })
    .from(contracts)
    .innerJoin(authors, eq(contracts.author_id, authors.id))
    .innerJoin(titles, eq(contracts.title_id, titles.id))
    .where(
      and(
        eq(contracts.tenant_id, tenantId), // CRITICAL: tenant_id FIRST
        sql`${contracts.advance_amount} > ${contracts.advance_recouped}`,
      ),
    );

  const advanceBalances: AdvanceBalanceRow[] = advanceResults.map((row) => {
    const advanceAmount = new Decimal(row.advanceAmount ?? "0").toNumber();
    const advanceRecouped = new Decimal(row.advanceRecouped ?? "0").toNumber();
    return {
      authorId: row.authorId,
      authorName: row.authorName,
      contractId: row.contractId,
      titleName: row.titleName,
      advanceAmount,
      advanceRecouped,
      advanceRemaining: new Decimal(advanceAmount)
        .minus(advanceRecouped)
        .toNumber(),
    };
  });

  // Sort by advanceRemaining DESC (highest first)
  advanceBalances.sort((a, b) => b.advanceRemaining - a.advanceRemaining);

  return {
    totalUnpaidLiability,
    authorsWithPendingPayments,
    oldestUnpaidStatement,
    averagePaymentPerAuthor,
    liabilityByAuthor,
    advanceBalances,
  };
}

// ============================================================================
// Audit Log Queries (Story 6.5)
// ============================================================================

/**
 * Get paginated audit logs with filtering
 *
 * Story: 6.5 - Implement Audit Logging for Compliance
 * AC-6.5.5: Query function supports pagination and multi-column filtering
 * AC-6.5.6: Support filtering by action_type, resource_type, user, date range
 * AC-6.5.7: Results table shows: Timestamp, User, Action Type, Resource Type, Resource ID, Summary
 *
 * Required roles: finance, admin, owner (NOT editor, NOT author)
 *
 * CRITICAL: tenant_id filter is ALWAYS the FIRST condition
 *
 * @param filters - Filter parameters including pagination
 * @returns Paginated audit logs
 */
export async function getAuditLogs(
  filters: AuditLogFilters = {},
): Promise<PaginatedAuditLogs> {
  await requirePermission(["finance", "admin", "owner"]);
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Pagination defaults
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  // Build conditions array - tenant_id FIRST (CRITICAL)
  const conditions: ReturnType<typeof eq>[] = [
    eq(auditLogs.tenant_id, tenantId),
  ];

  // Action type filter (AC-6.5.6)
  if (filters.actionType) {
    conditions.push(eq(auditLogs.action_type, filters.actionType));
  }

  // Resource type filter (AC-6.5.6)
  if (filters.resourceType) {
    conditions.push(eq(auditLogs.resource_type, filters.resourceType));
  }

  // User filter (AC-6.5.6)
  if (filters.userId) {
    conditions.push(eq(auditLogs.user_id, filters.userId));
  }

  // Date range filter (AC-6.5.6)
  if (filters.startDate) {
    conditions.push(gte(auditLogs.created_at, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(auditLogs.created_at, filters.endDate));
  }

  const whereClause = and(...conditions);

  // Get total count for pagination
  const [countResult] = await db
    .select({ count: count() })
    .from(auditLogs)
    .where(whereClause);

  const total = Number(countResult?.count ?? 0);
  const totalPages = Math.ceil(total / pageSize);

  // Get paginated results with user join for display name
  const results = await db
    .select({
      id: auditLogs.id,
      createdAt: auditLogs.created_at,
      userId: auditLogs.user_id,
      userName: users.email, // Use email as fallback display name
      actionType: auditLogs.action_type,
      resourceType: auditLogs.resource_type,
      resourceId: auditLogs.resource_id,
      changes: auditLogs.changes,
      metadata: auditLogs.metadata,
      status: auditLogs.status,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.user_id, users.id))
    .where(whereClause)
    .orderBy(desc(auditLogs.created_at))
    .limit(pageSize)
    .offset(offset);

  // Map to AuditLogEntry type
  const items: AuditLogEntry[] = results.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    userId: row.userId,
    userName: row.userName,
    actionType: row.actionType,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    changes: row.changes as AuditLogEntry["changes"],
    metadata: row.metadata as AuditLogEntry["metadata"],
    status: row.status,
  }));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Get users for audit log user filter dropdown
 *
 * Story: 6.5 - Implement Audit Logging for Compliance
 * AC-6.5.6: Support filtering by user
 *
 * Required roles: finance, admin, owner
 *
 * @returns List of users who have audit log entries
 */
export async function getAuditLogUsers(): Promise<
  Array<{ id: string; email: string }>
> {
  await requirePermission(["finance", "admin", "owner"]);
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Get distinct users who have audit log entries
  const results = await db
    .selectDistinct({
      id: users.id,
      email: users.email,
    })
    .from(auditLogs)
    .innerJoin(users, eq(auditLogs.user_id, users.id))
    .where(eq(auditLogs.tenant_id, tenantId))
    .orderBy(users.email);

  return results;
}

/**
 * Export audit logs to CSV format
 *
 * Story: 6.5 - Implement Audit Logging for Compliance
 * AC-6.5.9: Export CSV functionality
 *
 * Required roles: finance, admin, owner
 *
 * @param filters - Filter parameters (without pagination - exports all matching)
 * @returns CSV string
 */
export async function exportAuditLogsCsv(
  filters: Omit<AuditLogFilters, "page" | "pageSize"> = {},
): Promise<string> {
  await requirePermission(["finance", "admin", "owner"]);
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  // Build conditions array - tenant_id FIRST (CRITICAL)
  const conditions: ReturnType<typeof eq>[] = [
    eq(auditLogs.tenant_id, tenantId),
  ];

  // Action type filter
  if (filters.actionType) {
    conditions.push(eq(auditLogs.action_type, filters.actionType));
  }

  // Resource type filter
  if (filters.resourceType) {
    conditions.push(eq(auditLogs.resource_type, filters.resourceType));
  }

  // User filter
  if (filters.userId) {
    conditions.push(eq(auditLogs.user_id, filters.userId));
  }

  // Date range filter
  if (filters.startDate) {
    conditions.push(gte(auditLogs.created_at, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(auditLogs.created_at, filters.endDate));
  }

  const whereClause = and(...conditions);

  // Get all results (no pagination for export)
  const results = await db
    .select({
      id: auditLogs.id,
      createdAt: auditLogs.created_at,
      userId: auditLogs.user_id,
      userName: users.email,
      actionType: auditLogs.action_type,
      resourceType: auditLogs.resource_type,
      resourceId: auditLogs.resource_id,
      changes: auditLogs.changes,
      metadata: auditLogs.metadata,
      status: auditLogs.status,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.user_id, users.id))
    .where(whereClause)
    .orderBy(desc(auditLogs.created_at));

  // CSV header
  const headers = [
    "Timestamp",
    "User",
    "Action Type",
    "Resource Type",
    "Resource ID",
    "Status",
    "Summary",
  ];

  // Escape CSV value
  const escapeCSV = (value: string | number | null): string => {
    if (value === null) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Generate summary from changes
  const generateSummary = (row: (typeof results)[0]): string => {
    const changes = row.changes as { before?: object; after?: object } | null;
    if (!changes) return "";

    if (row.actionType === "CREATE" && changes.after) {
      const keys = Object.keys(changes.after).slice(0, 3);
      return `Created with: ${keys.join(", ")}`;
    }
    if (row.actionType === "UPDATE" && changes.before && changes.after) {
      const changedKeys = Object.keys(changes.after).filter(
        (k) =>
          JSON.stringify((changes.before as Record<string, unknown>)[k]) !==
          JSON.stringify((changes.after as Record<string, unknown>)[k]),
      );
      return `Changed: ${changedKeys.slice(0, 3).join(", ")}`;
    }
    if (row.actionType === "DELETE" && changes.before) {
      return "Record deleted";
    }
    if (row.actionType === "APPROVE") {
      return "Approved";
    }
    if (row.actionType === "REJECT") {
      return "Rejected";
    }
    return "";
  };

  // Build CSV rows
  const rows = results.map((row) => [
    escapeCSV(row.createdAt.toISOString()),
    escapeCSV(row.userName ?? "System"),
    escapeCSV(row.actionType),
    escapeCSV(row.resourceType),
    escapeCSV(row.resourceId),
    escapeCSV(row.status),
    escapeCSV(generateSummary(row)),
  ]);

  // Combine header and rows
  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

// ============================================================================
// Dashboard Analytics Queries (Story 6.7)
// ============================================================================

/**
 * Get Owner/Admin Dashboard Data
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-1: Revenue trend (6 months), Top selling titles, Author performance, ISBN utilization trend
 *
 * Required roles: owner, admin
 *
 * CRITICAL: tenant_id filter is ALWAYS the FIRST condition
 *
 * @returns Owner/Admin dashboard data
 */
export async function getOwnerAdminDashboardData(): Promise<OwnerAdminDashboardData> {
  await requirePermission(["owner", "admin"]);
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const now = new Date();
  const sixMonthsAgo = subMonths(now, 6);
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().split("T")[0];

  // 1. Revenue trend (6 months)
  const revenueTrendResults = await db
    .select({
      yearMonth: sql<string>`to_char(${sales.sale_date}::date, 'YYYY-MM')`,
      revenue: sum(sales.total_amount),
    })
    .from(sales)
    .where(
      and(
        eq(sales.tenant_id, tenantId), // tenant_id FIRST
        gte(sales.sale_date, sixMonthsAgoStr),
      ),
    )
    .groupBy(sql`to_char(${sales.sale_date}::date, 'YYYY-MM')`)
    .orderBy(sql`to_char(${sales.sale_date}::date, 'YYYY-MM')`);

  // Build complete 6-month array including months with no data
  const revenueMap = new Map<string, number>();
  for (const row of revenueTrendResults) {
    if (row.yearMonth) {
      revenueMap.set(row.yearMonth, new Decimal(row.revenue ?? "0").toNumber());
    }
  }

  const revenueTrend: { month: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const yearMonth = format(monthDate, "yyyy-MM");
    const displayMonth = format(monthDate, "MMM yyyy");
    revenueTrend.push({
      month: displayMonth,
      revenue: revenueMap.get(yearMonth) ?? 0,
    });
  }

  // 2. Top selling titles (by revenue, last 6 months)
  const topTitlesResults = await db
    .select({
      titleId: sales.title_id,
      title: titles.title,
      units: sum(sales.quantity),
      revenue: sum(sales.total_amount),
    })
    .from(sales)
    .innerJoin(titles, eq(sales.title_id, titles.id))
    .where(
      and(
        eq(sales.tenant_id, tenantId),
        gte(sales.sale_date, sixMonthsAgoStr),
      ),
    )
    .groupBy(sales.title_id, titles.title)
    .orderBy(desc(sum(sales.total_amount)))
    .limit(5);

  const topSellingTitles = topTitlesResults.map((row) => ({
    titleId: row.titleId,
    title: row.title,
    units: Number(row.units) || 0,
    revenue: new Decimal(row.revenue ?? "0").toNumber(),
  }));

  // 3. Author performance (by revenue, last 6 months)
  const authorPerfResults = await db
    .select({
      authorId: authors.id,
      name: authors.name,
      revenue: sum(sales.total_amount),
    })
    .from(sales)
    .innerJoin(titles, eq(sales.title_id, titles.id))
    .innerJoin(contracts, eq(titles.id, contracts.title_id))
    .innerJoin(authors, eq(contracts.author_id, authors.id))
    .where(
      and(
        eq(sales.tenant_id, tenantId),
        gte(sales.sale_date, sixMonthsAgoStr),
      ),
    )
    .groupBy(authors.id, authors.name)
    .orderBy(desc(sum(sales.total_amount)))
    .limit(5);

  const authorPerformance = authorPerfResults.map((row) => ({
    authorId: row.authorId,
    name: row.name,
    revenue: new Decimal(row.revenue ?? "0").toNumber(),
  }));

  // 4. ISBN utilization trend (6 months) - % of ISBNs assigned each month
  const isbnTrendResults = await db
    .select({
      yearMonth: sql<string>`to_char(${isbns.assigned_at}, 'YYYY-MM')`,
      assignedCount: count(),
    })
    .from(isbns)
    .where(
      and(
        eq(isbns.tenant_id, tenantId),
        gte(isbns.assigned_at, sixMonthsAgo),
      ),
    )
    .groupBy(sql`to_char(${isbns.assigned_at}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${isbns.assigned_at}, 'YYYY-MM')`);

  // Get total ISBNs for utilization calculation
  const [totalIsbnResult] = await db
    .select({ count: count() })
    .from(isbns)
    .where(eq(isbns.tenant_id, tenantId));

  const totalIsbns = Number(totalIsbnResult?.count ?? 1);

  // Build utilization map
  const utilizationMap = new Map<string, number>();
  for (const row of isbnTrendResults) {
    if (row.yearMonth) {
      utilizationMap.set(
        row.yearMonth,
        new Decimal(Number(row.assignedCount))
          .div(totalIsbns)
          .mul(100)
          .toNumber(),
      );
    }
  }

  const isbnUtilizationTrend: { month: string; utilization: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const yearMonth = format(monthDate, "yyyy-MM");
    const displayMonth = format(monthDate, "MMM yyyy");
    isbnUtilizationTrend.push({
      month: displayMonth,
      utilization:
        Math.round((utilizationMap.get(yearMonth) ?? 0) * 10) / 10,
    });
  }

  return {
    revenueTrend,
    topSellingTitles,
    authorPerformance,
    isbnUtilizationTrend,
  };
}

/**
 * Get Finance Dashboard Data
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-2: Liability trend (12 months), Pending returns with urgency, Upcoming deadlines, Top authors by royalty
 *
 * Required roles: finance, admin, owner
 *
 * CRITICAL: tenant_id filter is ALWAYS the FIRST condition
 *
 * @returns Finance dashboard data
 */
export async function getFinanceDashboardData(): Promise<FinanceDashboardData> {
  await requirePermission(["finance", "admin", "owner"]);
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const now = new Date();
  const twelveMonthsAgo = subMonths(now, 12);

  // 1. Liability trend (12 months)
  const liabilityTrendResults = await db
    .select({
      yearMonth: sql<string>`to_char(${statements.created_at}, 'YYYY-MM')`,
      liability: sum(statements.net_payable),
    })
    .from(statements)
    .where(
      and(
        eq(statements.tenant_id, tenantId),
        gte(statements.created_at, twelveMonthsAgo),
      ),
    )
    .groupBy(sql`to_char(${statements.created_at}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${statements.created_at}, 'YYYY-MM')`);

  const liabilityMap = new Map<string, number>();
  for (const row of liabilityTrendResults) {
    if (row.yearMonth) {
      liabilityMap.set(
        row.yearMonth,
        new Decimal(row.liability ?? "0").toNumber(),
      );
    }
  }

  const liabilityTrend: { month: string; liability: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const yearMonth = format(monthDate, "yyyy-MM");
    const displayMonth = format(monthDate, "MMM yyyy");
    liabilityTrend.push({
      month: displayMonth,
      liability: liabilityMap.get(yearMonth) ?? 0,
    });
  }

  // 2. Pending returns with urgency (pending > 7 days = urgent)
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [pendingCountResult] = await db
    .select({ count: count() })
    .from(returns)
    .where(
      and(eq(returns.tenant_id, tenantId), eq(returns.status, "pending")),
    );

  const [urgentCountResult] = await db
    .select({ count: count() })
    .from(returns)
    .where(
      and(
        eq(returns.tenant_id, tenantId),
        eq(returns.status, "pending"),
        lt(returns.created_at, sevenDaysAgo),
      ),
    );

  const pendingReturns = {
    count: Number(pendingCountResult?.count ?? 0),
    urgent: Number(urgentCountResult?.count ?? 0),
  };

  // 3. Upcoming deadlines (quarter end + 30 days for statement generation)
  const currentQuarterEnd = endOfQuarter(now);
  const statementDeadline = new Date(currentQuarterEnd);
  statementDeadline.setDate(statementDeadline.getDate() + 30);

  const nextQuarterEnd = endOfQuarter(addMonths(now, 3));
  const nextStatementDeadline = new Date(nextQuarterEnd);
  nextStatementDeadline.setDate(nextStatementDeadline.getDate() + 30);

  const upcomingDeadlines: { date: Date; description: string }[] = [];
  if (statementDeadline > now) {
    upcomingDeadlines.push({
      date: statementDeadline,
      description: `Q${Math.ceil((currentQuarterEnd.getMonth() + 1) / 3)} ${currentQuarterEnd.getFullYear()} Statement Generation`,
    });
  }
  upcomingDeadlines.push({
    date: nextStatementDeadline,
    description: `Q${Math.ceil((nextQuarterEnd.getMonth() + 1) / 3)} ${nextQuarterEnd.getFullYear()} Statement Generation`,
  });

  // 4. Top authors by royalty owed
  const topAuthorsResults = await db
    .select({
      authorId: authors.id,
      name: authors.name,
      amount: sum(statements.net_payable),
    })
    .from(statements)
    .innerJoin(authors, eq(statements.author_id, authors.id))
    .where(eq(statements.tenant_id, tenantId))
    .groupBy(authors.id, authors.name)
    .orderBy(desc(sum(statements.net_payable)))
    .limit(5);

  const topAuthorsByRoyalty = topAuthorsResults.map((row) => ({
    authorId: row.authorId,
    name: row.name,
    amount: new Decimal(row.amount ?? "0").toNumber(),
  }));

  return {
    liabilityTrend,
    pendingReturns,
    upcomingDeadlines,
    topAuthorsByRoyalty,
  };
}

/**
 * Get Editor Dashboard Data
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-3: My titles this quarter, Recent sales, My ISBN assignments, Pending tasks
 *
 * Required roles: editor, finance, admin, owner
 *
 * CRITICAL: tenant_id filter is ALWAYS the FIRST condition
 *
 * @param userId - The editor's user ID for filtering "my" data
 * @returns Editor dashboard data
 */
export async function getEditorDashboardData(
  userId: string,
): Promise<EditorDashboardData> {
  await requirePermission(["editor", "finance", "admin", "owner"]);
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const now = new Date();
  const quarterStart = startOfQuarter(now);

  // 1. My titles this quarter (titles with ISBNs assigned by this user in this quarter)
  // Since titles don't track created_by, we use ISBN assignments as proxy for "my titles"
  const [myTitlesResult] = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${isbns.assigned_to_title_id})` })
    .from(isbns)
    .where(
      and(
        eq(isbns.tenant_id, tenantId),
        eq(isbns.assigned_by_user_id, userId),
        gte(isbns.assigned_at, quarterStart),
      ),
    );

  const myTitlesThisQuarter = Number(myTitlesResult?.count ?? 0);

  // 2. Recent sales (last 30 days for all titles in tenant - editors see all)
  const thirtyDaysAgo = subMonths(now, 1);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  const recentSalesResults = await db
    .select({
      titleId: sales.title_id,
      title: titles.title,
      units: sum(sales.quantity),
    })
    .from(sales)
    .innerJoin(titles, eq(sales.title_id, titles.id))
    .where(
      and(
        eq(sales.tenant_id, tenantId),
        gte(sales.sale_date, thirtyDaysAgoStr),
      ),
    )
    .groupBy(sales.title_id, titles.title)
    .orderBy(desc(sum(sales.quantity)))
    .limit(5);

  const recentSales = recentSalesResults.map((row) => ({
    titleId: row.titleId,
    title: row.title,
    units: Number(row.units) || 0,
  }));

  // 3. My ISBN assignments (assigned_by_user_id = this user)
  const [myIsbnResult] = await db
    .select({ count: count() })
    .from(isbns)
    .where(
      and(
        eq(isbns.tenant_id, tenantId),
        eq(isbns.assigned_by_user_id, userId),
      ),
    );

  const myISBNAssignments = Number(myIsbnResult?.count ?? 0);

  // 4. Pending tasks (titles without ISBNs)
  const [titlesWithoutIsbnResult] = await db
    .select({ count: count() })
    .from(titles)
    .leftJoin(isbns, eq(titles.id, isbns.assigned_to_title_id))
    .where(
      and(
        eq(titles.tenant_id, tenantId),
        isNull(isbns.id),
      ),
    );

  const pendingTasks: { type: string; count: number }[] = [
    {
      type: "Titles without ISBN",
      count: Number(titlesWithoutIsbnResult?.count ?? 0),
    },
  ];

  return {
    myTitlesThisQuarter,
    recentSales,
    myISBNAssignments,
    pendingTasks,
  };
}

/**
 * Get Author Portal Dashboard Data
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-4: Earnings timeline, Best performing titles, Advance recoupment progress, Next statement date
 *
 * Required roles: author (portal access)
 *
 * CRITICAL: tenant_id filter is ALWAYS the FIRST condition
 * CRITICAL: Data is filtered by authorId - authors only see their own data
 *
 * @param authorId - The author's ID for filtering
 * @returns Author portal dashboard data
 */
export async function getAuthorPortalDashboardData(
  authorId: string,
): Promise<AuthorPortalDashboardData> {
  // Note: Author portal access is checked at the route level
  // This query is called from portal routes which verify author access
  const db = await getDb();

  // Get tenantId from the author record
  const [authorRecord] = await db
    .select({ tenantId: authors.tenant_id })
    .from(authors)
    .where(eq(authors.id, authorId))
    .limit(1);

  if (!authorRecord) {
    return {
      earningsTimeline: [],
      bestPerformingTitles: [],
      advanceRecoupmentProgress: { total: 0, recouped: 0, remaining: 0 },
      nextStatementDate: null,
    };
  }

  const tenantId = authorRecord.tenantId;
  const now = new Date();

  // 1. Earnings timeline (quarterly, last 8 quarters)
  const twoYearsAgo = subMonths(now, 24);
  const twoYearsAgoStr = twoYearsAgo.toISOString().split("T")[0];

  const earningsResults = await db
    .select({
      yearQuarter: sql<string>`to_char(${statements.period_end}::date, 'YYYY-"Q"Q')`,
      earnings: sum(statements.net_payable),
    })
    .from(statements)
    .where(
      and(
        eq(statements.tenant_id, tenantId),
        eq(statements.author_id, authorId),
        sql`${statements.period_end} >= ${twoYearsAgoStr}`,
      ),
    )
    .groupBy(sql`to_char(${statements.period_end}::date, 'YYYY-"Q"Q')`)
    .orderBy(sql`to_char(${statements.period_end}::date, 'YYYY-"Q"Q')`);

  const earningsTimeline = earningsResults.map((row) => ({
    quarter: row.yearQuarter || "",
    earnings: new Decimal(row.earnings ?? "0").toNumber(),
  }));

  // 2. Best performing titles (by units sold)
  const bestTitlesResults = await db
    .select({
      titleId: titles.id,
      title: titles.title,
      units: sum(sales.quantity),
    })
    .from(sales)
    .innerJoin(titles, eq(sales.title_id, titles.id))
    .innerJoin(contracts, eq(titles.id, contracts.title_id))
    .where(
      and(
        eq(sales.tenant_id, tenantId),
        eq(contracts.author_id, authorId),
      ),
    )
    .groupBy(titles.id, titles.title)
    .orderBy(desc(sum(sales.quantity)))
    .limit(5);

  const bestPerformingTitles = bestTitlesResults.map((row) => ({
    titleId: row.titleId,
    title: row.title,
    units: Number(row.units) || 0,
  }));

  // 3. Advance recoupment progress
  const advanceResults = await db
    .select({
      advanceAmount: contracts.advance_amount,
      advanceRecouped: contracts.advance_recouped,
    })
    .from(contracts)
    .where(
      and(
        eq(contracts.tenant_id, tenantId),
        eq(contracts.author_id, authorId),
      ),
    );

  let totalAdvance = new Decimal(0);
  let totalRecouped = new Decimal(0);
  for (const row of advanceResults) {
    totalAdvance = totalAdvance.plus(row.advanceAmount ?? "0");
    totalRecouped = totalRecouped.plus(row.advanceRecouped ?? "0");
  }

  const advanceRecoupmentProgress = {
    total: totalAdvance.toNumber(),
    recouped: totalRecouped.toNumber(),
    remaining: totalAdvance.minus(totalRecouped).toNumber(),
  };

  // 4. Next statement date (estimate: end of current quarter + 30 days)
  const currentQuarterEnd = endOfQuarter(now);
  const nextStatementDate = new Date(currentQuarterEnd);
  nextStatementDate.setDate(nextStatementDate.getDate() + 30);

  return {
    earningsTimeline,
    bestPerformingTitles,
    advanceRecoupmentProgress,
    nextStatementDate,
  };
}
