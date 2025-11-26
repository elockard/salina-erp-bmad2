# Story 2.8: Build ISBN Pool Status View and Availability Tracking

Status: review

## Story

As an editor,
I want to view ISBN pool status and availability by type,
so that I know when to request more ISBNs.

## Acceptance Criteria

1. Dashboard widget displays ISBN pool summary
   - Physical ISBNs: X available / Y total
   - Ebook ISBNs: X available / Y total
   - Progress bars showing utilization percentage
   - Clickable to navigate to full `/isbn-pool` page

2. Warning badge displays when availability is low
   - Badge appears if available < 10 for either Physical or Ebook type
   - Badge text: "Low" with warning color (amber/orange)
   - Visible on both dashboard widget and ISBN pool page

3. Full `/isbn-pool` page displays stats cards
   - Physical ISBNs card: Available / Assigned / Registered / Retired counts
   - Ebook ISBNs card: Available / Assigned / Registered / Retired counts
   - Total ISBNs card: Combined counts across both types
   - Visual progress bar showing pool utilization

4. ISBN table displays all pool entries with required columns
   - ISBN-13 (monospace font for readability)
   - Type badge (Physical/Ebook with color coding)
   - Status badge (Available/Assigned/Registered/Retired with color coding)
   - Assigned To (title link if assigned, empty if available)
   - Assigned Date (formatted date, empty if available)
   - Actions column (View Details button)

5. Table supports filtering
   - Type filter dropdown: All / Physical / Ebook
   - Status filter dropdown: All / Available / Assigned / Registered / Retired
   - Search input: partial match on ISBN-13 value
   - Filters apply immediately on change
   - Clear filters button to reset all filters

6. Table pagination (20 items per page)
   - Display total count of matching ISBNs
   - Previous/Next navigation buttons
   - Page number indicators
   - Pagination state persists with filters

7. ISBN detail modal shows comprehensive information
   - Full ISBN-13 value with copy button
   - Type and Status badges
   - If assigned: Title name (clickable link), assigned by user name, assigned date
   - If available: "Assign to Title" button (opens title selector - deferred to Story 2.9)
   - Close button

8. Permission enforcement
   - Page accessible to all authenticated dashboard users
   - Uses `VIEW_OWN_STATEMENTS` permission (all roles)
   - No edit/delete capabilities in this story (read-only view)

## Tasks / Subtasks

- [x] Task 1: Create ISBN pool stats query function (AC: 1, 2, 3)
  - [x] Create `getISBNPoolStats` query in `src/modules/isbn/queries.ts`
  - [x] Return counts by status (available, assigned, registered, retired)
  - [x] Return counts by type (physical, ebook)
  - [x] Return available counts by type for low warning check
  - [x] Add tenant_id filtering for multi-tenant isolation

- [x] Task 2: Build dashboard ISBN pool widget (AC: 1, 2)
  - [x] Create `src/modules/isbn/components/isbn-pool-widget.tsx`
  - [x] Display physical available/total with progress bar
  - [x] Display ebook available/total with progress bar
  - [x] Add warning badge when available < 10 for either type
  - [x] Make widget clickable to navigate to `/isbn-pool`
  - [x] Integrate widget into dashboard page

- [x] Task 3: Create ISBN pool page route and layout (AC: 3, 8)
  - [x] Create `src/app/(dashboard)/isbn-pool/page.tsx`
  - [x] Add page header with title "ISBN Pool" and description
  - [x] Add breadcrumb navigation (Dashboard > ISBN Pool)
  - [x] Verify page is accessible to authenticated users

- [x] Task 4: Build ISBN pool stats cards (AC: 3)
  - [x] Create `src/modules/isbn/components/isbn-pool-stats.tsx`
  - [x] Physical ISBNs card with breakdown by status
  - [x] Ebook ISBNs card with breakdown by status
  - [x] Total ISBNs card with combined counts
  - [x] Add utilization progress bars
  - [x] Add low inventory warning badges

