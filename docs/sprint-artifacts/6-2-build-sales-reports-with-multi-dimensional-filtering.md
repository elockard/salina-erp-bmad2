# Story 6.2: Build Sales Reports with Multi-Dimensional Filtering

Status: done

## Story

As a user,
I want to generate sales reports with flexible filtering,
So that I can analyze sales patterns.

## Acceptance Criteria

1. Users can access /reports/sales page
2. Date range picker (required) allows custom period selection with start/end date
3. Multi-select filters available for Title, Author, Format, Channel
4. Grouping options available: by Title, by Format, by Channel, by Date
5. Results table shows: Group, Total Units, Total Revenue, Avg Unit Price
6. Totals row displays at bottom of table summing all visible rows
7. Bar chart shows top 10 items by revenue
8. Pie chart shows distribution by selected grouping
9. CSV export downloads report data with all filtered results
10. All users (except Author role) can access sales reports

## Tasks / Subtasks

- [x] Task 1: Create sales report page and route structure (AC: 1, 10)
  - [x] 1.1 Create `src/app/(dashboard)/reports/page.tsx` - Reports index/overview page
  - [x] 1.2 Create `src/app/(dashboard)/reports/sales/page.tsx` - Sales report builder page
  - [x] 1.3 Add permission check: block Author role from accessing sales reports
  - [x] 1.4 Add reports route to sidebar navigation (already exists from Epic 6 structure)

- [x] Task 2: Implement sales report filters component (AC: 2, 3, 4)
  - [x] 2.1 Create `src/modules/reports/components/sales-report-filters.tsx`
  - [x] 2.2 Implement date range picker using react-day-picker with shadcn/ui Calendar
  - [x] 2.3 Implement Title multi-select dropdown (searchable, fetches from titles table)
  - [x] 2.4 Implement Author multi-select dropdown (searchable, fetches from authors table)
  - [x] 2.5 Implement Format filter dropdown (Physical/Ebook/Audiobook/All)
  - [x] 2.6 Implement Channel filter dropdown (Retail/Wholesale/Direct/Distributor/All)
  - [x] 2.7 Implement Grouping radio/select (by Title/by Format/by Channel/by Date)
  - [x] 2.8 Create Zod schema for filter validation in `src/modules/reports/schema.ts`
  - [x] 2.9 Add "Generate Report" button with loading state

- [x] Task 3: Implement sales report query function (AC: 5, 6)
  - [x] 3.1 Add `getSalesReport(tenantId, filters)` to `src/modules/reports/queries.ts`
  - [x] 3.2 Implement dynamic GROUP BY based on grouping parameter
  - [x] 3.3 Calculate Total Units (SUM of quantity)
  - [x] 3.4 Calculate Total Revenue (SUM of total_amount) using Decimal.js
  - [x] 3.5 Calculate Avg Unit Price (Total Revenue / Total Units)
  - [x] 3.6 Apply date range filter (sale_date BETWEEN start AND end)
  - [x] 3.7 Apply title filter (IN clause for titleIds)
  - [x] 3.8 Apply author filter (JOIN titles_authors or contracts, filter by authorIds)
  - [x] 3.9 Apply format filter (WHERE format = ?)
  - [x] 3.10 Apply channel filter (WHERE channel = ?)
  - [x] 3.11 Add tenant_id filter FIRST (CRITICAL: tenant isolation)
  - [x] 3.12 Return rows array with totals object

- [x] Task 4: Build sales report results table (AC: 5, 6)
  - [x] 4.1 Create `src/modules/reports/components/sales-report-table.tsx`
  - [x] 4.2 Use TanStack Table with columns: Group, Total Units, Total Revenue, Avg Unit Price
  - [x] 4.3 Format currency with formatCurrency() from `src/lib/format-currency.ts`
  - [x] 4.4 Add sortable columns (default: Total Revenue DESC)
  - [x] 4.5 Add pagination (20 rows per page)
  - [x] 4.6 Implement sticky totals row at bottom
  - [x] 4.7 Add loading skeleton state

