# Epic Technical Specification: Financial Reporting & Analytics

Date: 2025-12-01
Author: BMad
Epic ID: 6
Status: Draft

---

## Overview

Epic 6 delivers comprehensive financial reporting and analytics capabilities for Salina ERP, enabling publishing companies to gain actionable insights into their business operations. This epic implements the final set of functional requirements (FR67-81), completing the MVP feature set.

The epic focuses on four key areas:
1. **Financial Tracking** - Revenue and royalty liability monitoring with real-time aggregations
2. **Reporting Suite** - Multi-dimensional sales reports, ISBN pool status, and royalty liability summaries with export capabilities
3. **Compliance Infrastructure** - Audit logging for all financial transactions and data modifications
4. **Analytics Dashboards** - Role-specific visualizations providing actionable insights for each user persona

This epic builds upon the complete data foundation established in Epics 1-5, aggregating and visualizing sales transactions, royalty statements, ISBN assignments, and user activities into meaningful business intelligence.

## Objectives and Scope

**In Scope:**

- Revenue tracking queries with period, format, and channel breakdowns (FR67)
- Royalty liability calculation and tracking by author (FR68, FR69)
- Sales report builder with multi-dimensional filtering and grouping (FR72)
- CSV export functionality for all reports (FR75)
- ISBN pool status reporting with utilization metrics and alerts (FR73)
- Royalty liability summary report across all authors (FR74)
- Audit logging infrastructure for compliance (FR71, FR79)
- Background job monitoring dashboard (FR81)
- Role-based dashboard enhancements with analytics (FR76)
- Interactive charts using Recharts

**Out of Scope:**

- Custom report builder (future Growth feature)
- Saved report configurations (future enhancement)
- PDF export for reports (deferred - statements already have PDF)
- Advanced BI integrations (future Vision feature)
- Real-time streaming analytics (current: cached/refreshed data)
- Multi-currency support (future Growth feature)
- Predictive analytics / AI features (future Vision feature)

## System Architecture Alignment

**Architecture Pattern:** Feature-based modules within the modular monolith structure

**New Module:** `src/modules/reports/` - Centralized reporting logic and components

**Components Affected:**
- `src/app/(dashboard)/reports/` - New report pages (sales, isbn-pool, royalty-liability)
- `src/app/(dashboard)/admin/` - Audit logs and system monitoring pages
- `src/app/(dashboard)/dashboard/` - Enhanced role-based dashboards
- `src/modules/reports/` - Report queries, actions, and components
- `src/db/schema/audit-logs.ts` - New audit logging table
- `src/lib/audit.ts` - Centralized audit logging utility
- `src/components/charts/` - Reusable chart components

**Technology Stack (per architecture.md):**
- **Charts:** Recharts (React-based, declarative, excellent Next.js integration)
- **Data Tables:** TanStack Table 8.21+ (already in use)
- **Currency:** Decimal.js for aggregations, Intl.NumberFormat for display
- **Dates:** date-fns 4.1+ with @date-fns/tz for period calculations
- **Export:** Native CSV generation (no additional dependencies)

**Data Flow:**
```
User Request → Server Component → Report Query (tenant-scoped) → Aggregation → Chart/Table Render
                                                              ↓
                                                         CSV Export (Server Action)
```

**Caching Strategy:**
- Report queries use React Server Components with automatic caching
- Dashboard metrics cached with 60-second revalidation
- Audit logs: No caching (real-time data required)

## Detailed Design

### Services and Modules

| Module | Responsibility | Key Files |
|--------|----------------|-----------|
| `src/modules/reports/` | Centralized reporting queries, aggregations, and export actions | `queries.ts`, `actions.ts`, `types.ts`, `schema.ts` |
| `src/modules/reports/components/` | Report UI components (filters, tables, charts) | `sales-report.tsx`, `isbn-report.tsx`, `liability-report.tsx`, `report-filters.tsx` |
| `src/components/charts/` | Reusable chart components built on Recharts | `bar-chart.tsx`, `line-chart.tsx`, `pie-chart.tsx`, `area-chart.tsx` |
| `src/lib/audit.ts` | Centralized audit logging utility | `logAuditEvent()` function |
| `src/db/schema/audit-logs.ts` | Audit log database schema | `auditLogs` table definition |
| `src/modules/admin/` | System administration (audit viewer, job monitor) | `components/`, `queries.ts` |

**New Route Structure:**

```
src/app/(dashboard)/
├── reports/
│   ├── page.tsx              # Reports index/overview
│   ├── sales/
│   │   └── page.tsx          # Sales report builder (Story 6.2)
│   ├── isbn-pool/
│   │   └── page.tsx          # ISBN pool status (Story 6.3)
│   └── royalty-liability/
│       └── page.tsx          # Royalty liability summary (Story 6.4)
├── admin/
│   ├── audit-logs/
│   │   └── page.tsx          # Audit log viewer (Story 6.5)
│   └── system/
│       └── page.tsx          # Background job monitor (Story 6.6)
└── dashboard/
    └── page.tsx              # Enhanced role-based dashboard (Story 6.7)
```

### Data Models and Contracts

**New Table: `audit_logs`**