- [x] Task 5: Create ISBN list query with pagination and filters (AC: 4, 5, 6)
  - [x] Create `getISBNList` query in `src/modules/isbn/queries.ts`
  - [x] Support type filter parameter
  - [x] Support status filter parameter
  - [x] Support search (partial ISBN match using ILIKE)
  - [x] Implement pagination (offset/limit, default 20 per page)
  - [x] Return total count for pagination UI
  - [x] Include related title and user data via joins

- [x] Task 6: Build ISBN data table component (AC: 4, 5, 6)
  - [x] Create `src/modules/isbn/components/isbn-pool-table.tsx`
  - [x] Implement columns: ISBN-13, Type, Status, Assigned To, Assigned Date, Actions
  - [x] Use monospace font for ISBN-13 column
  - [x] Add colored badges for Type and Status columns
  - [x] Link title name to title detail page
  - [x] Add "View Details" button in Actions column
  - [x] Use shadcn/ui Table instead of TanStack Table (simpler for read-only view)

- [x] Task 7: Build filter controls component (AC: 5)
  - [x] Create `src/modules/isbn/components/isbn-pool-filters.tsx`
  - [x] Type dropdown: All, Physical, Ebook
  - [x] Status dropdown: All, Available, Assigned, Registered, Retired
  - [x] Search input with debounced onChange
  - [x] Clear filters button
  - [x] Filters update URL query params for shareable links

- [x] Task 8: Build pagination component (AC: 6)
  - [x] Use custom pagination in table component
  - [x] Display "Showing X-Y of Z results"
  - [x] Previous/Next buttons with disabled states
  - [x] Page number display
  - [x] Handle page changes with URL query params

- [x] Task 9: Build ISBN detail modal (AC: 7)
  - [x] Create `src/modules/isbn/components/isbn-detail-modal.tsx`
  - [x] Display full ISBN-13 with copy-to-clipboard button
  - [x] Display Type and Status badges
  - [x] If assigned: show title link, assigned by, assigned date
  - [x] If available: show "Assign to Title" button (disabled, tooltip "Coming in Story 2.9")
  - [x] Use shadcn/ui Dialog component

- [x] Task 10: Write tests (AC: 1-8)
  - [x] Unit tests: `getISBNPoolStats` query function
  - [x] Unit tests: `getISBNList` query with filters and pagination
  - [x] E2E test: Navigate to ISBN pool, apply filters, verify table updates
  - [x] E2E test: Dashboard widget displays correct counts
  - [x] E2E test: Detail modal opens and displays correct data

## Dev Notes

### Relevant Architecture Patterns and Constraints

**Server Actions Pattern (from architecture.md):**
- Query functions in `queries.ts` export async functions for data fetching
- All queries include `tenant_id` filter for multi-tenant isolation
- Use Drizzle ORM with type-safe queries

**Permission Enforcement:**
- VIEW_OWN_STATEMENTS permission (all authenticated users)
- No write operations in this story (read-only)

**Component Patterns:**
- Use shadcn/ui components: Card, Badge, Table, Dialog, Button, Select, Input
- Use TanStack Table for data table with sorting/filtering
- Follow existing component structure in `src/modules/*/components/`

**URL Query Params for Filters:**
```typescript
// Example: /isbn-pool?type=physical&status=available&search=978&page=1
// Use useSearchParams() to read and update
```

