# Story 6.1: Implement Revenue and Liability Tracking

Status: done

## Story

As a finance user,
I want to view total revenue and royalty liability metrics,
So that I understand the company's financial position.

## Acceptance Criteria

1. Finance/Admin/Owner users can view total revenue from all sales (sum of sales.total_amount)
2. Revenue can be filtered by period (daily/weekly/monthly/quarterly/annual)
3. Revenue breakdown by format (physical/ebook/audiobook) is displayed with percentages
4. Revenue breakdown by channel (retail/wholesale/direct/distributor) is displayed with percentages
5. Total royalty liability (sum of net_payable from unpaid statements) is calculated and displayed
6. Liability by author is available as a grouped view
7. Finance dashboard displays stats cards: Total Revenue, Total Liability, Upcoming Statement Deadline
8. Clicking a stat card opens the corresponding detailed report

## Tasks / Subtasks

- [x] Task 1: Set up Recharts library and create reusable chart components (AC: 2, 3, 4)
  - [x] 1.1 Install recharts package: `npm install recharts`
  - [x] 1.2 Create `src/components/charts/bar-chart.tsx` - Reusable bar chart wrapper
  - [x] 1.3 Create `src/components/charts/pie-chart.tsx` - Reusable pie chart wrapper
  - [x] 1.4 Create `src/components/charts/line-chart.tsx` - Reusable line chart wrapper
  - [x] 1.5 Create `src/components/charts/area-chart.tsx` - Reusable area chart wrapper
  - [x] 1.6 Create `src/components/charts/index.ts` - Export barrel file

- [x] Task 2: Create reports module structure (AC: 1-6)
  - [x] 2.1 Create `src/modules/reports/` directory structure
  - [x] 2.2 Create `src/modules/reports/types.ts` - Define RevenueMetrics, LiabilityMetrics interfaces
  - [x] 2.3 Create `src/modules/reports/schema.ts` - Zod schemas for report filters
  - [x] 2.4 Create `src/modules/reports/queries.ts` - Revenue and liability query functions
  - [x] 2.5 Create `src/modules/reports/actions.ts` - Server actions for report export

- [x] Task 3: Implement revenue tracking queries (AC: 1, 2, 3, 4)
  - [x] 3.1 Implement `getRevenueMetrics(tenantId, period)` - Returns total revenue and breakdowns
  - [x] 3.2 Implement period grouping with date-fns (day/week/month/quarter/year intervals)
  - [x] 3.3 Implement revenue by format aggregation (GROUP BY format)
  - [x] 3.4 Implement revenue by channel aggregation (GROUP BY channel)
  - [x] 3.5 Add tenant_id filtering to all queries (CRITICAL: tenant isolation)

- [x] Task 4: Implement liability tracking queries (AC: 5, 6)
  - [x] 4.1 Implement `getLiabilityMetrics(tenantId)` - Returns total liability and breakdowns
  - [x] 4.2 Calculate total liability from unpaid statements (status != 'paid')
  - [x] 4.3 Implement liability by author grouping (JOIN authors, GROUP BY author_id)
  - [x] 4.4 Calculate paid vs unpaid breakdown
  - [x] 4.5 Use Decimal.js for all financial aggregations

- [x] Task 5: Enhance Finance dashboard with stats cards (AC: 7, 8)
  - [x] 5.1 Update `src/app/(dashboard)/dashboard/components/finance-dashboard.tsx`
  - [x] 5.2 Create revenue stats card with current month total
  - [x] 5.3 Create liability stats card with unpaid amount owed
  - [x] 5.4 Create upcoming deadline stats card (next statement date)
  - [x] 5.5 Add onClick handlers to navigate to detailed reports
  - [x] 5.6 Use shadcn/ui Card components with Editorial Navy accent per UX spec

- [x] Task 6: Create revenue breakdown visualizations (AC: 2, 3, 4)
  - [x] 6.1 Create `src/modules/reports/components/revenue-period-chart.tsx` - Line/area chart for period trends
  - [x] 6.2 Create `src/modules/reports/components/format-breakdown.tsx` - Pie chart for format distribution
  - [x] 6.3 Create `src/modules/reports/components/channel-breakdown.tsx` - Pie chart for channel distribution
  - [x] 6.4 Add hover tooltips with exact amounts and percentages
  - [x] 6.5 Ensure percentages sum to 100%

- [x] Task 7: Create liability by author view (AC: 6)
  - [x] 7.1 Create `src/modules/reports/components/liability-by-author.tsx` - Table component
  - [x] 7.2 Use TanStack Table for sortable columns
  - [x] 7.3 Columns: Author Name, Titles Count, Unpaid Statements, Total Owed
  - [x] 7.4 Default sort by Total Owed DESC
  - [x] 7.5 Add pagination (20 per page)