```typescript
// src/db/schema/audit-logs.ts
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenant_id: uuid("tenant_id").notNull().references(() => tenants.id),
  user_id: uuid("user_id").references(() => users.id),
  action_type: text("action_type").notNull(), // CREATE, UPDATE, DELETE, APPROVE, REJECT, VIEW
  resource_type: text("resource_type").notNull(), // author, title, sale, return, statement, contract, user
  resource_id: uuid("resource_id"),
  changes: jsonb("changes"), // { before: {...}, after: {...} } for updates
  metadata: jsonb("metadata"), // Additional context (IP, user agent, etc.)
  status: text("status").notNull().default("success"), // success, failure
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Indexes for query performance
export const auditLogsIndexes = {
  tenantIdx: index("audit_logs_tenant_idx").on(auditLogs.tenant_id),
  userIdx: index("audit_logs_user_idx").on(auditLogs.user_id),
  resourceTypeIdx: index("audit_logs_resource_type_idx").on(auditLogs.resource_type),
  createdAtIdx: index("audit_logs_created_at_idx").on(auditLogs.created_at),
};
```

**Report Data Types:**

```typescript
// src/modules/reports/types.ts

// Revenue Tracking (Story 6.1)
export interface RevenueMetrics {
  totalRevenue: number;
  revenueByPeriod: { period: string; amount: number }[];
  revenueByFormat: { format: string; amount: number; percentage: number }[];
  revenueByChannel: { channel: string; amount: number; percentage: number }[];
}

export interface LiabilityMetrics {
  totalLiability: number;
  liabilityByAuthor: { authorId: string; authorName: string; amount: number }[];
  paidAmount: number;
  unpaidAmount: number;
}

// Sales Report (Story 6.2)
export interface SalesReportFilters {
  startDate: Date;
  endDate: Date;
  titleIds?: string[];
  authorIds?: string[];
  format?: "physical" | "ebook" | "audiobook" | "all";
  channel?: "retail" | "wholesale" | "direct" | "distributor" | "all";
  groupBy: "title" | "format" | "channel" | "date";
}

export interface SalesReportRow {
  groupKey: string;
  groupLabel: string;
  totalUnits: number;
  totalRevenue: number;
  avgUnitPrice: number;
}

// ISBN Pool Report (Story 6.3)
export interface ISBNPoolMetrics {
  physical: { available: number; assigned: number; total: number };
  ebook: { available: number; assigned: number; total: number };
  utilizationPercent: number;
  burnRate: number; // ISBNs assigned per month
  estimatedRunout: Date | null; // When pool will be exhausted
}

// Royalty Liability Report (Story 6.4)
export interface RoyaltyLiabilitySummary {
  totalUnpaidLiability: number;
  authorsWithPendingPayments: number;
  oldestUnpaidStatement: Date | null;
  averagePaymentPerAuthor: number;
  liabilityByAuthor: AuthorLiabilityRow[];
  advanceBalances: AdvanceBalanceRow[];
}

export interface AuthorLiabilityRow {
  authorId: string;
  authorName: string;
  titleCount: number;
  unpaidStatements: number;
  totalOwed: number;
  oldestStatement: Date;
  paymentMethod: string | null;
}

export interface AdvanceBalanceRow {
  authorId: string;
  authorName: string;
  contractId: string;
  titleName: string;
  advanceAmount: number;
  advanceRecouped: number;
  advanceRemaining: number;
}

// Audit Log (Story 6.5)
export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userName: string | null;
  actionType: string;
  resourceType: string;
  resourceId: string | null;
  changes: { before?: Record<string, unknown>; after?: Record<string, unknown> } | null;
  metadata: Record<string, unknown> | null;
  status: string;
  createdAt: Date;
}

export interface AuditLogFilters {
  userId?: string;
  actionType?: string;
  resourceType?: string;
  startDate?: Date;
  endDate?: Date;
}
```

### APIs and Interfaces

**Report Queries (Server Components):**

```typescript
// src/modules/reports/queries.ts

// Revenue & Liability (Story 6.1)
export async function getRevenueMetrics(
  tenantId: string,
  period: "day" | "week" | "month" | "quarter" | "year"
): Promise<RevenueMetrics>;

export async function getLiabilityMetrics(tenantId: string): Promise<LiabilityMetrics>;

// Sales Report (Story 6.2)
export async function getSalesReport(
  tenantId: string,
  filters: SalesReportFilters
): Promise<{ rows: SalesReportRow[]; totals: SalesReportRow }>;

// ISBN Pool (Story 6.3)
export async function getISBNPoolMetrics(tenantId: string): Promise<ISBNPoolMetrics>;

export async function getISBNAssignmentHistory(
  tenantId: string,
  months: number
): Promise<{ month: string; assigned: number }[]>;

// Royalty Liability (Story 6.4)
export async function getRoyaltyLiabilitySummary(
  tenantId: string
): Promise<RoyaltyLiabilitySummary>;

// Audit Logs (Story 6.5)
export async function getAuditLogs(
  tenantId: string,
  filters: AuditLogFilters,
  page: number,
  pageSize: number
): Promise<{ logs: AuditLogEntry[]; total: number }>;
```

**Server Actions:**

```typescript
// src/modules/reports/actions.ts
"use server";

// CSV Export (Story 6.2)
export async function exportSalesReportCSV(
  filters: SalesReportFilters
): Promise<ActionResult<string>>; // Returns CSV string

export async function exportLiabilityReportCSV(): Promise<ActionResult<string>>;

export async function exportAuditLogsCSV(
  filters: AuditLogFilters
): Promise<ActionResult<string>>;

// src/lib/audit.ts
export async function logAuditEvent(params: {
  tenantId: string;
  userId: string | null;
  actionType: "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT" | "VIEW";
  resourceType: string;
  resourceId?: string;
  changes?: { before?: unknown; after?: unknown };
  metadata?: Record<string, unknown>;
  status?: "success" | "failure";
}): Promise<void>;
```

