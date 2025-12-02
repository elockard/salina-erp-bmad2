# Story 6.3: Build ISBN Pool Status Report

Status: done

## Story

As a user,
I want to view ISBN pool status report,
so that I know when to order more ISBNs.

## Acceptance Criteria

1. Users can access /reports/isbn-pool page
2. Stats cards show: Physical ISBNs (Available/Assigned/Total), Ebook ISBNs (Available/Assigned/Total)
3. Utilization percentage is calculated and displayed
4. Pie chart shows Available vs Assigned breakdown by type
5. Timeline chart shows ISBN assignments over time
6. Warning alert displayed when available ISBNs < 10 (physical or ebook)
7. Burn rate calculation shows ISBNs assigned per month
8. Estimated runout date displayed based on burn rate
9. "Import ISBN Block" quick action button links to ISBN import page

## Tasks / Subtasks

- [x] Task 1: Create ISBN pool report page and route structure (AC: 1)
  - [x] 1.1 Create `src/app/(dashboard)/reports/isbn-pool/page.tsx` - ISBN pool report page
  - [x] 1.2 Add permission check: all staff roles can access (Author role blocked like other reports)
  - [x] 1.3 Add ISBN Pool Report link to /reports index page

- [x] Task 2: Implement ISBN pool metrics query function (AC: 2, 3, 7, 8)
  - [x] 2.1 Add `getISBNPoolMetrics(tenantId)` to `src/modules/reports/queries.ts`
  - [x] 2.2 Query ISBN counts by type (physical, ebook) and status (available, assigned)
  - [x] 2.3 Calculate utilization percentage: (assigned / total) * 100
  - [x] 2.4 Calculate burn rate: ISBNs assigned per month (last 6 months average)
  - [x] 2.5 Calculate estimated runout date: available / burnRate months from now
  - [x] 2.6 Add tenant_id filter FIRST (CRITICAL: tenant isolation)

- [x] Task 3: Implement ISBN assignment history query (AC: 5, 7)
  - [x] 3.1 Add `getISBNAssignmentHistory(tenantId, months)` to `src/modules/reports/queries.ts`
  - [x] 3.2 Group ISBN assignments by month using date-fns
  - [x] 3.3 Return array of { month: string, assigned: number } for timeline chart

- [x] Task 4: Build ISBN pool stats cards component (AC: 2, 3)
  - [x] 4.1 Create `src/modules/reports/components/isbn-pool-stats.tsx`
  - [x] 4.2 Display Physical ISBNs card: Available / Assigned / Total with visual indicators
  - [x] 4.3 Display Ebook ISBNs card: Available / Assigned / Total with visual indicators
  - [x] 4.4 Display Utilization card: percentage with progress bar
  - [x] 4.5 Add loading skeleton state

