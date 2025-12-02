# Story 5.5: Build Statements List and Detail View for Finance

Status: done

## Story

As a finance user,
I want to view all generated statements with filtering,
so that I can manage and resend statements as needed.

## Acceptance Criteria

1. **AC-5.5.1:** Table displays period, author, generated on date, status badge, net payable, and actions (View/Download PDF/Resend Email)
2. **AC-5.5.2:** Filters available: Period (dropdown), Author (search), Status (All/Sent/Draft/Failed), Date range generated
3. **AC-5.5.3:** Detail modal shows full calculation breakdown with expandable JSON
4. **AC-5.5.4:** Download PDF button generates presigned URL (15-minute expiry)
5. **AC-5.5.5:** Resend Email action available for sent statements

## Tasks / Subtasks

- [x] Task 1: Create statements list server actions (AC: 1, 2)
  - [x] 1.1: Add `getStatements` query function to `src/modules/statements/queries.ts`
  - [x] 1.2: Implement pagination with page/pageSize parameters
  - [x] 1.3: Add filter support for period, author, status, and date range
  - [x] 1.4: Return statements with author relations using `StatementWithRelations` type
  - [x] 1.5: Add `getStatementById` query for detail view

- [x] Task 2: Create stats aggregation queries (AC: 1)
  - [x] 2.1: Add `getStatementStats` function for dashboard stats
  - [x] 2.2: Calculate "Statements Generated This Quarter" count
  - [x] 2.3: Calculate "Total Liability" (sum of net_payable for current period)
  - [x] 2.4: Calculate "Pending Emails" (count where status != 'sent')

- [x] Task 3: Build statements list page (AC: 1, 2)
  - [x] 3.1: Create `src/app/(dashboard)/statements/page.tsx` as Server Component
  - [x] 3.2: Add permission check (Finance/Admin/Owner only)
  - [x] 3.3: Create stats cards section at top of page
  - [x] 3.4: Integrate with TanStack Table for data grid

- [x] Task 4: Build statements list table component (AC: 1)
  - [x] 4.1: Create `src/modules/statements/components/statements-list.tsx`
  - [x] 4.2: Define columns: Period, Author, Generated On, Status, Net Payable, Actions
  - [x] 4.3: Format period as "Q4 2025" pattern
  - [x] 4.4: Format net_payable with currency formatting (bold)
  - [x] 4.5: Create status badge component (Sent=green, Draft=gray, Failed=red)
  - [x] 4.6: Add row actions: View, Download PDF, Resend Email

- [x] Task 5: Build filter components (AC: 2)
  - [x] 5.1: Create `src/modules/statements/components/statements-filters.tsx`
  - [x] 5.2: Add Period filter dropdown (populated from unique periods)
  - [x] 5.3: Add Author search filter with autocomplete
  - [x] 5.4: Add Status filter (All/Sent/Draft/Failed)
  - [x] 5.5: Add Date range filter for generated_at
  - [x] 5.6: Wire filters to URL search params for shareable links

- [x] Task 6: Build statement detail modal (AC: 3)
  - [x] 6.1: Create `src/modules/statements/components/statement-detail-modal.tsx`
  - [x] 6.2: Display statement header (author, period, status, generated date)
  - [x] 6.3: Display summary section (net payable, gross royalties, recoupment)
  - [x] 6.4: Display calculation breakdown (format breakdowns with tier details)
  - [x] 6.5: Add expandable JSON view for full calculations object
  - [x] 6.6: Display email delivery status and timestamp

- [x] Task 7: Implement PDF download action (AC: 4)
  - [x] 7.1: Create download button in both list and detail views
  - [x] 7.2: Use existing `getStatementPDFUrl` action from `actions.ts`
  - [x] 7.3: Open presigned URL in new tab for download
  - [x] 7.4: Show error toast if PDF not yet generated
  - [x] 7.5: Display warning about 15-minute URL expiry

- [x] Task 8: Implement resend email action (AC: 5)
  - [x] 8.1: Add Resend Email button to list row actions and detail modal
  - [x] 8.2: Use existing `resendStatementEmail` action from `actions.ts`
  - [x] 8.3: Show confirmation dialog before resending
  - [x] 8.4: Display success/error toast notification
  - [x] 8.5: Refresh statement data after successful resend

- [x] Task 9: Update module exports (AC: 1-5)
  - [x] 9.1: Export new components from `src/modules/statements/components/index.ts`
  - [x] 9.2: Export new queries from `src/modules/statements/queries.ts`
  - [x] 9.3: Update `src/modules/statements/index.ts` with all exports