**Dashboard Queries (Story 6.7):**

```typescript
// src/modules/reports/queries.ts

// Role-specific dashboard data
export async function getOwnerAdminDashboardData(tenantId: string): Promise<{
  revenueTrend: { month: string; revenue: number }[];
  topSellingTitles: { titleId: string; title: string; units: number; revenue: number }[];
  authorPerformance: { authorId: string; name: string; revenue: number }[];
  isbnUtilizationTrend: { month: string; utilization: number }[];
  recentActivity: AuditLogEntry[];
}>;

export async function getFinanceDashboardData(tenantId: string): Promise<{
  liabilityTrend: { month: string; liability: number }[];
  pendingReturns: { count: number; urgent: number };
  upcomingDeadlines: { date: Date; description: string }[];
  topAuthorsByRoyalty: { authorId: string; name: string; amount: number }[];
}>;

export async function getEditorDashboardData(tenantId: string, userId: string): Promise<{
  myTitlesThisQuarter: number;
  recentSales: { titleId: string; title: string; units: number }[];
  myISBNAssignments: number;
  pendingTasks: { type: string; count: number }[];
}>;

export async function getAuthorPortalDashboardData(
  tenantId: string,
  authorId: string
): Promise<{
  earningsTimeline: { quarter: string; earnings: number }[];
  bestPerformingTitles: { titleId: string; title: string; units: number }[];
  advanceRecoupmentProgress: { total: number; recouped: number; remaining: number };
  nextStatementDate: Date | null;
}>;
```

### Workflows and Sequencing

**Report Generation Flow:**

```
1. User navigates to /reports/sales
2. Server Component loads initial data (current month, default grouping)
3. User adjusts filters (date range, titles, format, channel, grouping)
4. Client-side filter state updates
5. Form submission triggers Server Action or navigation with query params
6. Server re-fetches with new filters
7. Results displayed in table + charts
8. User clicks "Export CSV" → Server Action generates CSV → Download triggered
```

**Audit Logging Flow:**

```
1. User performs action (e.g., approveReturn)
2. Server Action executes business logic
3. On success: logAuditEvent() called with action details
4. Audit log inserted asynchronously (non-blocking)
5. Original action returns result to user
6. Audit log visible in /admin/audit-logs
```

**Dashboard Refresh Flow:**

```
1. User loads dashboard
2. Server Component fetches role-appropriate data
3. Data cached with 60-second revalidation
4. Charts render with loading skeletons
5. User can manually refresh via button
6. Periodic auto-refresh (optional, 5-minute interval)
```

**Inngest Job Monitoring Flow (Story 6.6):**

```
1. Admin navigates to /admin/system
2. Server fetches job status from Inngest API
3. Displays active, queued, completed, failed jobs
4. Admin can view job details (inputs, outputs, errors)
5. Admin can retry failed jobs via Inngest dashboard link
6. System health checks run against external services
```

## Non-Functional Requirements

### Performance

**Response Time Targets (per PRD):**

| Operation | Target | Notes |
|-----------|--------|-------|
| Dashboard load | < 2 seconds | Role-specific data fetch |
| Report generation | < 3 seconds | Standard date ranges |
| Large report (1 year) | < 5 seconds | With pagination |
| CSV export | < 3 seconds | Up to 10,000 rows |
| Audit log query | < 2 seconds | With filters and pagination |
| Chart rendering | < 500ms | After data load |

**Query Optimization Strategies:**

- **Aggregation queries**: Use SQL `GROUP BY` with appropriate indexes rather than in-memory aggregation
- **Date range filtering**: Index on `sale_date`, `created_at` columns
- **Pagination**: All list views paginated (default 20, max 100 per page)
- **Partial loading**: Dashboard charts load independently with Suspense boundaries

**Audit Log Performance:**

- Async insertion (non-blocking to user operations)
- Retention-based cleanup: Archive logs older than 7 years
- Partitioning consideration for high-volume tenants (future)

**Caching:**

```typescript
// Dashboard metrics: 60-second revalidation
export const revalidate = 60;

// Reports: No cache (real-time data)
export const dynamic = "force-dynamic";
```

### Security

**Permission Matrix:**

| Feature | Owner | Admin | Finance | Editor | Author |
|---------|-------|-------|---------|--------|--------|
| Revenue/Liability Dashboard | ✅ | ✅ | ✅ | ❌ | ❌ |
| Sales Report | ✅ | ✅ | ✅ | ✅ | ❌ |
| ISBN Pool Report | ✅ | ✅ | ✅ | ✅ | ❌ |
| Royalty Liability Report | ✅ | ✅ | ✅ | ❌ | ❌ |
| Audit Logs | ✅ | ✅ | ❌ | ❌ | ❌ |
| System Monitoring | ✅ | ✅ | ❌ | ❌ | ❌ |
| Author Portal Dashboard | ❌ | ❌ | ❌ | ❌ | ✅ (own data) |

**Authorization Enforcement:**

