/**
 * Reports Module Type Definitions
 *
 * TypeScript interfaces for revenue and liability metrics.
 *
 * Story: 6.1 - Implement Revenue and Liability Tracking
 * AC: 1-6 (Revenue and Liability data structures)
 *
 * Per tech-spec-epic-6.md interface specifications.
 */

/**
 * Revenue breakdown by time period
 */
export interface RevenuePeriodBreakdown {
  /** Period label (e.g., "Jan 2025", "Q1 2025", "Week 1") */
  period: string;
  /** Revenue amount for this period */
  amount: number;
}

/**
 * Revenue breakdown by format with percentage
 */
export interface RevenueFormatBreakdown {
  /** Format type: physical, ebook, audiobook */
  format: string;
  /** Revenue amount for this format */
  amount: number;
  /** Percentage of total revenue (0-100) */
  percentage: number;
}

/**
 * Revenue breakdown by channel with percentage
 */
export interface RevenueChannelBreakdown {
  /** Channel type: retail, wholesale, direct, distributor */
  channel: string;
  /** Revenue amount for this channel */
  amount: number;
  /** Percentage of total revenue (0-100) */
  percentage: number;
}

/**
 * Complete revenue metrics for dashboard and reports
 *
 * AC-1: Total revenue from all sales
 * AC-2: Revenue filtered by period
 * AC-3: Revenue breakdown by format with percentages
 * AC-4: Revenue breakdown by channel with percentages
 */
export interface RevenueMetrics {
  /** Total revenue amount across all periods */
  totalRevenue: number;
  /** Revenue broken down by time period */
  revenueByPeriod: RevenuePeriodBreakdown[];
  /** Revenue broken down by format with percentages */
  revenueByFormat: RevenueFormatBreakdown[];
  /** Revenue broken down by channel with percentages */
  revenueByChannel: RevenueChannelBreakdown[];
}

/**
 * Liability breakdown by author
 */
export interface LiabilityAuthorBreakdown {
  /** Author UUID */
  authorId: string;
  /** Author display name */
  authorName: string;
  /** Total liability amount owed to this author */
  amount: number;
  /** Number of titles associated with this author */
  titlesCount: number;
  /** Number of unpaid statements */
  unpaidStatementsCount: number;
}

/**
 * Complete liability metrics for dashboard and reports
 *
 * AC-5: Total royalty liability from unpaid statements
 * AC-6: Liability grouped by author
 */
export interface LiabilityMetrics {
  /** Total liability amount (sum of net_payable from unpaid statements) */
  totalLiability: number;
  /** Liability broken down by author */
  liabilityByAuthor: LiabilityAuthorBreakdown[];
  /** Total amount already paid to authors */
  paidAmount: number;
  /** Total unpaid amount owed to authors */
  unpaidAmount: number;
}

/**
 * Dashboard stats card data for finance dashboard
 *
 * AC-7: Stats cards for Total Revenue, Total Liability, Upcoming Deadline
 */
export interface FinanceDashboardStats {
  /** Current month/period total revenue */
  currentRevenue: number;
  /** Revenue trend compared to previous period (percentage) */
  revenueTrend?: number;
  /** Total unpaid liability */
  totalLiability: number;
  /** Liability trend compared to previous period (percentage) */
  liabilityTrend?: number;
  /** Next statement generation deadline date */
  nextStatementDeadline: Date | null;
  /** Days until next deadline */
  daysUntilDeadline?: number;
}

/**
 * Period type for revenue filtering
 */
export type ReportPeriod = "day" | "week" | "month" | "quarter" | "year";

/**
 * Date range filter for reports
 */
export interface DateRangeFilter {
  /** Start date (inclusive) */
  startDate: Date;
  /** End date (inclusive) */
  endDate: Date;
}

/**
 * Sales report filter parameters
 *
 * Story: 6.2 - Build Sales Reports with Multi-Dimensional Filtering
 * AC: 2, 3, 4 (Date range, multi-select filters, grouping options)
 */
export interface SalesReportFilters {
  /** Start date for the report period (required) */
  startDate: Date;
  /** End date for the report period (required) */
  endDate: Date;
  /** Optional title IDs to filter by */
  titleIds?: string[];
  /** Optional author IDs to filter by */
  authorIds?: string[];
  /** Format filter: physical, ebook, audiobook, or all */
  format?: "physical" | "ebook" | "audiobook" | "all";
  /** Channel filter: retail, wholesale, direct, distributor, or all */
  channel?: "retail" | "wholesale" | "direct" | "distributor" | "all";
  /** How to group the results */
  groupBy: "title" | "format" | "channel" | "date";
}