- [x] Task 5: Build ISBN pool charts component (AC: 4, 5)
  - [x] 5.1 Create `src/modules/reports/components/isbn-pool-charts.tsx`
  - [x] 5.2 Implement Pie chart showing Available vs Assigned using Recharts PieChart
  - [x] 5.3 Implement Timeline chart showing assignments per month using Recharts LineChart or AreaChart
  - [x] 5.4 Use Editorial Navy color scheme (#1e3a5f) from existing chart components
  - [x] 5.5 Add hover tooltips with exact counts
  - [x] 5.6 Handle empty data state with appropriate messaging

- [x] Task 6: Build ISBN pool warning alert component (AC: 6)
  - [x] 6.1 Create `src/modules/reports/components/isbn-pool-alert.tsx`
  - [x] 6.2 Show warning alert when physical available < 10
  - [x] 6.3 Show warning alert when ebook available < 10
  - [x] 6.4 Use shadcn/ui Alert component with warning variant
  - [x] 6.5 Include count in alert message: "Only X Physical ISBNs remaining - consider importing more"

- [x] Task 7: Build ISBN pool insights component (AC: 7, 8, 9)
  - [x] 7.1 Create `src/modules/reports/components/isbn-pool-insights.tsx`
  - [x] 7.2 Display burn rate: "ISBNs assigned per month: X"
  - [x] 7.3 Display runout estimate: "At current rate, Physical ISBNs will run out in approximately X months"
  - [x] 7.4 Display runout date: "Estimated runout: Month Year" or "N/A" if burn rate is 0
  - [x] 7.5 Add "Import ISBN Block" button linking to /titles (ISBN import modal trigger)

- [x] Task 8: Assemble ISBN pool report page with all components (AC: 1-9)
  - [x] 8.1 Compose stats cards, alerts, charts, and insights in page layout
  - [x] 8.2 Add responsive layout: stats on top, charts in middle, insights at bottom
  - [x] 8.3 Add Suspense boundaries for independent loading
  - [x] 8.4 Export ISBN pool data types from modules/reports

- [x] Task 9: Write unit tests for ISBN pool queries (AC: 2, 3, 7, 8)
  - [x] 9.1 Create `tests/unit/isbn-pool-report.test.ts`
  - [x] 9.2 Test ISBN counts by type and status
  - [x] 9.3 Test utilization percentage calculation
  - [x] 9.4 Test burn rate calculation
  - [x] 9.5 Test runout date calculation
  - [x] 9.6 Test assignment history grouping by month
  - [x] 9.7 Test empty ISBN pool handling
  - [x] 9.8 Test tenant isolation

- [x] Task 10: Write integration tests for ISBN pool report page (AC: 1, 6)
  - [x] 10.1 Create `tests/integration/isbn-pool-report.test.tsx`
  - [x] 10.2 Test page renders for Finance user
  - [x] 10.3 Test page renders for Admin user
  - [x] 10.4 Test page renders for Editor user
  - [x] 10.5 Test warning alert appears when available < 10
  - [x] 10.6 Test stats cards display correct data

- [x] Task 11: Write E2E tests for ISBN pool report (AC: 4, 5, 9)
  - [x] 11.1 Create `tests/e2e/isbn-pool-report.spec.ts`
  - [x] 11.2 Test page navigation from reports index
  - [x] 11.3 Test charts render with data
  - [x] 11.4 Test Import ISBN Block button navigates correctly

## Dev Notes

### Relevant Architecture Patterns and Constraints

**Module Structure (per architecture.md):**
```
src/modules/reports/
├── components/
│   ├── isbn-pool-stats.tsx      # NEW
│   ├── isbn-pool-charts.tsx     # NEW
│   ├── isbn-pool-alert.tsx      # NEW
│   └── isbn-pool-insights.tsx   # NEW
├── queries.ts         # EXTEND with getISBNPoolMetrics(), getISBNAssignmentHistory()
└── types.ts           # EXTEND with ISBNPoolMetrics
```

**Route Structure (per tech-spec-epic-6.md):**
```
src/app/(dashboard)/reports/
├── page.tsx              # Reports index (EXISTS - add ISBN Pool link)
├── sales/
│   └── page.tsx          # Sales report (EXISTS from 6.2)
└── isbn-pool/
    └── page.tsx          # ISBN pool report (NEW)
```

**Technology Stack (already installed from Story 6.1/6.2):**
- **Charts:** Recharts 2.15.3 (installed, reusable components in `src/components/charts/`)
- **Dates:** date-fns 4.1+ for month grouping
- **No export needed:** This report focuses on visualization, not CSV export

**Multi-Tenant Isolation (CRITICAL):**
```typescript
// EVERY query MUST include tenant_id filter as FIRST condition
const isbns = await db.query.isbns.findMany({
  where: and(
    eq(isbns.tenant_id, tenantId), // FIRST condition, ALWAYS
    // ... other conditions
  ),
});
```

**Permission Matrix (per tech-spec-epic-6.md):**
| Feature | Owner | Admin | Finance | Editor | Author |
|---------|-------|-------|---------|--------|--------|
| ISBN Pool Report | ✅ | ✅ | ✅ | ✅ | ❌ |

**Caching Strategy:**
- Reports use `dynamic = "force-dynamic"` (no caching for real-time data)
- Report generation < 3 seconds target

[Source: docs/architecture.md#Technology-Stack-Details]
[Source: docs/architecture.md#Data-Access-Patterns]
[Source: docs/sprint-artifacts/tech-spec-epic-6.md#Story-6.3]

### Project Structure Notes

**Files to Create:**
```
src/app/(dashboard)/reports/isbn-pool/page.tsx                  # ISBN pool report page
src/modules/reports/components/isbn-pool-stats.tsx              # Stats cards
src/modules/reports/components/isbn-pool-charts.tsx             # Pie + timeline charts
src/modules/reports/components/isbn-pool-alert.tsx              # Warning alerts
src/modules/reports/components/isbn-pool-insights.tsx           # Burn rate, runout, action button
tests/unit/isbn-pool-report.test.ts                             # Unit tests
tests/integration/isbn-pool-report.test.tsx                     # Integration tests
tests/e2e/isbn-pool-report.spec.ts                              # E2E tests
```

**Files to Modify:**
```
src/app/(dashboard)/reports/page.tsx     # Add ISBN Pool link card
src/modules/reports/queries.ts           # Add getISBNPoolMetrics(), getISBNAssignmentHistory()
src/modules/reports/types.ts             # Add ISBNPoolMetrics type
src/modules/reports/components/index.ts  # Export new components
```

**Database Tables Used (existing from Epic 2):**
- `isbns` - Source of all ISBN data (isbn, type, status, assigned_at, tenant_id)

**Existing ISBN Schema Reference (from docs/architecture.md and src/db/schema/isbns.ts):**
```typescript
// Expected fields in isbns table:
// - id: uuid
// - tenant_id: uuid (FK to tenants)
// - isbn: text (ISBN-13 format)
// - type: "physical" | "ebook"
// - status: "available" | "assigned" | "retired"
// - assigned_at: timestamp (when assigned to a title)
// - title_id: uuid (FK to titles, nullable)
// - created_at: timestamp (import date)
```

### Learnings from Previous Story

**From Story 6.2: Build Sales Reports with Multi-Dimensional Filtering (Status: done)**

- **Reports Module Exists**: Complete module at `src/modules/reports/` with types, schema, queries, actions, and components. **REUSE this structure - do not recreate.**
- **Recharts Integration**: Recharts@2.15.3 installed and working. Reusable chart components at `src/components/charts/` with Editorial Navy color scheme (#1e3a5f).
- **Reports Index Page**: `/reports/page.tsx` exists with card-based navigation. Add ISBN Pool link card to this page.
- **Permission Pattern**: Follow same pattern as sales report - block Author role, allow all others.
- **Test Patterns**: Use `getAllByTestId` for elements that may appear multiple times. All tests use Vitest.
- **Pre-existing Test Failures**: 18 tests in permissions.test.ts, tenant-settings.test.ts, users-actions.test.ts fail but are pre-existing (documented in Story 0.3). Do not attempt to fix.
- **Test Results Baseline**: ~1215+ unit/integration tests pass. Maintain this baseline.

**Reusable Components from Story 6.1/6.2:**
- `src/components/charts/bar-chart.tsx` - Available for bar chart if needed
- `src/components/charts/pie-chart.tsx` - Use for Available vs Assigned chart
- Chart color scheme: Editorial Navy (#1e3a5f)

[Source: docs/sprint-artifacts/6-2-build-sales-reports-with-multi-dimensional-filtering.md#Completion-Notes-List]
[Source: docs/sprint-artifacts/6-2-build-sales-reports-with-multi-dimensional-filtering.md#File-List]

### Type Definitions (per tech-spec-epic-6.md)

```typescript
// src/modules/reports/types.ts - ADD this type
export interface ISBNPoolMetrics {
  physical: { available: number; assigned: number; total: number };
  ebook: { available: number; assigned: number; total: number };
  utilizationPercent: number;
  burnRate: number; // ISBNs assigned per month
  estimatedRunout: Date | null; // When pool will be exhausted
}
```

### Query Signatures (per tech-spec-epic-6.md)

```typescript
// src/modules/reports/queries.ts
export async function getISBNPoolMetrics(tenantId: string): Promise<ISBNPoolMetrics>;

export async function getISBNAssignmentHistory(
  tenantId: string,
  months: number
): Promise<{ month: string; assigned: number }[]>;
```

### References

- [Tech Spec Epic 6 - Story 6.3](./tech-spec-epic-6.md#story-63-isbn-pool-status-report) - Acceptance criteria and detailed design
- [Architecture - Data Access Patterns](../architecture.md#data-access-patterns) - CRUD and aggregation patterns
- [Architecture - Technology Stack](../architecture.md#technology-stack-details) - Charts, tables
- [Epics - Story 6.3](../epics.md#story-63-build-isbn-pool-status-report) - User story and acceptance criteria
- [Story 6.2](./6-2-build-sales-reports-with-multi-dimensional-filtering.md) - Previous story learnings
- [PRD](../prd.md) - FR73 (ISBN pool status report)

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/6-3-build-isbn-pool-status-report.context.xml

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

1. All 9 acceptance criteria implemented and verified
2. 62 tests passing (32 unit + 30 integration)
3. E2E test suite created with 20+ test cases
4. Editorial Navy color scheme (#1e3a5f) consistently applied to charts
5. Tenant isolation enforced with tenant_id FIRST in all queries
6. Suspense boundaries implemented for independent component loading
7. Empty state handling for both pie chart and timeline chart
8. Warning alert threshold configurable (default: 10)

### File List

**Created:**
- `src/app/(dashboard)/reports/isbn-pool/page.tsx` - ISBN pool report page
- `src/modules/reports/components/isbn-pool-stats.tsx` - Stats cards
- `src/modules/reports/components/isbn-pool-charts.tsx` - Pie + timeline charts
- `src/modules/reports/components/isbn-pool-alert.tsx` - Warning alerts
- `src/modules/reports/components/isbn-pool-insights.tsx` - Burn rate, runout, action
- `tests/unit/isbn-pool-report.test.ts` - 32 unit tests
- `tests/integration/isbn-pool-report.test.tsx` - 30 integration tests
- `tests/e2e/isbn-pool-report.spec.ts` - E2E test suite

**Modified:**
- `src/app/(dashboard)/reports/page.tsx` - Enabled ISBN Pool link (available: true)
- `src/modules/reports/queries.ts` - Added getISBNPoolMetrics(), getISBNAssignmentHistory()
- `src/modules/reports/types.ts` - Added ISBNPoolMetrics, ISBNAssignmentHistoryItem
- `src/modules/reports/components/index.ts` - Exported new components
- `src/modules/reports/index.ts` - Exported new queries and types

## Code Review

### Review Date: 2025-12-01

### Reviewer: Claude Opus 4.5

### Review Status: ✅ APPROVED

---

### Acceptance Criteria Verification

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| 1 | Users can access /reports/isbn-pool page | ✅ | `src/app/(dashboard)/reports/isbn-pool/page.tsx:70-80` - Page renders with permission check |
| 2 | Stats cards show Physical/Ebook ISBNs with Available/Assigned/Total | ✅ | `src/modules/reports/components/isbn-pool-stats.tsx:34-91` - Three cards with correct data |
| 3 | Utilization percentage calculated and displayed | ✅ | `src/modules/reports/queries.ts:734-740` - Calculation; `isbn-pool-stats.tsx:94-117` - Display |
| 4 | Pie chart shows Available vs Assigned by type | ✅ | `src/modules/reports/components/isbn-pool-charts.tsx:34-67,95-106` - Four-segment pie chart |
| 5 | Timeline chart shows assignments over time | ✅ | `src/modules/reports/components/isbn-pool-charts.tsx:119-143` - LineChart with 6-month history |
| 6 | Warning alert when available < 10 | ✅ | `src/modules/reports/components/isbn-pool-alert.tsx:30-68` - Configurable threshold |
| 7 | Burn rate shows ISBNs/month | ✅ | `src/modules/reports/queries.ts:743-759` - 6-month average; `isbn-pool-insights.tsx:49-76` |
| 8 | Estimated runout date displayed | ✅ | `src/modules/reports/queries.ts:762-769` - Calculation; `isbn-pool-insights.tsx:79-107` |
| 9 | Import ISBN Block button links to /titles | ✅ | `src/modules/reports/components/isbn-pool-insights.tsx:133-139` - Link with href="/titles" |

---

### Task Completion Verification

| Task | Description | Status | Notes |
|------|-------------|--------|-------|
| 1 | Page and route structure | ✅ | Page at correct path with permission check |
| 2 | getISBNPoolMetrics() query | ✅ | Lines 685-777 in queries.ts with tenant isolation |
| 3 | getISBNAssignmentHistory() query | ✅ | Lines 794-830 in queries.ts |
| 4 | Stats cards component | ✅ | isbn-pool-stats.tsx with 3 cards |
| 5 | Charts component | ✅ | isbn-pool-charts.tsx with pie + line charts |
| 6 | Alert component | ✅ | isbn-pool-alert.tsx with threshold prop |
| 7 | Insights component | ✅ | isbn-pool-insights.tsx with burn rate, runout, button |
| 8 | Page assembly | ✅ | page.tsx with Suspense boundaries |
| 9 | Unit tests | ✅ | 32 tests covering queries and calculations |
| 10 | Integration tests | ✅ | 30 tests covering components |
| 11 | E2E tests | ✅ | 20+ tests in isbn-pool-report.spec.ts |

---

### Code Quality Assessment

#### Architecture Alignment
- ✅ Follows modular monolith pattern per architecture.md
- ✅ Uses existing reports module structure
- ✅ Reuses chart components from src/components/charts/
- ✅ Uses `dynamic = "force-dynamic"` for real-time data

#### Security & Multi-Tenancy
- ✅ `tenant_id` filter is FIRST in all queries (lines 699, 752, 817)
- ✅ Permission checks with `requirePermission()` on all queries
- ✅ Author role blocked via `hasPermission()` on page

#### Code Style
- ✅ TypeScript types properly defined in types.ts
- ✅ JSDoc comments on query functions
- ✅ Consistent use of shadcn/ui components
- ✅ data-testid attributes for all testable elements

#### Test Coverage
- ✅ Unit tests for calculation logic
- ✅ Integration tests for component rendering
- ✅ E2E tests for navigation and user flows
- ✅ Empty state handling tested

---

### Issues Found

**None** - Implementation meets all requirements.

---

### Recommendations (Non-blocking)

1. **Performance consideration**: The `getISBNAssignmentHistory()` function executes N sequential queries (one per month). For production scale, consider a single query with SQL-level month grouping.

2. **Accessibility**: The progress bars in stats cards could benefit from `aria-label` attributes describing the utilization percentage.

3. **Pre-existing TypeScript errors**: `pie-chart.tsx` has pre-existing type errors that should be addressed in a future infrastructure story.

---

### Final Verdict

**✅ APPROVED** - Story 6.3 implementation is complete and meets all acceptance criteria. Code follows established patterns, maintains tenant isolation, and has comprehensive test coverage.