```typescript
// Every report query checks permissions
export async function getSalesReport(filters: SalesReportFilters) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // All roles except Author can access sales reports
  if (user.role === "author") {
    throw new Error("Authors cannot access sales reports");
  }

  const tenantId = await getCurrentTenantId();
  // ... query with tenant_id filter
}
```

**Audit Log Security:**

- Audit logs are append-only (no UPDATE/DELETE operations exposed)
- Tenant-scoped: Users can only view their tenant's logs
- Sensitive data masking: Tax IDs show only last 4 digits in logs
- No logging of passwords, tokens, or API keys

**Data Export Security:**

- CSV exports include only data user has permission to view
- Export actions logged in audit trail
- Rate limiting on export endpoints (10 exports per minute per user)

### Reliability/Availability

**Error Handling:**

```typescript
// Report queries with graceful degradation
export async function getRevenueMetrics(tenantId: string) {
  try {
    const metrics = await db.query...;
    return metrics;
  } catch (error) {
    logger.error("Failed to fetch revenue metrics", { tenantId, error });
    // Return empty state rather than crashing
    return {
      totalRevenue: 0,
      revenueByPeriod: [],
      revenueByFormat: [],
      revenueByChannel: [],
      error: "Unable to load revenue data. Please try again.",
    };
  }
}
```

**Dashboard Resilience:**

- Each dashboard widget loads independently (Suspense boundaries)
- Failed widget shows error state, doesn't block other widgets
- Retry button on failed components

**Audit Log Reliability:**

- Failed audit log insertion doesn't fail the parent operation
- Background retry for failed audit inserts (3 attempts)
- Dead letter queue for persistent failures (logged to console/Sentry)

**External Service Failures (Story 6.6):**

- System health checks detect Inngest/Clerk/S3 outages
- Status displayed on admin dashboard
- Graceful messaging when services unavailable

### Observability

**Logging Strategy:**

```typescript
// Structured logging for reports
logger.info("Report generated", {
  reportType: "sales",
  tenantId,
  userId: user.id,
  filters: { startDate, endDate, groupBy },
  rowCount: results.length,
  durationMs: endTime - startTime,
});

// Audit log for compliance
await logAuditEvent({
  tenantId,
  userId: user.id,
  actionType: "VIEW",
  resourceType: "report",
  resourceId: "sales-report",
  metadata: { filters, rowCount: results.length },
});
```

**Metrics to Track:**

| Metric | Purpose |
|--------|---------|
| Report generation time | Performance monitoring |
| Report error rate | Reliability tracking |
| Export frequency by type | Usage analytics |
| Audit log insertion rate | System health |
| Dashboard load time by role | UX optimization |

**Alerting Triggers:**

- Report generation > 10 seconds
- Audit log insertion failure rate > 1%
- Dashboard error rate > 5%
- External service health check failure

**Inngest Observability (Story 6.6):**

- Built-in Inngest dashboard for job monitoring
- Job execution history and performance metrics
- Error tracking with stack traces
- Retry history and status

## Dependencies and Integrations

### New Dependencies

| Package | Version | Purpose | Story |
|---------|---------|---------|-------|
| `recharts` | ^2.15.0 | Chart library for dashboards and reports | 6.1, 6.2, 6.3, 6.4, 6.7 |

**Installation:**
```bash
npm install recharts
```

### Existing Dependencies (Already Installed)

| Package | Version | Usage in Epic 6 |
|---------|---------|-----------------|
| `@tanstack/react-table` | 8.21.3 | Report data tables, audit log viewer |
| `date-fns` | ^4.1.0 | Date range calculations, period grouping |
| `@date-fns/tz` | 1.4.1 | Timezone handling for reports |
| `decimal.js` | ^10.6.0 | Financial aggregations (revenue, liability) |
| `zod` | ^4.1.13 | Report filter validation |
| `react-day-picker` | 9.11.3 | Date range picker for report filters |
| `inngest` | ^3.46.0 | Background job monitoring (Story 6.6) |
| `drizzle-orm` | ^0.44.7 | Database queries and aggregations |

### Internal Module Dependencies

| This Epic Uses | From Module | Purpose |
|----------------|-------------|---------|
| `sales` table | `src/db/schema/sales.ts` | Revenue aggregations |
| `statements` table | `src/db/schema/statements.ts` | Liability calculations |
| `isbns` table | `src/db/schema/isbns.ts` | ISBN pool metrics |
| `contracts` table | `src/db/schema/contracts.ts` | Advance tracking |
| `authors` table | `src/db/schema/authors.ts` | Author liability mapping |
| `titles` table | `src/db/schema/titles.ts` | Sales report grouping |
| `users` table | `src/db/schema/users.ts` | Audit log user references |
| `getCurrentTenantId()` | `src/lib/auth.ts` | Tenant scoping |
| `getCurrentUser()` | `src/lib/auth.ts` | Permission checks |
| `formatCurrency()` | `src/lib/format-currency.ts` | Display formatting |
| `logger` | `src/lib/logger.ts` | Structured logging |

### External Service Integrations

**Inngest (Story 6.6 - Job Monitoring):**

```typescript
// Fetch job status from Inngest API
// Uses existing Inngest client from src/inngest/client.ts
import { inngest } from "@/inngest/client";

// Job monitoring queries Inngest's REST API for:
// - Active/queued jobs
// - Recent completions/failures
// - Job execution history
```