/**
 * Single row in the sales report results
 *
 * Story: 6.2 - Build Sales Reports with Multi-Dimensional Filtering
 * AC: 5 (Results table shows: Group, Total Units, Total Revenue, Avg Unit Price)
 */
export interface SalesReportRow {
  /** Unique key for the group (ID or formatted value) */
  groupKey: string;
  /** Human-readable label for the group */
  groupLabel: string;
  /** Total units sold in this group */
  totalUnits: number;
  /** Total revenue in this group */
  totalRevenue: number;
  /** Average unit price (totalRevenue / totalUnits) */
  avgUnitPrice: number;
}

/**
 * Complete sales report result
 *
 * Story: 6.2 - Build Sales Reports with Multi-Dimensional Filtering
 * AC: 5, 6 (Results table with totals row)
 */
export interface SalesReportResult {
  /** Individual grouped rows */
  rows: SalesReportRow[];
  /** Totals across all rows */
  totals: SalesReportRow;
}

/**
 * ISBN pool metrics for status report
 *
 * Story: 6.3 - Build ISBN Pool Status Report
 * Story: 7.6 - Remove ISBN Type Distinction (unified stats, no physical/ebook breakdown)
 * AC: 2 (Stats cards with available/assigned/total)
 * AC: 3 (Utilization percentage)
 * AC: 7 (Burn rate - ISBNs per month)
 * AC: 8 (Estimated runout date)
 */
export interface ISBNPoolMetrics {
  /** Total ISBN counts (Story 7.6: unified, no type distinction) */
  available: number;
  assigned: number;
  total: number;
  /** Overall utilization percentage (assigned / total * 100) */
  utilizationPercent: number;
  /** ISBNs assigned per month (6-month average) */
  burnRate: number;
  /** Estimated date when pool will be exhausted */
  estimatedRunout: Date | null;
}

/**
 * Monthly assignment history for timeline chart
 *
 * Story: 6.3 - Build ISBN Pool Status Report
 * AC: 5 (Timeline chart shows assignments over time)
 */
export interface ISBNAssignmentHistoryItem {
  /** Month label (e.g., "Jan 2025") */
  month: string;
  /** Number of ISBNs assigned in this month */
  assigned: number;
}

/**
 * Author liability row for royalty liability report
 *
 * Story: 6.4 - Build Royalty Liability Summary Report
 * AC: 4 (Liability by author table shows: Author, Titles, Unpaid Statements, Total Owed, Oldest Statement)
 */
export interface AuthorLiabilityRow {
  /** Author UUID */
  authorId: string;
  /** Author display name */
  authorName: string;
  /** Number of titles associated with this author */
  titleCount: number;
  /** Number of unpaid statements */
  unpaidStatements: number;
  /** Total amount owed to this author */
  totalOwed: number;
  /** Oldest unpaid statement date */
  oldestStatement: Date;
  /** Payment method preference */
  paymentMethod: string | null;
}

/**
 * Advance balance row for advance tracking section
 *
 * Story: 6.4 - Build Royalty Liability Summary Report
 * AC: 6 (Advance tracking section shows authors with active advances and remaining balances)
 */
export interface AdvanceBalanceRow {
  /** Author UUID */
  authorId: string;
  /** Author display name */
  authorName: string;
  /** Contract UUID */
  contractId: string;
  /** Title name */
  titleName: string;
  /** Original advance amount */
  advanceAmount: number;
  /** Amount recouped so far */
  advanceRecouped: number;
  /** Remaining balance (advanceAmount - advanceRecouped) */
  advanceRemaining: number;
}

/**
 * Complete royalty liability summary for report
 *
 * Story: 6.4 - Build Royalty Liability Summary Report
 * AC: 2 (Summary stats show: Total Unpaid Liability, Authors with Pending Payments, Oldest Unpaid Statement)
 * AC: 3 (Average payment per author is calculated)
 * AC: 4 (Liability by author table)
 * AC: 6 (Advance tracking section)
 */
