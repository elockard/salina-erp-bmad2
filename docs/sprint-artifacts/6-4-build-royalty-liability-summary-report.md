# Story 6.4: Build Royalty Liability Summary Report

Status: done

## Story

As a finance user,
I want to view royalty liability summary across all authors,
so that I can plan cash flow and payments.

## Acceptance Criteria

1. Finance/Admin/Owner users can access /reports/royalty-liability
2. Summary stats show: Total Unpaid Liability, Authors with Pending Payments, Oldest Unpaid Statement
3. Average payment per author is calculated
4. Liability by author table shows: Author, Titles, Unpaid Statements, Total Owed, Oldest Statement
5. Table is sortable by amount owed (default: highest first)
6. Advance tracking section shows authors with active advances and remaining balances
7. CSV export available for accounting system import

## Tasks / Subtasks

- [x] Task 1: Create royalty liability report page and route structure (AC: 1)
  - [x] 1.1 Create `src/app/(dashboard)/reports/royalty-liability/page.tsx` - Royalty liability report page
  - [x] 1.2 Add permission check: Finance, Admin, Owner only (Editor and Author blocked)
  - [x] 1.3 Add Royalty Liability Report link to /reports index page (enable the card)

- [x] Task 2: Implement royalty liability summary query function (AC: 2, 3)
  - [x] 2.1 Add `getRoyaltyLiabilitySummary(tenantId)` to `src/modules/reports/queries.ts`
  - [x] 2.2 Query unpaid statements (statements with payment_status != 'paid' or no payment date)
  - [x] 2.3 Calculate total unpaid liability: SUM of net_payable from unpaid statements
  - [x] 2.4 Calculate authors with pending payments: COUNT DISTINCT author_id from unpaid statements
  - [x] 2.5 Find oldest unpaid statement: MIN of period_end from unpaid statements
  - [x] 2.6 Calculate average payment per author: totalLiability / authorsCount
  - [x] 2.7 Add tenant_id filter FIRST (CRITICAL: tenant isolation)

- [x] Task 3: Implement liability by author query (AC: 4, 5)
  - [x] 3.1 Add `getLiabilityByAuthor(tenantId)` or extend `getRoyaltyLiabilitySummary()` to include `liabilityByAuthor`
  - [x] 3.2 GROUP BY author_id to aggregate: title count, unpaid statement count, total owed, oldest statement date
  - [x] 3.3 JOIN with authors table to get author name and payment method
  - [x] 3.4 Return sorted by total owed DESC (highest first)

- [x] Task 4: Implement advance balance tracking query (AC: 6)
  - [x] 4.1 Add `getAdvanceBalances(tenantId)` or include in summary query
  - [x] 4.2 Query contracts where advance_amount > advance_recouped (active advances)
  - [x] 4.3 Calculate remaining: advance_amount - advance_recouped
  - [x] 4.4 JOIN with authors and titles tables for display names
  - [x] 4.5 Return AdvanceBalanceRow[] as per tech-spec-epic-6.md

- [x] Task 5: Build royalty liability summary stats component (AC: 2, 3)
  - [x] 5.1 Create `src/modules/reports/components/liability-summary-stats.tsx`
  - [x] 5.2 Display Total Unpaid Liability card with currency formatting
  - [x] 5.3 Display Authors with Pending Payments card with count
  - [x] 5.4 Display Oldest Unpaid Statement card with date formatting
  - [x] 5.5 Display Average Payment per Author card
  - [x] 5.6 Add loading skeleton state for each card

- [x] Task 6: Build liability by author table component (AC: 4, 5)
  - [x] 6.1 Create `src/modules/reports/components/liability-by-author-table.tsx`
  - [x] 6.2 Use TanStack Table for sortable columns
  - [x] 6.3 Columns: Author Name, Title Count, Unpaid Statements, Total Owed, Oldest Statement, Payment Method
  - [x] 6.4 Default sort: Total Owed DESC (highest first)
  - [x] 6.5 Add column headers with sorting indicators
  - [x] 6.6 Format currency columns with formatCurrency()
  - [x] 6.7 Format date columns with date-fns
  - [x] 6.8 Handle empty state (no unpaid statements)

- [x] Task 7: Build advance tracking section component (AC: 6)
  - [x] 7.1 Create `src/modules/reports/components/advance-tracking-section.tsx`
  - [x] 7.2 Display table of authors with active advances
  - [x] 7.3 Columns: Author, Title, Advance Amount, Recouped, Remaining Balance
  - [x] 7.4 Show progress bar for recoupment percentage
  - [x] 7.5 Handle empty state (no active advances)