- [x] Task 10: Write unit tests (AC: 1-5)
  - [x] 10.1: Create `tests/unit/statements-list.test.tsx`
  - [x] 10.2: Test table renders with correct columns
  - [x] 10.3: Test period formatting ("Q4 2025" format)
  - [x] 10.4: Test currency formatting for net_payable
  - [x] 10.5: Test status badge rendering
  - [x] 10.6: Test filter state management
  - [x] 10.7: Test detail modal opens with correct data

- [x] Task 11: Write integration tests (AC: 3, 4, 5)
  - [x] 11.1: Create `tests/integration/statements-list-view.test.tsx`
  - [x] 11.2: Test Finance role can access /statements
  - [x] 11.3: Test Editor/Author roles are blocked
  - [x] 11.4: Test PDF download generates presigned URL
  - [x] 11.5: Test resend email updates email_sent_at
  - [x] 11.6: Test filter combinations return correct results

## Dev Notes

### Relevant Architecture Patterns and Constraints

**Split View Pattern (per UX Design Specification):**
- Statements page follows the Split View pattern established in authors/titles modules
- Left panel: paginated data grid with filters
- Right panel/modal: statement detail view

**Data Table Pattern (per architecture.md):**
```typescript
// Use TanStack Table v8.21+ for data grid
import { useReactTable, getCoreRowModel, getPaginationRowModel } from '@tanstack/react-table';

// Columns definition
const columns: ColumnDef<StatementWithRelations>[] = [
  { accessorKey: 'period', header: 'Period', cell: formatPeriod },
  { accessorKey: 'author.name', header: 'Author' },
  { accessorKey: 'created_at', header: 'Generated On', cell: formatDate },
  { accessorKey: 'status', header: 'Status', cell: StatusBadge },
  { accessorKey: 'net_payable', header: 'Net Payable', cell: formatCurrency },
  { id: 'actions', header: 'Actions', cell: ActionsCell },
];
```

**Period Formatting Pattern:**
```typescript
// Format period_start/period_end to "Q4 2025" format
function formatPeriod(start: Date, end: Date): string {
  const quarter = Math.ceil((start.getMonth() + 1) / 3);
  const year = start.getFullYear();
  return `Q${quarter} ${year}`;
}
```

**Currency Formatting (per architecture.md):**
```typescript
// Use Intl.NumberFormat for currency
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
```

**Authorization Matrix (per tech-spec-epic-5.md):**

| Action | Owner | Admin | Finance | Editor | Author |
|--------|-------|-------|---------|--------|--------|
| View all statements | YES | YES | YES | NO | NO |
| Download PDF | YES | YES | YES | NO | NO |
| Resend email | YES | YES | YES | NO | NO |

### Learnings from Previous Story

**From Story 5-4-implement-statement-email-delivery-with-resend (Status: done)**

- **Email Service Ready**: `src/modules/statements/email-service.ts` with `sendStatementEmail` function - reuse for resend
- **Resend Action Complete**: `src/modules/statements/actions.ts:resendStatementEmail` (lines 523-613) - already implements AC-5.4.5
- **PDF URL Action Complete**: `getStatementPDFUrl` action generates presigned S3 URLs (15-min expiry) - reuse for download
- **Storage Utilities**: `src/modules/statements/storage.ts` with `getStatementDownloadUrl` helper
- **Email Template**: `src/modules/statements/email-template.tsx` for reference on data structure
- **Types Defined**: `src/modules/statements/types.ts` has `StatementWithRelations`, `StatementWithDetails`, `PaginatedStatements`
- **Test Patterns**: Follow test structure from `tests/unit/statement-email-template.test.tsx`

**Files Created in Story 5.4 to Reuse:**
- `src/modules/statements/actions.ts:getStatementPDFUrl` - Use directly for PDF download
- `src/modules/statements/actions.ts:resendStatementEmail` - Use directly for resend action
- `src/modules/statements/types.ts` - Has all needed type definitions

**Technical Debt from 5.4:**
- None directly applicable to this story