export interface RoyaltyLiabilitySummary {
  /** Total unpaid liability amount */
  totalUnpaidLiability: number;
  /** Number of authors with pending payments */
  authorsWithPendingPayments: number;
  /** Oldest unpaid statement date */
  oldestUnpaidStatement: Date | null;
  /** Average payment per author (totalUnpaidLiability / authorsWithPendingPayments) */
  averagePaymentPerAuthor: number;
  /** Liability breakdown by author */
  liabilityByAuthor: AuthorLiabilityRow[];
  /** Active advance balances */
  advanceBalances: AdvanceBalanceRow[];
}

// ============================================================================
// Audit Log Types (Story 6.5)
// ============================================================================

/**
 * Audit log filter parameters
 *
 * Story: 6.5 - Implement Audit Logging for Compliance
 * AC-6.5.6: Support filtering by action_type, resource_type, user, date range
 */
export interface AuditLogFilters {
  /** Filter by action type (CREATE, UPDATE, DELETE, APPROVE, REJECT) */
  actionType?: string;
  /** Filter by resource type (author, title, sale, return, statement, contract, user) */
  resourceType?: string;
  /** Filter by user ID */
  userId?: string;
  /** Start date for date range filter */
  startDate?: Date;
  /** End date for date range filter */
  endDate?: Date;
  /** Page number for pagination (1-indexed) */
  page?: number;
  /** Page size for pagination */
  pageSize?: number;
}

/**
 * Single audit log entry with user info
 *
 * Story: 6.5 - Implement Audit Logging for Compliance
 * AC-6.5.7: Results table shows: Timestamp, User, Action Type, Resource Type, Resource ID, Summary
 */
export interface AuditLogEntry {
  /** Audit log ID */
  id: string;
  /** Timestamp when the action occurred */
  createdAt: Date;
  /** User who performed the action (null for system actions) */
  userId: string | null;
  /** User name/email for display */
  userName: string | null;
  /** Action type: CREATE, UPDATE, DELETE, APPROVE, REJECT */
  actionType: string;
  /** Resource type: author, title, sale, return, statement, contract, user */
  resourceType: string;
  /** Resource ID (UUID) */
  resourceId: string | null;
  /** Before/after state changes */
  changes: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  } | null;
  /** Additional metadata */
  metadata: Record<string, unknown> | null;
  /** Operation status: success or failure */
  status: string;
}

/**
 * Paginated audit log results
 *
 * Story: 6.5 - Implement Audit Logging for Compliance
 * AC-6.5.7: Results table with pagination
 */
export interface PaginatedAuditLogs {
  /** Array of audit log entries */
  items: AuditLogEntry[];
  /** Total count of matching entries */
  total: number;
  /** Current page number */
  page: number;
  /** Page size */
  pageSize: number;
  /** Total number of pages */
  totalPages: number;
}

// ============================================================================
// Dashboard Analytics Types (Story 6.7)
// ============================================================================

/**
 * Owner/Admin Dashboard Data
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-1: Revenue trend (6 months), Top selling titles, Author performance, ISBN utilization trend
 */
export interface OwnerAdminDashboardData {
  /** Revenue trend over the last 6 months */
  revenueTrend: { month: string; revenue: number }[];
  /** Top 5 selling titles by revenue */
  topSellingTitles: {
    titleId: string;
    title: string;
    units: number;
    revenue: number;
  }[];
  /** Top 5 authors by revenue */
  authorPerformance: { authorId: string; name: string; revenue: number }[];
  /** ISBN utilization trend over the last 6 months */
  isbnUtilizationTrend: { month: string; utilization: number }[];
}

/**
 * Finance Dashboard Data
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-2: Liability trend (12 months), Pending returns with urgency, Upcoming deadlines, Top authors by royalty
 */
export interface FinanceDashboardData {
  /** Liability trend over the last 12 months */
  liabilityTrend: { month: string; liability: number }[];
  /** Pending returns count with urgency breakdown */
  pendingReturns: { count: number; urgent: number };
  /** Upcoming deadlines (statement generation, payments) */
  upcomingDeadlines: { date: Date; description: string }[];
  /** Top 5 authors by royalty owed */
  topAuthorsByRoyalty: { authorId: string; name: string; amount: number }[];
}

/**
 * Editor Dashboard Data
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-3: My titles this quarter, Recent sales, My ISBN assignments, Pending tasks
 */