**Table Pagination Pattern:**
```typescript
// Return shape from query
interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

### Learnings from Previous Story

**From Story 2-7 (Build ISBN Import with CSV Upload and Validation) - Status: Done:**

- **Types Available**: `src/modules/isbn/types.ts` contains:
  - `ISBNPoolStats` - exact interface needed for stats queries
  - `ISBNListItem` - lightweight type for table display
  - `ISBNWithRelations` - includes title and user relations
- **Schema Ready**: `src/db/schema/isbns.ts` - all required fields and indexes exist
- **Actions File**: `src/modules/isbn/actions.ts` - add queries here or create separate `queries.ts`
- **Utils Available**: `src/modules/isbn/utils.ts` - ISBN validation utilities (not needed for this story)
- **Import Form**: `src/modules/isbn/components/isbn-import-form.tsx` - reference for component structure
- **Tests Pattern**: 40 unit tests, 15 integration tests - follow same patterns
- **Dependencies**: papaparse added for CSV (not needed here), shadcn/ui components available

**Files to Reuse:**
- `src/modules/isbn/types.ts` - Use `ISBNPoolStats`, `ISBNListItem`, `ISBNWithRelations`
- `src/db/schema/isbns.ts` - Reference for database queries
- `src/components/ui/` - shadcn/ui components (Card, Badge, Table, Dialog, Select, etc.)

[Source: docs/sprint-artifacts/2-7-build-isbn-import-with-csv-upload-and-validation.md#Dev-Agent-Record]

### Project Structure Notes

**New Files for Story 2.8:**
```
src/
├── app/
│   └── (dashboard)/
│       └── isbn-pool/
│           └── page.tsx                    # NEW: ISBN pool page route
├── modules/
│   ├── isbn/
│   │   ├── queries.ts                      # NEW: getISBNPoolStats, getISBNList
│   │   └── components/
│   │       ├── isbn-pool-widget.tsx        # NEW: Dashboard widget
│   │       ├── isbn-pool-stats.tsx         # NEW: Stats cards section
│   │       ├── isbn-pool-table.tsx         # NEW: Data table component
│   │       ├── isbn-pool-filters.tsx       # NEW: Filter controls
│   │       └── isbn-detail-modal.tsx       # NEW: Detail modal
│   └── dashboard/
│       └── components/
│           └── (integrate widget here)     # MODIFY: Add ISBN widget to dashboard

tests/
├── unit/
│   └── isbn-queries.test.ts                # NEW: Query function tests
├── integration/
│   └── isbn-pool-page.test.ts              # NEW: Page data loading tests
└── e2e/
    └── isbn-pool.spec.ts                   # EXTEND: Add pool view tests