**Health Check Endpoints (Story 6.6):**

| Service | Health Check Method |
|---------|---------------------|
| Database (Neon) | `SELECT 1` query |
| Clerk | `clerk.users.getCount()` |
| AWS S3 | `headBucket()` operation |
| Resend | API key validation |
| Inngest | Dashboard API ping |

### Database Schema Dependencies

**New Table Required:** `audit_logs`

**Prerequisite Tables (from previous epics):**
- `tenants` (Epic 1)
- `users` (Epic 1)
- `authors` (Epic 2)
- `titles` (Epic 2)
- `isbns` (Epic 2)
- `sales` (Epic 3)
- `returns` (Epic 3)
- `contracts` (Epic 4)
- `statements` (Epic 5)

### Migration Order

1. Create `audit_logs` table (Story 6.5)
2. Add indexes for report query optimization (if needed)
3. No changes to existing tables required

## Acceptance Criteria (Authoritative)

### Story 6.1: Revenue and Liability Tracking

| AC# | Acceptance Criteria |
|-----|---------------------|
| 6.1.1 | Finance/Admin/Owner users can view total revenue from all sales |
| 6.1.2 | Revenue can be filtered by period (daily/weekly/monthly/quarterly/annual) |
| 6.1.3 | Revenue breakdown by format (physical/ebook/audiobook) is displayed |
| 6.1.4 | Revenue breakdown by channel (retail/wholesale/direct/distributor) is displayed |
| 6.1.5 | Total royalty liability (unpaid statements) is calculated and displayed |
| 6.1.6 | Liability by author is available as a grouped view |
| 6.1.7 | Finance dashboard displays stats cards: Total Revenue, Total Liability, Upcoming Deadline |
| 6.1.8 | Clicking a stat card opens the corresponding detailed report |

### Story 6.2: Sales Reports with Multi-Dimensional Filtering

| AC# | Acceptance Criteria |
|-----|---------------------|
| 6.2.1 | Users can access /reports/sales page |
| 6.2.2 | Date range picker (required) allows custom period selection |
| 6.2.3 | Multi-select filters available for Title, Author, Format, Channel |
| 6.2.4 | Grouping options: by Title, by Format, by Channel, by Date |
| 6.2.5 | Results table shows: Group, Total Units, Total Revenue, Avg Unit Price |
| 6.2.6 | Totals row displays at bottom of table |
| 6.2.7 | Bar chart shows top 10 items by revenue |
| 6.2.8 | Pie chart shows distribution by selected grouping |
| 6.2.9 | CSV export downloads report data |
| 6.2.10 | All users (except Author role) can access sales reports |

### Story 6.3: ISBN Pool Status Report

| AC# | Acceptance Criteria |
|-----|---------------------|
| 6.3.1 | Users can access /reports/isbn-pool page |
| 6.3.2 | Stats cards show: Physical ISBNs (Available/Assigned/Total), Ebook ISBNs (Available/Assigned/Total) |
| 6.3.3 | Utilization percentage is calculated and displayed |
| 6.3.4 | Pie chart shows Available vs Assigned breakdown |
| 6.3.5 | Timeline chart shows ISBN assignments over time |
| 6.3.6 | Warning alert displayed when available ISBNs < 10 |
| 6.3.7 | Burn rate calculation shows ISBNs assigned per month |
| 6.3.8 | Estimated runout date displayed based on burn rate |
| 6.3.9 | "Import ISBN Block" quick action button links to ISBN import |

### Story 6.4: Royalty Liability Summary Report

| AC# | Acceptance Criteria |
|-----|---------------------|
| 6.4.1 | Finance/Admin/Owner users can access /reports/royalty-liability |
| 6.4.2 | Summary stats show: Total Unpaid Liability, Authors with Pending Payments, Oldest Unpaid Statement |
| 6.4.3 | Average payment per author is calculated |
| 6.4.4 | Liability by author table shows: Author, Titles, Unpaid Statements, Total Owed, Oldest Statement |
| 6.4.5 | Table is sortable by amount owed (default: highest first) |
| 6.4.6 | Advance tracking section shows authors with active advances and remaining balances |
| 6.4.7 | CSV export available for accounting system import |

### Story 6.5: Audit Logging for Compliance

| AC# | Acceptance Criteria |
|-----|---------------------|
| 6.5.1 | `audit_logs` table created with schema per Data Models section |
| 6.5.2 | `logAuditEvent()` function available for all Server Actions |
| 6.5.3 | Financial transactions (sales, returns, statements) are logged |
| 6.5.4 | User management actions (invites, role changes) are logged |
| 6.5.5 | Contract modifications are logged |
| 6.5.6 | Return approvals/rejections are logged |
| 6.5.7 | Admin/Owner users can access /admin/audit-logs |
| 6.5.8 | Audit log viewer supports filters: User, Action Type, Resource Type, Date Range |
| 6.5.9 | Audit logs are exportable to CSV |
| 6.5.10 | Audit logging is async and does not block user operations |

### Story 6.6: Background Job Monitoring