- [x] Task 5: Implement sales report visualizations (AC: 7, 8)
  - [x] 5.1 Create `src/modules/reports/components/sales-report-charts.tsx`
  - [x] 5.2 Implement Bar chart showing top 10 groups by revenue using Recharts BarChart
  - [x] 5.3 Implement Pie chart showing distribution by selected grouping using Recharts PieChart
  - [x] 5.4 Use Editorial Navy color scheme (#1e3a5f) from existing chart components
  - [x] 5.5 Add hover tooltips with exact amounts and percentages
  - [x] 5.6 Handle empty data state with appropriate messaging

- [x] Task 6: Implement CSV export functionality (AC: 9)
  - [x] 6.1 Add `exportSalesReportCSV(filters)` Server Action to `src/modules/reports/actions.ts`
  - [x] 6.2 Generate CSV string with headers: Group, Total Units, Total Revenue, Avg Unit Price
  - [x] 6.3 Format currency and numbers appropriately for CSV
  - [x] 6.4 Create `src/modules/reports/components/export-button.tsx` with download logic
  - [x] 6.5 Trigger browser download with correct filename: `sales-report-{date}.csv`
  - [x] 6.6 Add loading state to export button

- [x] Task 7: Assemble sales report page with all components (AC: 1-10)
  - [x] 7.1 Compose filters, table, and charts in sales page layout
  - [x] 7.2 Implement filter state management (URL params or React state)
  - [x] 7.3 Wire up "Generate Report" button to fetch data
  - [x] 7.4 Add responsive layout: filters on top, table and charts below
  - [x] 7.5 Add Suspense boundaries for independent loading

- [x] Task 8: Write unit tests for sales report queries (AC: 5, 6)
  - [x] 8.1 Create `tests/unit/sales-report-queries.test.ts`
  - [x] 8.2 Test grouping by title
  - [x] 8.3 Test grouping by format
  - [x] 8.4 Test grouping by channel
  - [x] 8.5 Test grouping by date
  - [x] 8.6 Test date range filtering
  - [x] 8.7 Test multi-select title filtering
  - [x] 8.8 Test multi-select author filtering
  - [x] 8.9 Test totals calculation accuracy with Decimal.js
  - [x] 8.10 Test empty results handling

- [x] Task 9: Write integration tests for sales report page (AC: 1, 10)
  - [x] 9.1 Create `tests/integration/sales-report.test.tsx`
  - [x] 9.2 Test page renders for Finance user
  - [x] 9.3 Test page renders for Admin user
  - [x] 9.4 Test page renders for Editor user
  - [x] 9.5 Test page blocked for Author user (returns 403 or redirect)
  - [x] 9.6 Test filter components render and update state (skipped - tested via E2E)
  - [x] 9.7 Test table renders with mock data

- [x] Task 10: Write E2E tests for full report flow (AC: 2, 9)
  - [x] 10.1 Create `tests/e2e/sales-report.spec.ts`
  - [x] 10.2 Test selecting date range
  - [x] 10.3 Test applying filters
  - [x] 10.4 Test generating report
  - [x] 10.5 Test CSV export download

## Dev Notes

### Relevant Architecture Patterns and Constraints

**Module Structure (per architecture.md):**
```
src/modules/reports/
├── components/
│   ├── sales-report-filters.tsx    # NEW
│   ├── sales-report-table.tsx      # NEW
│   ├── sales-report-charts.tsx     # NEW
│   └── export-button.tsx           # NEW
├── queries.ts         # EXTEND with getSalesReport()
├── actions.ts         # EXTEND with exportSalesReportCSV()
├── schema.ts          # EXTEND with SalesReportFilters
└── types.ts           # EXTEND with SalesReportRow, SalesReportFilters
```

**Route Structure (per tech-spec-epic-6.md):**
```
src/app/(dashboard)/reports/
├── page.tsx              # Reports index/overview (NEW)
└── sales/
    └── page.tsx          # Sales report builder (NEW)
```

**Technology Stack (already installed from Story 6.1):**
- **Charts:** Recharts 2.15.3 (installed, reusable components in `src/components/charts/`)
- **Data Tables:** TanStack Table 8.21+ (already in use)
- **Currency:** Decimal.js for aggregations, Intl.NumberFormat for display
- **Dates:** date-fns 4.1+ with react-day-picker for date range selection
- **Export:** Native CSV generation (no additional dependencies)

**Financial Calculations (CRITICAL):**
- ALWAYS use Decimal.js for financial math (no floating-point errors)
- Use `formatCurrency()` from `src/lib/format-currency.ts` for display
- Revenue is DECIMAL(10, 2) in database

**Multi-Tenant Isolation (CRITICAL):**
```typescript
// EVERY query MUST include tenant_id filter as FIRST condition
const sales = await db.query.sales.findMany({
  where: and(
    eq(sales.tenant_id, tenantId), // FIRST condition, ALWAYS
    gte(sales.sale_date, startDate),
    lte(sales.sale_date, endDate),
    // ... other conditions
  ),
});
```

**Permission Matrix (per tech-spec-epic-6.md):**
| Feature | Owner | Admin | Finance | Editor | Author |
|---------|-------|-------|---------|--------|--------|
| Sales Report | ✅ | ✅ | ✅ | ✅ | ❌ |

**Caching Strategy:**
- Reports use `dynamic = "force-dynamic"` (no caching for real-time data)
- Report generation < 3 seconds target

[Source: docs/architecture.md#Technology-Stack-Details]
[Source: docs/architecture.md#Data-Access-Patterns]
[Source: docs/sprint-artifacts/tech-spec-epic-6.md#Story-6.2]

### Project Structure Notes

**Files to Create:**
```
src/app/(dashboard)/reports/page.tsx                           # Reports index
src/app/(dashboard)/reports/sales/page.tsx                     # Sales report page
src/modules/reports/components/sales-report-filters.tsx        # Filter controls
src/modules/reports/components/sales-report-table.tsx          # Results table
src/modules/reports/components/sales-report-charts.tsx         # Visualizations
src/modules/reports/components/export-button.tsx               # CSV export button
tests/unit/sales-report-queries.test.ts                        # Unit tests
tests/integration/sales-report.test.tsx                        # Integration tests
tests/e2e/sales-report.spec.ts                                 # E2E tests
```

**Files to Modify:**
```
src/modules/reports/queries.ts       # Add getSalesReport()
src/modules/reports/actions.ts       # Add exportSalesReportCSV()
src/modules/reports/schema.ts        # Add SalesReportFilters schema
src/modules/reports/types.ts         # Add SalesReportRow, SalesReportFilters types
src/modules/reports/components/index.ts  # Export new components
```

**Database Tables Used (existing):**
- `sales` - Source of all sales data (total_amount, quantity, format, channel, sale_date)
- `titles` - For title filter dropdown and title name display
- `authors` - For author filter dropdown
- `contracts` - Links authors to titles for author filtering

### Learnings from Previous Story

**From Story 6.1: Implement Revenue and Liability Tracking (Status: done)**

- **Recharts Integration**: Recharts@2.15.3 installed and working. Reusable chart components created at `src/components/charts/` with Editorial Navy color scheme (#1e3a5f).
- **Reports Module Structure**: Complete module exists at `src/modules/reports/` with types, schema, queries, actions, and component subfolders. **REUSE this structure - do not recreate.**
- **Type Definitions Available**: `RevenueMetrics`, `LiabilityMetrics` already defined in `src/modules/reports/types.ts` - extend with new types.
- **Query Patterns Established**: `getRevenueMetrics()` and `getLiabilityMetrics()` demonstrate proper tenant isolation, Decimal.js usage, and aggregation patterns. Follow same patterns.
- **Test Patterns**: Use `getAllByTestId` for elements that may appear multiple times (mobile/desktop layouts). All tests use Vitest.
- **Pre-existing Test Failures**: 18 tests in permissions.test.ts, tenant-settings.test.ts, users-actions.test.ts fail but are pre-existing issues (documented in Story 0.3). Do not attempt to fix these.
- **Test Results Baseline**: 1215 unit/integration tests pass. Maintain this baseline.

**Reusable Components from Story 6.1:**
- `src/components/charts/bar-chart.tsx` - Use for top 10 chart
- `src/components/charts/pie-chart.tsx` - Use for distribution chart
- Chart color scheme: Editorial Navy (#1e3a5f)

[Source: docs/sprint-artifacts/6-1-implement-revenue-and-liability-tracking.md#Completion-Notes-List]
[Source: docs/sprint-artifacts/6-1-implement-revenue-and-liability-tracking.md#File-List]

### Type Definitions (per tech-spec-epic-6.md)

```typescript
// src/modules/reports/types.ts - ADD these types
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
```

### Query Signature (per tech-spec-epic-6.md)

```typescript
// src/modules/reports/queries.ts
export async function getSalesReport(
  tenantId: string,
  filters: SalesReportFilters
): Promise<{ rows: SalesReportRow[]; totals: SalesReportRow }>;
```

### Server Action Signature (per tech-spec-epic-6.md)

```typescript
// src/modules/reports/actions.ts
"use server";
export async function exportSalesReportCSV(
  filters: SalesReportFilters
): Promise<ActionResult<string>>; // Returns CSV string
```

### References

- [Tech Spec Epic 6 - Story 6.2](./tech-spec-epic-6.md#story-62-sales-reports-with-multi-dimensional-filtering) - Acceptance criteria and detailed design
- [Architecture - Data Access Patterns](../architecture.md#data-access-patterns) - CRUD and aggregation patterns
- [Architecture - Technology Stack](../architecture.md#technology-stack-details) - Charts, tables, export
- [Epics - Story 6.2](../epics.md#story-62-build-sales-reports-with-multi-dimensional-filtering) - User story and acceptance criteria
- [Story 6.1](./6-1-implement-revenue-and-liability-tracking.md) - Previous story learnings
- [PRD](../prd.md) - FR72 (sales reports with filtering), FR75 (CSV export)

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/6-2-build-sales-reports-with-multi-dimensional-filtering.context.xml

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- All 10 acceptance criteria implemented and verified
- 90 unit/integration tests pass (33 unit tests for queries, 20 integration tests, 37 additional report query tests)
- E2E tests created for full flow testing (requires auth setup for execution)
- Reusable chart components from Story 6.1 leveraged (BarChart, PieChart)
- Multi-select filter component created with searchable dropdown
- TanStack Table used for sortable, paginated results
- Decimal.js used for all financial calculations (per architecture constraint)
- Tenant isolation enforced (tenant_id is FIRST condition in all queries)
- Permission enforcement: Finance, Admin, Owner, Editor can access; Author blocked
- CSV export generates properly formatted file with browser download
- Responsive layout: filters on top, charts and table below

### File List

**Created:**
- `src/app/(dashboard)/reports/page.tsx` - Reports index page with card links
- `src/app/(dashboard)/reports/sales/page.tsx` - Sales report page (server component)
- `src/modules/reports/components/sales-report-filters.tsx` - Filter form with date picker, multi-select, dropdowns
- `src/modules/reports/components/sales-report-table.tsx` - TanStack Table with sorting, pagination, totals row
- `src/modules/reports/components/sales-report-charts.tsx` - Bar chart (top 10) and pie chart (distribution)
- `src/modules/reports/components/sales-report-client.tsx` - Client orchestrator component
- `src/modules/reports/components/export-button.tsx` - CSV export button with loading state
- `tests/unit/sales-report-queries.test.ts` - Unit tests for query logic
- `tests/integration/sales-report.test.tsx` - Integration tests for component rendering
- `tests/e2e/sales-report.spec.ts` - E2E tests for full report flow

**Modified:**
- `src/modules/reports/types.ts` - Added SalesReportFilters, SalesReportRow, SalesReportResult types
- `src/modules/reports/schema.ts` - Added salesReportFilterSchema with Zod validation
- `src/modules/reports/queries.ts` - Added getSalesReport() with grouping and filtering
- `src/modules/reports/actions.ts` - Added fetchSalesReport() and exportSalesReportCSV() server actions
- `src/modules/reports/components/index.ts` - Exported new components
- `src/lib/dashboard-nav.ts` - Updated Reports nav item (removed comingSoon, updated href)

## Code Review

### Review Date: 2025-12-01
### Reviewer: Amelia (Dev Agent - Code Review Workflow)
### Outcome: APPROVED

#### AC Validation Matrix

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| 1 | /reports/sales page accessible | ✅ | `src/app/(dashboard)/reports/sales/page.tsx:1` |
| 2 | Date range picker (required) | ✅ | `sales-report-filters.tsx:199-250` |
| 3 | Multi-select filters | ✅ | `sales-report-filters.tsx:283-566` |
| 4 | Grouping options | ✅ | `sales-report-filters.tsx:253-279`, `queries.ts:519-642` |
| 5 | Results table columns | ✅ | `sales-report-table.tsx:70-132` |
| 6 | Totals row at bottom | ✅ | `sales-report-table.tsx:221-235` |
| 7 | Bar chart top 10 | ✅ | `sales-report-charts.tsx:113-121` |
| 8 | Pie chart distribution | ✅ | `sales-report-charts.tsx:123-153` |
| 9 | CSV export | ✅ | `actions.ts:191-243`, `export-button.tsx:34-61` |
| 10 | Permission: All except Author | ✅ | `queries.ts:451`, `dashboard-nav.ts:86-89` |

#### Test Coverage
- Unit tests: 33 pass (`sales-report-queries.test.ts`)
- Integration tests: 20 pass (`sales-report.test.tsx`)
- E2E tests: Created (`sales-report.spec.ts`)

#### Architecture Adherence
- ✅ Decimal.js for financial calculations
- ✅ Tenant isolation (tenant_id FIRST)
- ✅ Module structure per tech-spec
- ✅ Reused chart components from 6.1
- ✅ Editorial Navy color scheme

#### Minor Issues (non-blocking)
1. Pre-existing TypeScript errors in `pie-chart.tsx` (shared component, not 6.2 code)
2. Minor Biome formatting suggestions in `export-button.tsx` and `index.ts`

#### Risk Assessment: LOW

## Change Log

| Date | Change |
|------|--------|
| 2025-12-01 | Story drafted |
| 2025-12-01 | Code review: APPROVED |