- [x] Task 8: Implement CSV export server action (AC: 7)
  - [x] 8.1 Add `exportLiabilityReportCSV()` to `src/modules/reports/actions.ts`
  - [x] 8.2 Generate CSV with headers: Author, Titles, Unpaid Statements, Total Owed, Oldest Statement, Payment Method
  - [x] 8.3 Include advance balance data as separate section or merged rows
  - [x] 8.4 Return CSV string for download
  - [x] 8.5 Add permission check (Finance, Admin, Owner only)

- [x] Task 9: Build export button component
  - [x] 9.1 Create export button in page or reuse existing pattern from sales report
  - [x] 9.2 Call exportLiabilityReportCSV() on click
  - [x] 9.3 Trigger browser download with filename: `royalty-liability-{date}.csv`
  - [x] 9.4 Show loading state during export

- [x] Task 10: Assemble royalty liability report page (AC: 1-7)
  - [x] 10.1 Compose summary stats, liability table, advance section, export button in page layout
  - [x] 10.2 Add responsive layout: summary on top, table in middle, advances at bottom
  - [x] 10.3 Add Suspense boundaries for independent loading
  - [x] 10.4 Add page title and description

- [x] Task 11: Write unit tests for liability queries (AC: 2, 3, 4, 6)
  - [x] 11.1 Create `tests/unit/royalty-liability-report.test.ts`
  - [x] 11.2 Test total unpaid liability calculation
  - [x] 11.3 Test authors with pending payments count
  - [x] 11.4 Test oldest unpaid statement detection
  - [x] 11.5 Test average payment calculation
  - [x] 11.6 Test liability by author grouping and sorting
  - [x] 11.7 Test advance balance calculation (remaining = amount - recouped)
  - [x] 11.8 Test tenant isolation
  - [x] 11.9 Test empty data handling

- [x] Task 12: Write integration tests for liability report page (AC: 1, 5)
  - [x] 12.1 Create `tests/integration/royalty-liability-report.test.tsx`
  - [x] 12.2 Test page renders for Finance user
  - [x] 12.3 Test page renders for Admin user
  - [x] 12.4 Test page renders for Owner user
  - [x] 12.5 Test page blocks Editor role (permission denied)
  - [x] 12.6 Test page blocks Author role (permission denied)
  - [x] 12.7 Test summary stats display correct data
  - [x] 12.8 Test table sorting by total owed

- [x] Task 13: Write E2E tests for royalty liability report (AC: 7)
  - [x] 13.1 Create `tests/e2e/royalty-liability-report.spec.ts`
  - [x] 13.2 Test page navigation from reports index
  - [x] 13.3 Test CSV export triggers download
  - [x] 13.4 Test table column sorting interaction

## Dev Notes

### Relevant Architecture Patterns and Constraints

**Module Structure (per architecture.md):**
```
src/modules/reports/
├── components/
│   ├── liability-summary-stats.tsx      # NEW
│   ├── liability-by-author-table.tsx    # NEW
│   └── advance-tracking-section.tsx     # NEW
├── queries.ts         # EXTEND with getRoyaltyLiabilitySummary()
├── actions.ts         # EXTEND with exportLiabilityReportCSV()
└── types.ts           # Types already defined in tech-spec-epic-6.md
```

**Route Structure (per tech-spec-epic-6.md):**
```
src/app/(dashboard)/reports/
├── page.tsx              # Reports index (EXISTS - enable Royalty Liability link)
├── sales/
│   └── page.tsx          # Sales report (EXISTS from 6.2)
├── isbn-pool/
│   └── page.tsx          # ISBN pool report (EXISTS from 6.3)
└── royalty-liability/
    └── page.tsx          # Royalty liability report (NEW)
```

**Technology Stack (already installed):**
- **Tables:** TanStack Table 8.21+ (already in use)
- **Currency:** Decimal.js for aggregations, formatCurrency() for display
- **Dates:** date-fns 4.1+ for date formatting
- **Export:** Native CSV generation (no additional dependencies)

**Multi-Tenant Isolation (CRITICAL):**
```typescript
// EVERY query MUST include tenant_id filter as FIRST condition
const statements = await db.query.statements.findMany({
  where: and(
    eq(statements.tenant_id, tenantId), // FIRST condition, ALWAYS
    // ... other conditions (payment status, etc.)
  ),
});
```