| AC# | Acceptance Criteria |
|-----|---------------------|
| 6.6.1 | Admin/Owner users can access /admin/system |
| 6.6.2 | Dashboard shows: Active Jobs, Queued Jobs, Recent Completions, Recent Failures |
| 6.6.3 | Job types displayed: Royalty calculation, PDF generation, Email delivery, CSV import |
| 6.6.4 | Job detail view shows: ID, Type, Status, Started/Completed times, Duration |
| 6.6.5 | Failed jobs show error message and retry count |
| 6.6.6 | Link to Inngest dashboard provided for detailed monitoring |
| 6.6.7 | System health section shows status of: Database, Clerk, S3, Resend, Inngest |
| 6.6.8 | Health check failures display warning indicators |

### Story 6.7: Enhanced Role-Based Dashboards

| AC# | Acceptance Criteria |
|-----|---------------------|
| 6.7.1 | Owner/Admin dashboard shows: Revenue trend (6 months), Top selling titles, Author performance, ISBN utilization trend |
| 6.7.2 | Finance dashboard shows: Liability trend (12 months), Pending returns with urgency, Upcoming deadlines, Top authors by royalty |
| 6.7.3 | Editor dashboard shows: My titles this quarter, Recent sales, My ISBN assignments, Pending tasks |
| 6.7.4 | Author portal dashboard shows: Earnings timeline, Best performing titles, Advance recoupment progress, Next statement date |
| 6.7.5 | All charts are interactive with hover tooltips |
| 6.7.6 | Dashboard widgets load independently with skeleton loaders |
| 6.7.7 | Failed widgets show error state without blocking others |
| 6.7.8 | Manual refresh button available on dashboard |

## Traceability Mapping

| AC | Spec Section | Component(s) | Test Idea |
|----|--------------|--------------|-----------|
| 6.1.1 | APIs: `getRevenueMetrics()` | `finance-dashboard.tsx` | Query returns correct sum of sales.total_amount |
| 6.1.2 | APIs: `getRevenueMetrics(period)` | `revenue-chart.tsx` | Period grouping matches date-fns intervals |
| 6.1.3 | Data Models: `RevenueMetrics` | `format-breakdown.tsx` | Format percentages sum to 100% |
| 6.1.4 | Data Models: `RevenueMetrics` | `channel-breakdown.tsx` | Channel revenue matches sales records |
| 6.1.5 | APIs: `getLiabilityMetrics()` | `liability-card.tsx` | Sum of unpaid statement net_payable values |
| 6.1.6 | Data Models: `LiabilityMetrics` | `liability-by-author.tsx` | GROUP BY author_id returns correct totals |
| 6.1.7 | Workflows: Dashboard | `stats-cards.tsx` | All four cards render with data |
| 6.1.8 | Workflows: Dashboard | `stats-cards.tsx` | onClick navigates to correct report route |
| 6.2.1 | Route Structure | `/reports/sales/page.tsx` | Page renders without error |
| 6.2.2 | Data Models: `SalesReportFilters` | `date-range-picker.tsx` | Date validation enforces start < end |
| 6.2.3 | Data Models: `SalesReportFilters` | `report-filters.tsx` | Multi-select populates from DB |
| 6.2.4 | APIs: `getSalesReport(groupBy)` | `report-filters.tsx` | Each grouping produces correct SQL |
| 6.2.5 | Data Models: `SalesReportRow` | `sales-table.tsx` | Columns match interface fields |
| 6.2.6 | Data Models: `SalesReportRow` | `sales-table.tsx` | Totals row sums all visible rows |
| 6.2.7 | Detailed Design: Charts | `bar-chart.tsx` | Top 10 sorted by revenue desc |
| 6.2.8 | Detailed Design: Charts | `pie-chart.tsx` | Segments match groupBy selection |
| 6.2.9 | APIs: `exportSalesReportCSV()` | `export-button.tsx` | CSV includes all filtered data |
| 6.2.10 | Security: Permission Matrix | `getSalesReport()` | Author role returns 403 |
| 6.3.1 | Route Structure | `/reports/isbn-pool/page.tsx` | Page renders without error |
| 6.3.2 | Data Models: `ISBNPoolMetrics` | `isbn-stats.tsx` | Counts match database records |
| 6.3.3 | Data Models: `ISBNPoolMetrics` | `isbn-stats.tsx` | utilization = assigned / total * 100 |
| 6.3.4 | Detailed Design: Charts | `pie-chart.tsx` | Two segments: Available, Assigned |
| 6.3.5 | APIs: `getISBNAssignmentHistory()` | `line-chart.tsx` | Monthly data points render |
| 6.3.6 | Workflows: ISBN Report | `isbn-alert.tsx` | Alert visible when available < 10 |
| 6.3.7 | Data Models: `ISBNPoolMetrics` | `isbn-metrics.tsx` | burnRate = assignments / months |
| 6.3.8 | Data Models: `ISBNPoolMetrics` | `isbn-metrics.tsx` | estimatedRunout calculated correctly |
| 6.3.9 | Workflows: ISBN Report | `import-button.tsx` | Button links to /titles ISBN import |
| 6.4.1 | Security: Permission Matrix | `getRoyaltyLiabilitySummary()` | Editor role returns 403 |
| 6.4.2 | Data Models: `RoyaltyLiabilitySummary` | `liability-summary.tsx` | All summary fields populated |
| 6.4.3 | Data Models: `RoyaltyLiabilitySummary` | `liability-summary.tsx` | avg = total / authorsCount |
| 6.4.4 | Data Models: `AuthorLiabilityRow` | `liability-table.tsx` | Table columns match interface |
| 6.4.5 | Detailed Design: Tables | `liability-table.tsx` | Default sort: totalOwed DESC |
| 6.4.6 | Data Models: `AdvanceBalanceRow` | `advance-tracking.tsx` | Shows contracts with advance > recouped |
| 6.4.7 | APIs: `exportLiabilityReportCSV()` | `export-button.tsx` | CSV downloads successfully |
| 6.5.1 | Data Models: `audit_logs` | `drizzle-kit migrate` | Table exists with all columns |
| 6.5.2 | APIs: `logAuditEvent()` | `src/lib/audit.ts` | Function exported and callable |
| 6.5.3 | Workflows: Audit Logging | Sales Server Actions | Sale creation logged |
| 6.5.4 | Workflows: Audit Logging | User Server Actions | User invite logged |
| 6.5.5 | Workflows: Audit Logging | Contract Server Actions | Contract update logged |
| 6.5.6 | Workflows: Audit Logging | Returns Server Actions | Approval/rejection logged |
| 6.5.7 | Route Structure | `/admin/audit-logs/page.tsx` | Page renders for Admin/Owner |
| 6.5.8 | Data Models: `AuditLogFilters` | `audit-filters.tsx` | All filter options functional |
| 6.5.9 | APIs: `exportAuditLogsCSV()` | `export-button.tsx` | CSV downloads filtered data |
| 6.5.10 | NFR: Performance | `logAuditEvent()` | Async insertion doesn't block |
| 6.6.1 | Route Structure | `/admin/system/page.tsx` | Page renders for Admin/Owner |
| 6.6.2 | Workflows: Job Monitoring | `job-dashboard.tsx` | Four job status cards displayed |
| 6.6.3 | Workflows: Job Monitoring | `job-list.tsx` | Job types match Inngest functions |
| 6.6.4 | Workflows: Job Monitoring | `job-detail.tsx` | Detail modal shows all fields |
| 6.6.5 | Workflows: Job Monitoring | `job-detail.tsx` | Error message visible for failures |
| 6.6.6 | Dependencies: Inngest | `external-link.tsx` | Link opens Inngest dashboard |
| 6.6.7 | Dependencies: Health Checks | `health-status.tsx` | All 5 services checked |
| 6.6.8 | Workflows: Job Monitoring | `health-status.tsx` | Red indicator on failure |
| 6.7.1 | APIs: `getOwnerAdminDashboardData()` | `admin-dashboard.tsx` | All 4 sections render |
| 6.7.2 | APIs: `getFinanceDashboardData()` | `finance-dashboard.tsx` | All 4 sections render |
| 6.7.3 | APIs: `getEditorDashboardData()` | `editor-dashboard.tsx` | All 4 sections render |
| 6.7.4 | APIs: `getAuthorPortalDashboardData()` | `portal-dashboard.tsx` | All 4 sections render |
| 6.7.5 | Detailed Design: Charts | Recharts components | Tooltip shows on hover |
| 6.7.6 | NFR: Reliability | Dashboard components | Skeleton shown during load |
| 6.7.7 | NFR: Reliability | Dashboard components | Error boundary catches failures |
| 6.7.8 | Workflows: Dashboard | `refresh-button.tsx` | Click triggers data refetch |