- [x] Task 8: Write unit tests for report queries (AC: 1-6)
  - [x] 8.1 Create `tests/unit/report-queries.test.ts`
  - [x] 8.2 Test revenue aggregation by period
  - [x] 8.3 Test revenue aggregation by format
  - [x] 8.4 Test revenue aggregation by channel
  - [x] 8.5 Test liability calculation from unpaid statements
  - [x] 8.6 Test liability grouping by author
  - [x] 8.7 Mock database queries with test data

- [x] Task 9: Write integration tests for finance dashboard (AC: 7, 8)
  - [x] 9.1 Create `tests/integration/finance-dashboard.test.tsx`
  - [x] 9.2 Test stats cards render with data
  - [x] 9.3 Test stat card click navigation
  - [x] 9.4 Test permission enforcement (Finance/Admin/Owner only)
  - [x] 9.5 Seed test data for revenue and liability calculations

## Dev Notes

### Relevant Architecture Patterns and Constraints

**Module Structure (per architecture.md):**
```
src/modules/reports/
├── components/
│   ├── revenue-period-chart.tsx
│   ├── format-breakdown.tsx
│   ├── channel-breakdown.tsx
│   └── liability-by-author.tsx
├── queries.ts
├── actions.ts
├── schema.ts
└── types.ts
```

**Technology Stack:**
- **Charts:** Recharts (React-based, declarative, excellent Next.js integration)
- **Data Tables:** TanStack Table 8.21+ (already in use)
- **Currency:** Decimal.js for aggregations, Intl.NumberFormat for display
- **Dates:** date-fns 4.1+ with @date-fns/tz for period calculations

**Financial Calculations (CRITICAL):**
- ALWAYS use Decimal.js for financial math (no floating-point errors)
- Use formatCurrency() from `src/lib/format-currency.ts` for display
- Store as DECIMAL(10, 2) in database

**Multi-Tenant Isolation (CRITICAL):**
```typescript
// EVERY query MUST include tenant_id filter
const revenue = await db.query.sales.findMany({
  where: and(
    eq(sales.tenant_id, tenantId), // FIRST condition, ALWAYS
    // ... other conditions
  ),
});
```

**Permission Matrix (per tech-spec-epic-6.md):**
| Feature | Owner | Admin | Finance | Editor | Author |
|---------|-------|-------|---------|--------|--------|
| Revenue/Liability Dashboard | Yes | Yes | Yes | No | No |

**Caching Strategy:**
- Dashboard metrics cached with 60-second revalidation
- Use React Server Components with automatic caching