**Permission Matrix (per tech-spec-epic-6.md):**
| Feature | Owner | Admin | Finance | Editor | Author |
|---------|-------|-------|---------|--------|--------|
| Royalty Liability Report | ✅ | ✅ | ✅ | ❌ | ❌ |

**Caching Strategy:**
- Reports use `dynamic = "force-dynamic"` (no caching for real-time data)
- Report generation < 3 seconds target

[Source: docs/architecture.md#Technology-Stack-Details]
[Source: docs/architecture.md#Data-Access-Patterns]
[Source: docs/sprint-artifacts/tech-spec-epic-6.md#Story-6.4]

### Project Structure Notes

**Files to Create:**
```
src/app/(dashboard)/reports/royalty-liability/page.tsx           # Royalty liability report page
src/modules/reports/components/liability-summary-stats.tsx       # Summary stats cards
src/modules/reports/components/liability-by-author-table.tsx     # Author liability table
src/modules/reports/components/advance-tracking-section.tsx      # Advance balance tracking
tests/unit/royalty-liability-report.test.ts                      # Unit tests
tests/integration/royalty-liability-report.test.tsx              # Integration tests
tests/e2e/royalty-liability-report.spec.ts                       # E2E tests
```

**Files to Modify:**
```
src/app/(dashboard)/reports/page.tsx     # Enable Royalty Liability link card
src/modules/reports/queries.ts           # Add getRoyaltyLiabilitySummary()
src/modules/reports/actions.ts           # Add exportLiabilityReportCSV()
src/modules/reports/components/index.ts  # Export new components
```

**Database Tables Used (existing):**
- `statements` - Source for unpaid liability (net_payable, period_end, author_id, payment_status)
- `contracts` - Source for advance tracking (advance_amount, advance_recouped, author_id, title_id)
- `authors` - For author names and payment methods
- `titles` - For title names in advance tracking

**Existing Schema Reference (from statements and contracts):**
```typescript
// statements table (from Epic 5):
// - id, tenant_id, author_id, contract_id
// - period_start, period_end
// - total_royalty_earned, recoupment, net_payable
// - payment_status: "pending" | "paid" (or similar)
// - created_at, updated_at

// contracts table (from Epic 4):
// - id, tenant_id, author_id, title_id
// - advance_amount, advance_paid, advance_recouped
// - status: "active" | "terminated" | "suspended"
```

### Learnings from Previous Story

**From Story 6.3: Build ISBN Pool Status Report (Status: done)**

- **Reports Module Pattern**: Complete module at `src/modules/reports/` with types, schema, queries, actions, and components. **REUSE this structure - do not recreate.**
- **Reports Index Page**: `/reports/page.tsx` exists with card-based navigation. Enable Royalty Liability link card (set available: true).
- **Permission Pattern**: Follow same pattern as other reports - use `hasPermission()` for Finance, Admin, Owner check.
- **Test Patterns**: Use `getAllByTestId` for elements that may appear multiple times. All tests use Vitest.
- **Pre-existing Test Failures**: 18 tests in permissions.test.ts, tenant-settings.test.ts, users-actions.test.ts fail but are pre-existing (documented in Story 0.3). Do not attempt to fix.
- **Test Results Baseline**: ~1215+ unit/integration tests pass. Maintain this baseline.
- **Editorial Navy Color**: Use #1e3a5f for any charts or visual elements.
- **Tenant Isolation**: tenant_id filter FIRST in all queries.
- **Suspense Boundaries**: Use for independent component loading.

**Reusable Patterns from Story 6.2/6.3:**
- CSV export pattern from sales report actions
- Table sorting with TanStack Table
- Date range and filtering patterns
- Stats card layout patterns

[Source: docs/sprint-artifacts/6-3-build-isbn-pool-status-report.md#Completion-Notes-List]
[Source: docs/sprint-artifacts/6-3-build-isbn-pool-status-report.md#File-List]

### Type Definitions (per tech-spec-epic-6.md)

```typescript
// src/modules/reports/types.ts - Types should already exist per tech-spec

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
```

### Query Signatures (per tech-spec-epic-6.md)

```typescript
// src/modules/reports/queries.ts
export async function getRoyaltyLiabilitySummary(
  tenantId: string
): Promise<RoyaltyLiabilitySummary>;

// src/modules/reports/actions.ts
export async function exportLiabilityReportCSV(): Promise<ActionResult<string>>;
```

### References

- [Tech Spec Epic 6 - Story 6.4](./tech-spec-epic-6.md#story-64-royalty-liability-summary-report) - Acceptance criteria and detailed design
- [Architecture - Data Access Patterns](../architecture.md#data-access-patterns) - CRUD and aggregation patterns
- [Architecture - Technology Stack](../architecture.md#technology-stack-details) - Tables, currency formatting
- [Epics - Story 6.4](../epics.md#story-64-build-royalty-liability-summary-report) - User story and acceptance criteria
- [Story 6.3](./6-3-build-isbn-pool-status-report.md) - Previous story learnings
- [PRD](../prd.md) - FR74 (royalty liability summary)

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/6-4-build-royalty-liability-summary-report.context.xml

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- All 13 tasks implemented and tested
- Unit tests: 33 tests passing (tests/unit/royalty-liability-report.test.ts)
- Integration tests: 30 tests passing (tests/integration/royalty-liability-report.test.tsx)
- E2E tests: Created (tests/e2e/royalty-liability-report.spec.ts)
- TypeScript compilation clean (no new errors)
- Biome lint clean on all new files
- Royalty Liability card enabled on /reports index page
- Permission enforcement: Finance, Admin, Owner only (Editor and Author blocked)
- Tenant isolation: tenant_id filter FIRST in all queries
- CSV export includes summary section, liability by author, and active advances

### File List

**Created:**
- src/app/(dashboard)/reports/royalty-liability/page.tsx
- src/modules/reports/components/liability-summary-stats.tsx
- src/modules/reports/components/liability-by-author-table.tsx
- src/modules/reports/components/advance-tracking-section.tsx
- src/modules/reports/components/liability-export-button.tsx
- tests/unit/royalty-liability-report.test.ts
- tests/integration/royalty-liability-report.test.tsx
- tests/e2e/royalty-liability-report.spec.ts

**Modified:**
- src/app/(dashboard)/reports/page.tsx (enabled Royalty Liability card)
- src/modules/reports/queries.ts (added getRoyaltyLiabilitySummary)
- src/modules/reports/actions.ts (added fetchRoyaltyLiabilitySummary, exportLiabilityReportCSV)
- src/modules/reports/types.ts (added AuthorLiabilityRow, AdvanceBalanceRow, RoyaltyLiabilitySummary)
- src/modules/reports/components/index.ts (exported new components)

## Code Review Record

### Review Date
2025-12-01

### Reviewer
Dev Agent (Senior Developer)

### Review Outcome
**APPROVED** ✅

### Acceptance Criteria Validation

| AC# | Requirement | Status | Evidence |
|-----|-------------|--------|----------|
| AC-1 | Finance/Admin/Owner can access /reports/royalty-liability | ✅ PASS | `page.tsx:67-70` - hasPermission with redirect |
| AC-2 | Summary stats: Total Unpaid, Authors Pending, Oldest Statement | ✅ PASS | `liability-summary-stats.tsx` - All 4 stat cards |
| AC-3 | Average payment per author calculated | ✅ PASS | `queries.ts:906-911` - Decimal.js calculation |
| AC-4 | Liability table with all columns | ✅ PASS | `liability-by-author-table.tsx:82-188` |
| AC-5 | Table sortable, default highest first | ✅ PASS | Default sort `{ id: "totalOwed", desc: true }` |
| AC-6 | Advance tracking section | ✅ PASS | `advance-tracking-section.tsx` with progress bars |
| AC-7 | CSV export available | ✅ PASS | `liability-export-button.tsx` + `actions.ts:284-373` |

### Security Checklist

| Check | Status |
|-------|--------|
| SQL Injection Prevention | ✅ Drizzle ORM parameterized |
| XSS Prevention | ✅ React auto-escaping |
| Authorization | ✅ Dual-layer permission checks |
| Tenant Isolation | ✅ tenant_id FIRST in all queries |
| CSV Export Security | ✅ Server-side with proper escaping |

### Test Results

- Unit tests: 33 passing
- Integration tests: 30 passing
- E2E tests: Created
- Total: 63 tests

### Code Quality

**Strengths:**
- Clean component architecture
- Proper TypeScript typing
- Decimal.js for financial precision
- Comprehensive test coverage
- Accessible UI (aria-labels)

**Issues Fixed During Review:**
- 3 minor Biome formatting issues resolved

### Patterns Compliance

- ✅ Module structure follows convention
- ✅ Server actions with "use server"
- ✅ Dynamic rendering for real-time data
- ✅ Editorial Navy (#1e3a5f) for branding
- ✅ Suspense boundaries for loading states

### Recommendation

Story is **production-ready** and approved for deployment.