## Risks, Assumptions, Open Questions

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **R1: Report query performance on large datasets** | Medium | High | Use SQL aggregations with indexes, implement pagination, consider materialized views for future optimization |
| **R2: Recharts bundle size impact** | Low | Medium | Tree-shake unused chart types, lazy load chart components |
| **R3: Audit log table growth** | Medium | Medium | Implement retention policy (7 years), consider partitioning for high-volume tenants |
| **R4: Inngest API rate limits for job monitoring** | Low | Low | Cache job status with 30-second TTL, link to Inngest dashboard for detailed views |
| **R5: Dashboard complexity varies by role** | Medium | Medium | Use Suspense boundaries and independent data fetching per widget |
| **R6: CSV export memory usage for large reports** | Low | Medium | Stream CSV generation, limit export to 10,000 rows with pagination option |

### Assumptions

| # | Assumption | Impact if Wrong |
|---|------------|-----------------|
| **A1** | All prerequisite data exists (sales, statements, ISBNs from Epics 1-5) | Reports would show empty states; need seed data for testing |
| **A2** | Recharts is compatible with React 19 and Next.js 16 | May need alternative chart library (Victory as backup) |
| **A3** | Inngest provides REST API for job status queries | May need to rely solely on Inngest dashboard link |
| **A4** | Tenant data volumes are moderate (< 100K sales records per tenant) | May need query optimization or caching for high-volume tenants |
| **A5** | Users accept 60-second cache staleness on dashboards | May need real-time updates via polling or websockets |
| **A6** | Audit log retention of 7 years meets compliance requirements | May need configurable retention per tenant |

### Open Questions

| # | Question | Owner | Decision Needed By |
|---|----------|-------|-------------------|
| **Q1** | Should audit logs include "VIEW" actions for sensitive data (tax IDs)? | Product | Story 6.5 implementation |
| **Q2** | What specific Inngest API endpoints are available for job monitoring? | Dev | Story 6.6 implementation |
| **Q3** | Should reports support PDF export in addition to CSV? | Product | Story 6.2 implementation (deferred to post-MVP) |
| **Q4** | What is the desired dashboard auto-refresh interval (if any)? | Product | Story 6.7 implementation |
| **Q5** | Should Editor role have access to revenue metrics or just sales data? | Product | Story 6.1 implementation |
| **Q6** | Are there specific compliance frameworks (SOC2, etc.) requiring specific audit fields? | Product | Story 6.5 implementation |