[Source: docs/sprint-artifacts/5-4-implement-statement-email-delivery-with-resend.md#Dev-Agent-Record]

### Project Structure Notes

**Files to Create:**
```
src/
├── app/
│   └── (dashboard)/
│       └── statements/
│           └── page.tsx                    # Main statements list page
├── modules/
│   └── statements/
│       ├── queries.ts                      # Query functions (getStatements, getStatementStats)
│       └── components/
│           ├── statements-list.tsx         # TanStack Table data grid
│           ├── statements-filters.tsx      # Filter components
│           ├── statement-detail-modal.tsx  # Detail view modal
│           ├── statement-stats-cards.tsx   # Dashboard stats cards
│           └── statement-status-badge.tsx  # Status badge component

tests/
├── unit/
│   └── statements-list.test.tsx            # Unit tests
└── integration/
    └── statements-list-view.test.tsx       # Integration tests
```

**Files to Modify:**
```
src/modules/statements/components/index.ts  # Export new components
src/modules/statements/index.ts             # Export new queries
src/lib/dashboard-nav.ts                    # Add statements nav link (if not exists)
```

### Existing Actions to Reuse

**From `src/modules/statements/actions.ts`:**

```typescript
// For PDF download - already implemented
export async function getStatementPDFUrl(
  statementId: string,
): Promise<ActionResult<{ url: string }>>

// For resend email - already implemented
export async function resendStatementEmail(
  statementId: string,
): Promise<ActionResult<{ messageId: string }>>
```

### Query Pattern

```typescript
// src/modules/statements/queries.ts
import { and, eq, gte, lte, ilike, desc, count, sum, sql } from "drizzle-orm";
import { getDb, getCurrentTenantId } from "@/lib/auth";
import { statements } from "@/db/schema/statements";
import { authors } from "@/db/schema/authors";

export interface StatementsFilter {
  periodStart?: Date;
  periodEnd?: Date;
  authorId?: string;
  authorSearch?: string;
  status?: "draft" | "sent" | "failed";
  generatedAfter?: Date;
  generatedBefore?: Date;
}

export async function getStatements(params: {
  page?: number;
  pageSize?: number;
  filters?: StatementsFilter;
}): Promise<PaginatedStatements> {
  const db = await getDb();
  const tenantId = await getCurrentTenantId();

  // Build where conditions
  const conditions = [eq(statements.tenant_id, tenantId)];

  if (params.filters?.status) {
    conditions.push(eq(statements.status, params.filters.status));
  }
  // ... additional filter conditions

  const items = await db.query.statements.findMany({
    where: and(...conditions),
    with: { author: true, contract: true },
    limit: params.pageSize || 20,
    offset: ((params.page || 1) - 1) * (params.pageSize || 20),
    orderBy: desc(statements.created_at),
  });

  return { items, total, page, pageSize, totalPages };
}
```

### Component Pattern

**Stats Cards Component:**
```typescript
// src/modules/statements/components/statement-stats-cards.tsx
interface StatsCardsProps {
  thisQuarterCount: number;
  totalLiability: number;
  pendingEmailCount: number;
}

export function StatementStatsCards(props: StatsCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <Card>
        <CardHeader>
          <CardTitle>This Quarter</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{props.thisQuarterCount}</p>
        </CardContent>
      </Card>
      {/* Similar for Total Liability and Pending Emails */}
    </div>
  );
}
```

### Testing Strategy

**Unit Tests:**
- Table column rendering and formatting
- Period formatting function ("Q4 2025" output)
- Currency formatting for net_payable
- Status badge color variants
- Filter state management
- Modal data display

**Integration Tests:**
- Page permission enforcement (Finance/Admin/Owner only)
- Filter query integration (URL params → DB query)
- PDF download presigned URL generation
- Email resend action updates database
- Pagination works correctly

**Mocking Strategy:**
- Mock `getDb()` to return test database
- Mock S3 presigned URL generation
- Mock Resend API for email tests

### Dependencies

**Existing (already configured):**
- `@tanstack/react-table` ^8.21+ - Data grid
- `@tanstack/react-query` ^5.90+ - Server state
- `date-fns` ^4.1+ - Date formatting
- `sonner` - Toast notifications (via shadcn)

**No New Dependencies Required**

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-5.md#Story-5.5]
- [Source: docs/epics.md#Story-5.5]
- [Source: docs/architecture.md#Data-Tables]
- [Source: docs/ux-design-specification.md#Split-View-Pattern]
- [Source: src/modules/statements/actions.ts#getStatementPDFUrl]
- [Source: src/modules/statements/actions.ts#resendStatementEmail]
- [Source: src/modules/statements/types.ts#StatementWithRelations]

## Dev Agent Record

### Context Reference

docs/sprint-artifacts/5-5-build-statements-list-and-detail-view-for-finance.context.xml

### Agent Model Used

claude-opus-4-5-20251101 (Amelia / Developer Agent)

### Debug Log References

- 236 statements-related tests passing
- No TypeScript errors in statements module

### Completion Notes List

1. Created `src/modules/statements/queries.ts` with `getStatements`, `getStatementById`, `getStatementStats`, `getUniquePeriods`, and `searchAuthorsForFilter` query functions
2. Created stats aggregation with quarterly counts, total liability, and pending email tracking
3. Updated `src/app/(dashboard)/statements/page.tsx` with full client-side implementation including filters, stats cards, table, detail modal, and pagination
4. Created `StatementsList` component using TanStack Table with columns for Period, Author, Generated On, Status, Net Payable, and Actions
5. Created `StatementsFilters` component with period dropdown, author search, status filter, and date range picker
6. Created `StatementDetailModal` component with full calculation breakdown, tier details, advance recoupment section, and expandable JSON view
7. Created `StatementStatsCards` component for dashboard metrics display
8. Created `StatementStatusBadge` component with semantic colors (green=Sent, gray=Draft, red=Failed)
9. Created `StatementsPagination` component for paginated navigation
10. Integrated existing `getStatementPDFUrl` and `resendStatementEmail` actions from Story 5.4
11. Added confirmation dialog for email resend with AlertDialog component
12. URL search params integration for shareable filter states
13. All 51 new tests pass (27 unit + 24 integration)

### File List

**Files Created:**
- `src/modules/statements/queries.ts` - Query functions for statements list and stats
- `src/modules/statements/components/index.ts` - Component exports
- `src/modules/statements/components/statements-list.tsx` - TanStack Table data grid
- `src/modules/statements/components/statements-filters.tsx` - Filter components
- `src/modules/statements/components/statement-detail-modal.tsx` - Detail view modal
- `src/modules/statements/components/statement-stats-cards.tsx` - Dashboard stats cards
- `src/modules/statements/components/statement-status-badge.tsx` - Status badge component
- `src/modules/statements/components/statements-pagination.tsx` - Pagination controls
- `tests/unit/statements-list.test.tsx` - Unit tests (27 tests)
- `tests/integration/statements-list-view.test.tsx` - Integration tests (24 tests)

**Files Modified:**
- `src/app/(dashboard)/statements/page.tsx` - Full page implementation
- `src/modules/statements/index.ts` - Added exports for new queries and components

## Code Review

### Review Date
2025-11-30

### Reviewer
Amelia (Developer Agent) - claude-opus-4-5-20251101

### Outcome
**APPROVED**

### AC Validation Summary

| AC | Status | Evidence |
|----|--------|----------|
| AC-5.5.1 | ✅ PASS | `statements-list.tsx:97-161` Table with Period, Author, Generated On, Status, Net Payable, Actions. Status badge in `statement-status-badge.tsx`. Stats cards in `statement-stats-cards.tsx`. |
| AC-5.5.2 | ✅ PASS | `statements-filters.tsx:56-263` Period dropdown, Author search (debounced), Status select (All/Sent/Draft/Failed), Date range calendar. `queries.ts:46-61` interface. |
| AC-5.5.3 | ✅ PASS | `statement-detail-modal.tsx:91-324` Full calculation breakdown, tier details, advance recoupment, expandable JSON view. |
| AC-5.5.4 | ✅ PASS | `actions.ts:147-207` `getStatementPDFUrl()` generates presigned URL via `getStatementDownloadUrl()`. 15-min expiry per storage config. |
| AC-5.5.5 | ✅ PASS | `actions.ts:523-614` `resendStatementEmail()` with confirmation dialog in `page.tsx:368-393`. Updates `email_sent_at` and status. |

### Test Results
- **Unit Tests:** 27/27 pass (`tests/unit/statements-list.test.tsx`)
- **Integration Tests:** 24/24 pass (`tests/integration/statements-list-view.test.tsx`)
- **Total:** 51/51 passing

### Security Review
- ✅ `requirePermission(["finance", "admin", "owner"])` enforced on all queries and actions
- ✅ Tenant isolation via `getDb()` authenticated connection
- ✅ Explicit tenant ID validation in actions (e.g., `statement.tenant_id !== tenantId`)
- ✅ No SQL injection vectors (parameterized Drizzle queries)
- ✅ Presigned URLs have 15-minute expiry

### Code Quality
- ⚠️ Minor lint warnings: import order in `page.tsx` and `statements-list.test.tsx` (auto-fixable)
- ⚠️ 1 unused variable in test (`clearedFilters` at line 282)
- ⚠️ 1 `any` type usage in test (`calculations as any` at line 349)
- ℹ️ Formatting differences in `page.tsx` (auto-fixable with `npm run lint:fix`)

### Recommendations
1. Run `npm run lint:fix` to resolve import ordering and formatting issues
2. Remove unused `clearedFilters` variable or use underscore prefix
3. Replace `any` cast with proper type in test

### Architecture Compliance
- ✅ Follows Split View pattern per UX Design Specification
- ✅ Uses TanStack Table v8.21+ per architecture.md
- ✅ Currency formatting with `Intl.NumberFormat`
- ✅ Period formatting as "Q4 2025" pattern
- ✅ Server actions with ActionResult pattern

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2025-11-30 | 1.0 | Story drafted from tech-spec-epic-5.md and epics.md |
| 2025-11-30 | 1.1 | Story implementation complete - all ACs satisfied, 51 tests passing |
| 2025-11-30 | 1.2 | Code review: APPROVED with minor lint cleanup recommended |