export interface EditorDashboardData {
  /** Number of titles created by the editor this quarter */
  myTitlesThisQuarter: number;
  /** Recent sales for the editor's titles */
  recentSales: { titleId: string; title: string; units: number }[];
  /** Number of ISBN assignments made by the editor */
  myISBNAssignments: number;
  /** Pending tasks (titles without ISBNs, etc.) */
  pendingTasks: { type: string; count: number }[];
}

/**
 * Author Portal Dashboard Data
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-4: Earnings timeline, Best performing titles, Advance recoupment progress, Next statement date
 */
export interface AuthorPortalDashboardData {
  /** Quarterly earnings timeline */
  earningsTimeline: { quarter: string; earnings: number }[];
  /** Top 5 best performing titles by units sold */
  bestPerformingTitles: { titleId: string; title: string; units: number }[];
  /** Advance recoupment progress (total, recouped, remaining) */
  advanceRecoupmentProgress: {
    total: number;
    recouped: number;
    remaining: number;
  };
  /** Next statement date (or null if none scheduled) */
  nextStatementDate: Date | null;
}

// ============================================================================
// Accounts Receivable Types (Story 8.5)
// ============================================================================

/**
 * AR Summary statistics for dashboard
 *
 * Story: 8.5 - Build Accounts Receivable Dashboard
 * AC-8.5.2: Summary stats cards showing total receivables, current, overdue, etc.
 */
export interface ARSummary {
  /** Total receivables - sum of all balance_due across open invoices */
  totalReceivables: string;
  /** Current amount - not yet due (due_date >= today) */
  currentAmount: string;
  /** Overdue amount - past due (due_date < today and status != 'paid') */
  overdueAmount: string;
  /** Average days to pay - calculated from paid invoices */
  averageDaysToPay: number;
  /** Number of open invoices (balance_due > 0) */
  openInvoiceCount: number;
}

/**
 * Aging bucket type union
 *
 * Story: 8.5 - Build Accounts Receivable Dashboard
 * AC-8.5.3: Aging report with standard AR buckets
 */
export type AgingBucketType = "current" | "1-30" | "31-60" | "61-90" | "90+";

/**
 * Aging report row for a single customer
 *
 * Story: 8.5 - Build Accounts Receivable Dashboard
 * AC-8.5.3: Aging report table with customer + buckets + total
 */
export interface AgingReportRow {
  /** Customer contact ID */
  customerId: string;
  /** Customer display name */
  customerName: string;
  /** Current bucket (0 days past due) */
  current: string;
  /** 1-30 days past due */
  days1to30: string;
  /** 31-60 days past due */
  days31to60: string;
  /** 61-90 days past due */
  days61to90: string;
  /** 90+ days past due */
  days90plus: string;
  /** Total outstanding for this customer */
  total: string;
}

/**
 * Customer AR detail for drill-down view
 *
 * Story: 8.5 - Build Accounts Receivable Dashboard
 * AC-8.5.4: Customer drill-down showing invoices and payment history
 */
export interface CustomerARDetail {
  /** Customer contact ID */
  customerId: string;
  /** Customer display name */
  customerName: string;
  /** List of open invoices for this customer */
  invoices: CustomerInvoiceDetail[];
  /** Payment history summary */
  paymentHistory: {
    /** Total amount ever billed to this customer */
    totalBilled: string;
    /** Total amount paid by this customer */
    totalPaid: string;
    /** Average days to pay for paid invoices */
    avgDaysToPay: number;
  };
}

/**
 * Invoice detail within customer AR drill-down
 *
 * Story: 8.5 - Build Accounts Receivable Dashboard
 * AC-8.5.4: Invoice list in customer drill-down
 */
export interface CustomerInvoiceDetail {
  /** Invoice UUID */
  id: string;
  /** Invoice number (e.g., INV-20251206-0001) */
  invoiceNumber: string;
  /** Invoice date */
  invoiceDate: Date;
  /** Due date */
  dueDate: Date;
  /** Invoice total */
  total: string;
  /** Balance due */
  balanceDue: string;
  /** Invoice status */
  status: string;
  /** Days overdue (0 if current) */
  daysOverdue: number;
}

/**
 * Tenant info for report headers (PDF export)
 *
 * Story: 8.5 - Build Accounts Receivable Dashboard
 * AC-8.5.7: PDF export with company name header
 */
export interface TenantForReport {
  /** Tenant name (used as company name in reports) */
  name: string;
}