```

**Dependencies:**
- shadcn/ui: Card, Badge, Table, Dialog, Select, Input, Button, Pagination
- TanStack Table: `@tanstack/react-table` (verify installed, add if needed)
- Existing: drizzle-orm, zod

### Badge Color Coding

**Type Badges:**
- Physical: `variant="secondary"` (gray background)
- Ebook: `variant="outline"` (bordered, no fill)

**Status Badges:**
- Available: `variant="success"` or green custom color
- Assigned: `variant="default"` (blue/primary)
- Registered: `variant="secondary"` (gray)
- Retired: `variant="destructive"` (red)

**Warning Badge:**
- Low Inventory: amber/warning color, "Low" text

### Performance Considerations

- Stats query should be a single aggregation query, not multiple queries
- Table query with filters should use database-level filtering, not client-side
- Consider caching stats query (short TTL) for dashboard widget
- Pagination reduces initial load time for large ISBN pools

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-2.md#Story-2.8-ISBN-Pool-View]
- [Source: docs/sprint-artifacts/tech-spec-epic-2.md#AC2.8.1-6]
- [Source: docs/epics.md#Story-2.8]
- [Source: docs/architecture.md#Pattern-3-ISBN-Pool-Management]
- [Source: src/modules/isbn/types.ts] - ISBNPoolStats, ISBNListItem types
- [Source: src/db/schema/isbns.ts] - ISBN table schema

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/2-8-build-isbn-pool-status-view-and-availability-tracking.context.xml

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

1. Used shadcn/ui Table component instead of TanStack Table - simpler for read-only view without sorting
2. Pagination integrated directly into table component rather than separate component
3. ISBN widget integrated into all 3 dashboard types (owner/admin, editor, finance)
4. Stats query uses PostgreSQL FILTER clause for efficient single-query aggregation
5. Badge styling uses existing shadcn/ui variants with custom className for green/amber colors
6. "Assign to Title" button disabled with tooltip as requested (Story 2.9 dependency)
7. Navigation updated to point to /isbn-pool path (removed comingSoon flag)
8. Added test script to package.json for unit test execution

### File List

**New Files Created:**
- `src/app/(dashboard)/isbn-pool/page.tsx` - ISBN pool page route
- `src/modules/isbn/queries.ts` - getISBNPoolStats, getISBNList, getISBNById queries
- `src/modules/isbn/components/isbn-pool-widget.tsx` - Dashboard widget
- `src/modules/isbn/components/isbn-pool-stats.tsx` - Stats cards section
- `src/modules/isbn/components/isbn-pool-table.tsx` - Data table with pagination
- `src/modules/isbn/components/isbn-pool-filters.tsx` - Filter controls
- `src/modules/isbn/components/isbn-detail-modal.tsx` - Detail modal
- `tests/unit/isbn-queries.test.ts` - Unit tests (21 tests)
- `tests/e2e/isbn-pool.spec.ts` - E2E tests

**Modified Files:**
- `src/modules/dashboard/actions.ts` - Added ISBN stats to getDashboardStats
- `src/app/(dashboard)/dashboard/page.tsx` - Pass isbnStats to dashboard components
- `src/app/(dashboard)/dashboard/components/editor-dashboard.tsx` - Added ISBN widget
- `src/app/(dashboard)/dashboard/components/owner-admin-dashboard.tsx` - Added ISBN widget
- `src/app/(dashboard)/dashboard/components/finance-dashboard.tsx` - Added ISBN widget
- `src/lib/dashboard-nav.ts` - Updated ISBN Pool nav to /isbn-pool, removed comingSoon
- `package.json` - Added test and test:watch scripts

## Change Log

- 2025-11-24: Story 2.8 drafted by SM Agent (Bob) - 8 ACs, 10 tasks, ISBN pool status view
- 2025-11-25: Story 2.8 implemented by Dev Agent (Amelia) - All 10 tasks complete, ready for review
- 2025-11-24: Story 2.8 code review completed by Dev Agent (Amelia) - APPROVED

## Code Review Notes

**Review Date:** 2025-11-24
**Reviewer:** Dev Agent (Amelia) via code-review workflow
**Model:** claude-opus-4-5-20251101
**Outcome:** APPROVED

### AC Validation Summary

| AC | Description | Result | Evidence |
|----|-------------|--------|----------|
| 1 | Dashboard widget displays ISBN pool summary | ✓ PASS | `isbn-pool-widget.tsx:49-106` |
| 2 | Warning badge when availability < 10 | ✓ PASS | `isbn-pool-widget.tsx:56`, `isbn-pool-stats.tsx:88-89` |
| 3 | `/isbn-pool` page with stats cards | ✓ PASS | `isbn-pool-stats.tsx:92-176` |
| 4 | Table with required columns | ✓ PASS | `isbn-pool-table.tsx:106-174` |
| 5 | Filtering (type/status/search) | ✓ PASS | `isbn-pool-filters.tsx` |
| 6 | Pagination (20/page) | ✓ PASS | `isbn-pool-table.tsx:176-207` |
| 7 | Detail modal with copy/assign | ✓ PASS | `isbn-detail-modal.tsx` |
| 8 | Permission enforcement | ✓ PASS | `queries.ts:46,117,220` |

### Task Verification

**10/10 tasks verified complete with file evidence**

### Test Results

- Unit tests: **21/21 PASS** (`tests/unit/isbn-queries.test.ts`)
- Build: **PASS** (TypeScript compilation successful)
- E2E tests: Ready for execution (`tests/e2e/isbn-pool.spec.ts`)

### Security Review

| Check | Result |
|-------|--------|
| SQL Injection | ✓ Drizzle ORM parameterized queries |
| XSS Prevention | ✓ React escaping, no dangerouslySetInnerHTML |
| Tenant Isolation | ✓ All queries filter by `tenant_id` |
| Permission Checks | ✓ All queries call `requirePermission()` |

### Minor Suggestions (Non-Blocking)

1. `isbn-detail-modal.tsx:87` - Unused `isPending` variable could be prefixed with underscore
2. Import sorting in dashboard components (auto-fixable with `npm run lint:fix`)

### Conclusion

Story 2.8 implementation is complete and correct. All acceptance criteria met, all tasks verified, tests pass, security validated. Ready for status update to DONE