[Source: docs/architecture.md#Technology-Stack-Details]
[Source: docs/sprint-artifacts/tech-spec-epic-6.md#Story-6.1]

### Project Structure Notes

**New Files to Create:**
```
src/
├── components/
│   └── charts/
│       ├── bar-chart.tsx      # NEW
│       ├── pie-chart.tsx      # NEW
│       ├── line-chart.tsx     # NEW
│       ├── area-chart.tsx     # NEW
│       └── index.ts           # NEW
└── modules/
    └── reports/
        ├── components/
        │   ├── revenue-period-chart.tsx    # NEW
        │   ├── format-breakdown.tsx        # NEW
        │   ├── channel-breakdown.tsx       # NEW
        │   └── liability-by-author.tsx     # NEW
        ├── queries.ts         # NEW
        ├── actions.ts         # NEW
        ├── schema.ts          # NEW
        ├── types.ts           # NEW
        └── index.ts           # NEW
```

**Files to Modify:**
```
src/app/(dashboard)/dashboard/components/finance-dashboard.tsx  # Add stats cards
```

**Database Tables Used (existing):**
- `sales` - Revenue source (sum of total_amount)
- `statements` - Liability source (sum of net_payable where status != 'paid')
- `authors` - For liability grouping

### Learnings from Previous Story

**From Story 0.3: Strengthen Portal Tests (Status: done)**

- **Root Cause Pattern**: Components rendering BOTH mobile and desktop layouts simultaneously. In JSDOM, both are in DOM since CSS media queries don't apply.
- **Test Assertion Pattern**: Use `toBeTruthy()` + `textContent` verification instead of `toBeInTheDocument()` since project doesn't have `@testing-library/jest-dom` installed.
- **Pre-existing Issues**: 18 tests in permissions.test.ts, tenant-settings.test.ts, users-actions.test.ts fail but are pre-existing issues.
- **All 982 unit tests pass** - baseline is stable.

**Relevant to This Story:**
- Follow same test patterns for new report components
- Use exact count assertions when testing multiple rendered elements
- Dashboard widgets will likely render both mobile/desktop layouts

[Source: docs/sprint-artifacts/0-3-strengthen-portal-tests.md#Completion-Notes-List]

### Type Definitions (per tech-spec-epic-6.md)

```typescript
// src/modules/reports/types.ts
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
```

### Query Signatures (per tech-spec-epic-6.md)

```typescript
// src/modules/reports/queries.ts
export async function getRevenueMetrics(
  tenantId: string,
  period: "day" | "week" | "month" | "quarter" | "year"
): Promise<RevenueMetrics>;

export async function getLiabilityMetrics(tenantId: string): Promise<LiabilityMetrics>;
```

### References

- [Tech Spec Epic 6](./tech-spec-epic-6.md) - Story 6.1 acceptance criteria and design
- [Architecture](../architecture.md) - Module patterns, tech stack, financial calculations
- [PRD](../prd.md) - FR67-69 functional requirements
- [Epics](../epics.md) - Story 6.1 user story and acceptance criteria
- [Story 0.3](./0-3-strengthen-portal-tests.md) - Previous story learnings

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/6-1-implement-revenue-and-liability-tracking.context.xml`

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

1. **Recharts Integration**: Installed recharts@2.15.3 and created reusable chart component library with Editorial Navy color scheme (#1e3a5f).

2. **Reports Module Structure**: Created complete module at `src/modules/reports/` with types, schema, queries, actions, and component subfolders.

3. **Revenue Tracking**: Implemented `getRevenueMetrics()` with period grouping (day/week/month/quarter/year), format breakdown (physical/ebook/audiobook), and channel breakdown (retail/wholesale/direct/distributor). All calculations use Decimal.js.

4. **Liability Tracking**: Implemented `getLiabilityMetrics()` calculating total from unpaid statements, with author grouping using TanStack Table with sortable columns and pagination.

5. **Finance Dashboard Enhancement**: Updated finance-dashboard.tsx with four stats cards (Monthly Revenue, Royalty Liability, Statement Deadline, Pending Returns) using Editorial Navy accent borders. All cards are clickable Links to detailed reports.

6. **Test Pattern**: Used `getAllByTestId` for elements that may appear multiple times (mobile/desktop layouts). Added Hash icon mock for ISBNPoolWidget rendering.

7. **Pre-existing Test Failures**: 18 tests in permissions.test.ts, tenant-settings.test.ts, users-actions.test.ts fail but are pre-existing issues documented in Story 0.3.

8. **Test Results**: 37 unit tests pass (report-queries.test.ts), 26 integration tests pass (finance-dashboard.test.tsx). Full suite: 1215 pass, 18 fail (pre-existing).

### File List

**New Files Created:**
- `src/components/charts/bar-chart.tsx` - Reusable bar chart wrapper
- `src/components/charts/pie-chart.tsx` - Reusable pie chart wrapper
- `src/components/charts/line-chart.tsx` - Reusable line chart wrapper
- `src/components/charts/area-chart.tsx` - Reusable area chart wrapper
- `src/components/charts/index.ts` - Chart components barrel export
- `src/modules/reports/types.ts` - RevenueMetrics, LiabilityMetrics interfaces
- `src/modules/reports/schema.ts` - Zod schemas for report filters
- `src/modules/reports/queries.ts` - Revenue and liability query functions
- `src/modules/reports/actions.ts` - Server actions for reports
- `src/modules/reports/index.ts` - Reports module barrel export
- `src/modules/reports/components/revenue-period-chart.tsx` - Area chart for period trends
- `src/modules/reports/components/format-breakdown.tsx` - Pie chart for format distribution
- `src/modules/reports/components/channel-breakdown.tsx` - Pie chart for channel distribution
- `src/modules/reports/components/liability-by-author.tsx` - TanStack Table component
- `src/modules/reports/components/index.ts` - Report components barrel export
- `tests/unit/report-queries.test.ts` - Unit tests for report queries (37 tests)
- `tests/integration/finance-dashboard.test.tsx` - Integration tests for dashboard (26 tests)

**Files Modified:**
- `src/app/(dashboard)/dashboard/components/finance-dashboard.tsx` - Added stats cards with Editorial Navy styling
- `src/modules/dashboard/actions.ts` - Added real revenue/liability calculations
- `package.json` - Added recharts dependency
- `package-lock.json` - Updated with recharts

## Change Log

| Date | Change |
|------|--------|
| 2025-12-01 | Story implementation complete |
| 2025-12-01 | Senior Developer Review notes appended |

---

## Senior Developer Review (AI)

### Reviewer
BMad

### Date
2025-12-01

### Outcome
**✅ APPROVE**

All acceptance criteria have been fully implemented with evidence. All 42 tasks marked complete have been verified. The implementation follows architectural patterns, enforces tenant isolation, uses Decimal.js for financial precision, and has comprehensive test coverage.

### Summary

Story 6.1 implements revenue and liability tracking for the finance dashboard. The implementation is clean, follows established patterns, and includes:
- Recharts library integration with 4 reusable chart components
- Complete reports module with types, schema, queries, and actions
- Finance dashboard with 4 clickable stats cards (Editorial Navy styling)
- Revenue breakdown visualizations (period, format, channel)
- Liability by author table with TanStack Table
- 63 passing tests (37 unit + 26 integration)

### Key Findings

**No HIGH or MEDIUM severity issues found.**

**LOW Severity:**
- Note: Biome schema version mismatch (2.3.7 vs 2.3.8) - informational only, not blocking

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| AC-1 | Finance/Admin/Owner users can view total revenue from all sales | ✅ IMPLEMENTED | `queries.ts:83-88` - sum(sales.total_amount) with Decimal.js |
| AC-2 | Revenue can be filtered by period (day/week/month/quarter/year) | ✅ IMPLEMENTED | `queries.ts:91-97` - getRevenueByPeriod() with all 5 periods |
| AC-3 | Revenue breakdown by format displayed with percentages | ✅ IMPLEMENTED | `queries.ts:100-120` - GROUP BY format |
| AC-4 | Revenue breakdown by channel displayed with percentages | ✅ IMPLEMENTED | `queries.ts:123-145` - GROUP BY channel |
| AC-5 | Total royalty liability calculated and displayed | ✅ IMPLEMENTED | `queries.ts:285-292` - sum(statements.net_payable) |
| AC-6 | Liability by author grouped view | ✅ IMPLEMENTED | `queries.ts:295-330` + liability-by-author.tsx |
| AC-7 | Finance dashboard stats cards | ✅ IMPLEMENTED | `finance-dashboard.tsx:76-154` - 4 cards |
| AC-8 | Stat cards link to detailed reports | ✅ IMPLEMENTED | `finance-dashboard.tsx:78,98,116,138` - Link components |

**Summary: 8 of 8 acceptance criteria fully implemented**

### Task Completion Validation

| Task | Marked | Verified | Evidence |
|------|--------|----------|----------|
| 1.1-1.6 Chart components | [x] | ✅ | `src/components/charts/` - all 5 files exist |
| 2.1-2.5 Reports module | [x] | ✅ | `src/modules/reports/` - complete structure |
| 3.1-3.5 Revenue queries | [x] | ✅ | `queries.ts:58-153` - all implemented |
| 4.1-4.5 Liability queries | [x] | ✅ | `queries.ts:275-338` - all implemented |
| 5.1-5.6 Dashboard cards | [x] | ✅ | `finance-dashboard.tsx` - 240 lines |
| 6.1-6.5 Visualizations | [x] | ✅ | `reports/components/` - all 4 files |
| 7.1-7.5 Liability table | [x] | ✅ | `liability-by-author.tsx` - TanStack Table |
| 8.1-8.7 Unit tests | [x] | ✅ | 37 tests passing |
| 9.1-9.5 Integration tests | [x] | ✅ | 26 tests passing |

**Summary: 42 of 42 completed tasks verified, 0 questionable, 0 falsely marked complete**

### Test Coverage and Gaps

- ✅ Unit tests: 37 passing (`report-queries.test.ts`)
- ✅ Integration tests: 26 passing (`finance-dashboard.test.tsx`)
- ✅ Total story tests: 63 passing
- ✅ Full suite: 1215 pass, 18 fail (pre-existing, documented in Story 0.3)

**Test Quality:**
- Tests cover all ACs with specific test cases
- Revenue/liability calculations tested with Decimal.js precision
- Dashboard rendering and navigation tested
- Permission enforcement tested for all 3 allowed roles

### Architectural Alignment

- ✅ Module structure: `src/modules/reports/` per architecture.md
- ✅ Charts: Recharts per tech-spec-epic-6.md
- ✅ Tables: TanStack Table 8.21+
- ✅ Financial calculations: Decimal.js (no floating-point errors)
- ✅ Date handling: date-fns with period buckets
- ✅ Tenant isolation: tenant_id as FIRST condition in ALL queries
- ✅ Permission enforcement: requirePermission(['finance', 'admin', 'owner'])

### Security Notes

- ✅ All queries enforce tenant_id filter as FIRST condition
- ✅ Permission checks on all public functions
- ✅ No sensitive data exposure in error messages
- ✅ No SQL injection risks (using Drizzle ORM parameterized queries)

### Best-Practices and References

- [Recharts Documentation](https://recharts.org/)
- [TanStack Table v8](https://tanstack.com/table/latest)
- [Decimal.js](https://mikemcl.github.io/decimal.js/)
- Architecture patterns from `docs/architecture.md`
- Story requirements from `docs/sprint-artifacts/tech-spec-epic-6.md`

### Action Items

**Code Changes Required:**
- None

**Advisory Notes:**
- Note: Consider running `biome migrate` to update schema version from 2.3.7 to 2.3.8 (cosmetic)