## Test Strategy Summary

### Test Levels

| Level | Coverage | Framework | Location |
|-------|----------|-----------|----------|
| **Unit Tests** | Query functions, aggregation logic, CSV generation | Vitest | `tests/unit/` |
| **Integration Tests** | Report queries with database, audit logging | Vitest + Test DB | `tests/integration/` |
| **E2E Tests** | Report pages, dashboard rendering, exports | Playwright | `tests/e2e/` |

### Unit Test Focus Areas

**Report Queries (`tests/unit/report-queries.test.ts`):**
- Revenue aggregation by period/format/channel
- Liability calculation from unpaid statements
- ISBN pool metrics calculation (utilization, burn rate)
- Sales report grouping logic
- Date range validation

**CSV Export (`tests/unit/csv-export.test.ts`):**
- Correct column headers
- Data formatting (currency, dates)
- Special character escaping
- Empty data handling

**Audit Logging (`tests/unit/audit-logging.test.ts`):**
- Event structure validation
- Sensitive data masking
- Async non-blocking behavior

### Integration Test Focus Areas

**Report Data (`tests/integration/reports.test.ts`):**
```typescript
describe("Sales Report", () => {
  it("returns correct totals for date range", async () => {
    // Seed sales data
    // Call getSalesReport with filters
    // Verify totals match expected values
  });

  it("groups by format correctly", async () => {
    // Seed multi-format sales
    // Call with groupBy: "format"
    // Verify 3 groups (physical, ebook, audiobook)
  });

  it("respects tenant isolation", async () => {
    // Seed data for tenant A and B
    // Query as tenant A
    // Verify no tenant B data returned
  });
});
```

**Audit Logging (`tests/integration/audit-logs.test.ts`):**
```typescript
describe("Audit Logging", () => {
  it("logs sale creation", async () => {
    // Create a sale
    // Query audit_logs
    // Verify entry exists with correct action_type
  });

  it("logs return approval with changes", async () => {
    // Approve a return
    // Verify audit log includes before/after status
  });
});
```

### E2E Test Focus Areas

**Report Pages (`tests/e2e/reports.spec.ts`):**
```typescript
test("sales report with filters", async ({ page }) => {
  await page.goto("/reports/sales");
  // Select date range
  // Apply format filter
  // Verify table renders
  // Click export CSV
  // Verify download triggered
});

test("ISBN pool report shows warning", async ({ page }) => {
  // Seed < 10 available ISBNs
  await page.goto("/reports/isbn-pool");
  // Verify warning alert visible
});
```

**Dashboard Tests (`tests/e2e/dashboard.spec.ts`):**
```typescript
test("finance dashboard shows liability", async ({ page }) => {
  await loginAsFinance();
  await page.goto("/dashboard");
  // Verify liability card visible
  // Verify pending returns section
  // Click stat card
  // Verify navigation to report
});

test("author portal shows earnings", async ({ page }) => {
  await loginAsAuthor();
  await page.goto("/portal");
  // Verify earnings timeline chart
  // Verify advance progress bar
});
```

**Admin Pages (`tests/e2e/admin.spec.ts`):**
```typescript
test("audit logs with filters", async ({ page }) => {
  await loginAsAdmin();
  await page.goto("/admin/audit-logs");
  // Apply user filter
  // Apply date range
  // Verify filtered results
  // Export CSV
});

test("system health shows status", async ({ page }) => {
  await loginAsAdmin();
  await page.goto("/admin/system");
  // Verify health checks displayed
  // Verify job counts visible
});
```

### Test Data Requirements

| Data Type | Quantity | Purpose |
|-----------|----------|---------|
| Sales transactions | 500+ per tenant | Report aggregation testing |
| Statements (paid/unpaid) | 20+ per tenant | Liability calculation |
| ISBNs (available/assigned) | 50+ per tenant | Pool metrics |
| Audit log entries | 100+ per tenant | Pagination and filtering |
| Users (all roles) | 5+ per tenant | Permission testing |

### Acceptance Criteria Coverage

| Story | Unit Tests | Integration Tests | E2E Tests |
|-------|------------|-------------------|-----------|
| 6.1 | Revenue/liability queries | Aggregation accuracy | Dashboard cards |
| 6.2 | Filter validation, grouping | Report query results | Full report flow |
| 6.3 | ISBN metrics calculation | Pool counts | Report page, alerts |
| 6.4 | Liability summary logic | Author grouping | Report page, export |
| 6.5 | Event structure, masking | Log insertion | Admin viewer |
| 6.6 | Health check logic | Service connectivity | Admin system page |
| 6.7 | Dashboard data queries | Role-specific data | All 4 dashboard variants |

### Performance Testing

- **Report generation**: Verify < 3 second response for 1-year date range
- **CSV export**: Verify < 3 seconds for 10,000 rows
- **Dashboard load**: Verify < 2 seconds for initial render
- **Audit log query**: Verify < 2 seconds with filters

### Security Testing

- **Permission enforcement**: Verify each report respects role matrix
- **Tenant isolation**: Verify no cross-tenant data in reports
- **Export security**: Verify exports contain only permitted data
- **Audit log integrity**: Verify no UPDATE/DELETE operations possible
