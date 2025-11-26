# Story 2.9: Implement Smart ISBN Assignment with Row Locking

Status: done

## Story

As an editor,
I want to assign ISBNs to titles from the available pool,
so that each title has proper identification for sales tracking.

## Acceptance Criteria

1. Assignment modal shows next available ISBN preview
   - Modal displays the specific ISBN-13 that will be assigned
   - Shows available count for the selected format (Physical or Ebook)
   - Displays title name for confirmation
   - "Assign This ISBN" primary action button

2. "Assign This ISBN" uses PostgreSQL row-level locking
   - Server Action acquires row lock via `FOR UPDATE` on selected ISBN
   - Lock prevents concurrent assignment of the same ISBN
   - If ISBN was taken by another user, action fails gracefully and retries with next available

3. Transaction updates `isbns` and `titles` tables atomically
   - Single database transaction wraps both updates
   - Updates `isbns`: status → 'assigned', assigned_to_title_id, assigned_at, assigned_by_user_id
   - Updates `titles`: isbn (Physical) or eisbn (Ebook) field with assigned ISBN-13
   - Both updates succeed or both rollback

4. Race condition handled gracefully
   - If selected ISBN was assigned by concurrent request, auto-retry with next available
   - User sees success with whichever ISBN was ultimately assigned
   - No duplicate ISBNs ever assigned (enforced by unique constraint + row locking)

5. Clear error messages when no ISBNs available
   - "No Physical ISBNs available. Import an ISBN block first."
   - "No Ebook ISBNs available. Import an ISBN block first."
   - Error toast with actionable message displayed

6. Audit trail captures all assignment events
   - Log: userId, titleId, isbnId, isbn_13, format, timestamp
   - `assigned_by_user_id` and `assigned_at` stored in isbns table
   - Console/structured logging for debugging

7. Permission check enforces CREATE_AUTHORS_TITLES
   - Only Editor, Admin, Owner roles can assign ISBNs
   - Unauthorized users see disabled button with tooltip
   - Server Action validates permission before database access

8. Already-assigned ISBN handling
   - If title already has Physical ISBN assigned, show info message
   - If title already has Ebook ISBN assigned, show info message
   - "This title already has a Physical/Ebook ISBN assigned."
   - Option to view currently assigned ISBN

## Tasks / Subtasks

- [x] Task 1: Create ISBN assignment Server Action (AC: 2, 3, 4, 5, 6, 7)
  - [x] Create `assignISBNToTitle` action in `src/modules/isbn/actions.ts`
  - [x] Implement permission check using `requirePermission(CREATE_AUTHORS_TITLES)`
  - [x] Use Drizzle transaction with `.forUpdate()` for row locking
  - [x] Update isbns table: status, assigned_to_title_id, assigned_at, assigned_by_user_id
  - [x] Update titles table: isbn or eisbn field based on format
  - [x] Handle "no available ISBNs" error with user-friendly message
  - [x] Add structured logging for audit trail
  - [x] Return ActionResult<AssignedISBN> with success/error

- [x] Task 2: Create ISBN preview query (AC: 1)
  - [x] Create `getNextAvailableISBN` query in `src/modules/isbn/queries.ts`
  - [x] Accept format parameter ('physical' | 'ebook')
  - [x] Return next available ISBN preview without locking
  - [x] Return available count for the format
  - [x] Include tenant_id filtering

- [x] Task 3: Update ISBN detail modal with assignment UI (AC: 1, 8)
  - [x] Enable "Assign to Title" button in `src/modules/isbn/components/isbn-detail-modal.tsx`
  - [x] Add title selector dropdown (search by title name)
  - [x] Show format selection (Physical / Ebook)
  - [x] Display next available ISBN preview
  - [x] Show available count badge
  - [x] Handle loading/pending states during assignment

- [x] Task 4: Create title-side ISBN assignment modal (AC: 1, 8)
  - [x] Create `src/modules/titles/components/isbn-assignment-modal.tsx`
  - [x] Triggered from title detail page "Assign ISBN" button
  - [x] Format tabs: Physical | Ebook
  - [x] Show current assigned ISBN (if any) with "Already assigned" message
  - [x] Show next available ISBN preview for unassigned formats
  - [x] "Assign This ISBN" button calls `assignISBNToTitle` action

- [x] Task 5: Integrate assignment flow in title detail page (AC: 1, 7, 8)
  - [x] Add "Assign ISBN" button to title detail view
  - [x] Button disabled if user lacks CREATE_AUTHORS_TITLES permission
  - [x] Tooltip on disabled button: "You don't have permission to assign ISBNs"
  - [x] Refresh title data after successful assignment
  - [x] Show toast notification on success/error

- [x] Task 6: Add assignment types and schema (AC: 1-7)
  - [x] Add `AssignISBNInput` Zod schema in `src/modules/isbn/schema.ts`
  - [x] Add `AssignedISBN` type in `src/modules/isbn/types.ts`
  - [x] Add `ISBNAssignmentResult` type for action response

- [x] Task 7: Write unit tests for assignment action (AC: 2, 3, 4, 5, 6, 7)
  - [x] Test successful assignment updates both tables
  - [x] Test row locking prevents duplicate assignment
  - [x] Test "no available ISBNs" returns proper error
  - [x] Test permission check denies unauthorized users
  - [x] Test concurrent assignment simulation (mock row lock)
  - [x] Add tests to `tests/unit/isbn-assignment.test.ts`

- [x] Task 8: Write E2E tests for assignment flow (AC: 1-8)
  - [x] Test: Navigate to title, click "Assign ISBN", verify modal
  - [x] Test: Assign Physical ISBN, verify title updated
  - [x] Test: Assign Ebook ISBN, verify title updated
  - [x] Test: Attempt assign when none available, verify error message
  - [x] Test: Verify "already assigned" message shows correctly
  - [x] Add tests to `tests/e2e/isbn-assignment.spec.ts`

## Dev Notes

### Relevant Architecture Patterns and Constraints

**Pattern 3: ISBN Pool Management with Row Locking (from architecture.md):**
```typescript
// Transaction with row locking pattern
const result = await db.transaction(async (tx) => {
  // Step 1: Find and lock available ISBN
  const availableISBN = await tx
    .select()
    .from(isbns)
    .where(
      and(
        eq(isbns.tenant_id, tenantId),
        eq(isbns.status, "available"),
        eq(isbns.type, format)
      )
    )
    .limit(1)
    .forUpdate() // ← ROW LOCK
    .execute();

  if (!availableISBN.length) throw new Error("No available ISBNs");

  // Step 2: Update ISBN status
  await tx
    .update(isbns)
    .set({
      status: "assigned",
      assigned_to_title_id: titleId,
      assigned_at: new Date(),
      assigned_by_user_id: user.id,
    })
    .where(eq(isbns.id, availableISBN[0].id));

  // Step 3: Update title with ISBN
  await tx
    .update(titles)
    .set({ [format === "physical" ? "isbn" : "eisbn"]: availableISBN[0].isbn_13 })
    .where(and(eq(titles.id, titleId), eq(titles.tenant_id, tenantId)));

  return availableISBN[0];
});
```

**Permission Enforcement:**
- Use `requirePermission(CREATE_AUTHORS_TITLES)` from `src/lib/permissions.ts`
- Editor, Admin, Owner roles have CREATE_AUTHORS_TITLES permission

**Server Actions Pattern (from architecture.md):**
- All mutations use `"use server"` directive with ActionResult<T> responses
- Validate with Zod schema before database operations
- Include tenant_id filtering for multi-tenant isolation

**ActionResult Pattern:**
```typescript
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fields?: Record<string, string> };
```

### Learnings from Previous Story

**From Story 2-8 (Build ISBN Pool Status View) - Status: Review:**

- **Components Available**:
  - `src/modules/isbn/components/isbn-detail-modal.tsx` - Has disabled "Assign to Title" button, needs enabling
  - `src/modules/isbn/components/isbn-pool-table.tsx` - Table with ISBN list, View Details action
  - `src/modules/isbn/queries.ts` - Has getISBNPoolStats, getISBNList, getISBNById
- **Types Available**: `src/modules/isbn/types.ts` - ISBNPoolStats, ISBNListItem, ISBNWithRelations
- **Schema Ready**: `src/db/schema/isbns.ts` - Has assigned_to_title_id, assigned_at, assigned_by_user_id fields
- **Drizzle Relations**: `src/db/schema/relations.ts` - isbnsRelations includes assignedTitle, assignedByUser
- **Test Patterns**: Unit tests in `tests/unit/isbn-queries.test.ts` (21 tests), E2E in `tests/e2e/isbn-pool.spec.ts`
- **Badge Styling**: Status badges use existing patterns (Available=green, Assigned=blue)

**Files to Reuse:**
- `src/modules/isbn/queries.ts` - Add getNextAvailableISBN query
- `src/modules/isbn/actions.ts` - Add assignISBNToTitle action
- `src/modules/isbn/components/isbn-detail-modal.tsx` - Enable and enhance assignment UI
- `src/modules/isbn/types.ts` - Add AssignedISBN type

[Source: docs/sprint-artifacts/2-8-build-isbn-pool-status-view-and-availability-tracking.md#Dev-Agent-Record]

### Project Structure Notes

**New Files for Story 2.9:**
```
src/
├── modules/
│   ├── isbn/
│   │   ├── actions.ts                      # MODIFY: Add assignISBNToTitle action
│   │   ├── queries.ts                      # MODIFY: Add getNextAvailableISBN query
│   │   ├── schema.ts                       # MODIFY: Add AssignISBNInput schema
│   │   ├── types.ts                        # MODIFY: Add AssignedISBN, ISBNAssignmentResult types
│   │   └── components/
│   │       └── isbn-detail-modal.tsx       # MODIFY: Enable assignment UI
│   └── titles/
│       └── components/
│           └── isbn-assignment-modal.tsx   # NEW: Title-side assignment modal

tests/
├── unit/
│   └── isbn-assignment.test.ts             # NEW: Unit tests for assignment
└── e2e/
    └── isbn-assignment.spec.ts             # NEW: E2E tests for assignment flow
```

### Technical Implementation Notes

**Row Locking Behavior:**
- `FOR UPDATE` blocks other transactions from selecting the same row
- If two users try to assign simultaneously, one waits until the other commits/rollbacks
- After commit, the waiting transaction sees updated status and finds next available

**Concurrent Assignment Handling:**
```typescript
// Retry logic pseudocode
let attempts = 0;
while (attempts < 3) {
  try {
    return await assignWithLock(titleId, format);
  } catch (error) {
    if (error.message === "ISBN was assigned by another user") {
      attempts++;
      continue; // Try next available
    }
    throw error;
  }
}
throw new Error("Failed to assign ISBN after multiple attempts");
```

**Logging for Audit Trail:**
```typescript
logger.info("ISBN assigned to title", {
  isbn_id: result.id,
  isbn_13: result.isbn_13,
  title_id: titleId,
  format,
  assigned_by: user.id,
  tenant_id: tenantId,
});
```

### FRs Implemented

- FR18: Assign ISBNs to titles
- FR19: Prevent duplicate ISBN assignment
- FR20: Separate ISBNs for physical/ebook

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-2.md#Story-2.9-ISBN-Assignment]
- [Source: docs/sprint-artifacts/tech-spec-epic-2.md#AC2.9.1-7]
- [Source: docs/epics.md#Story-2.9]
- [Source: docs/architecture.md#Pattern-3-ISBN-Pool-Management-with-Row-Locking]
- [Source: docs/sprint-artifacts/2-8-build-isbn-pool-status-view-and-availability-tracking.md#Dev-Agent-Record]
- [Source: src/modules/isbn/queries.ts]
- [Source: src/modules/isbn/components/isbn-detail-modal.tsx]
- [Source: src/db/schema/isbns.ts]

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/2-9-implement-smart-isbn-assignment-with-row-locking.context.xml

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Code Review

### Review Date: 2025-11-24
### Reviewer: Amelia (Dev Agent)
### Outcome: ✅ PASS

#### AC Validation Summary

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | Modal shows ISBN preview | ✅ | `isbn-assignment-modal.tsx:163-186` |
| AC-2 | Row-level locking (FOR UPDATE) | ✅ | `actions.ts:277` `.for("update", { skipLocked: true })` |
| AC-3 | Transaction (isbns + titles) | ✅ | `actions.ts:264-315` `db.transaction()` |
| AC-4 | Auto-retry on race condition | ✅ | `actions.ts:217,256-380` MAX_RETRY=3 |
| AC-5 | Clear "no ISBNs" error | ✅ | `actions.ts:281-283`, `isbn-assignment-modal.tsx:143-159` |
| AC-6 | Audit trail logging | ✅ | `actions.ts:317-329` console.info() |
| AC-7 | Permission check | ✅ | `actions.ts:221`, `title-detail.tsx:371-396` |
| AC-8 | Already-assigned handling | ✅ | `actions.ts:247-253`, `isbn-assignment-modal.tsx:115-131` |

#### Task Validation Summary

| Task | Status | Evidence |
|------|--------|----------|
| Task 1: Server Action | ✅ | `src/modules/isbn/actions.ts:214-404` |
| Task 2: ISBN preview query | ✅ | `src/modules/isbn/queries.ts:285-352` |
| Task 3: ISBN detail modal UI | ✅ | `isbn-detail-modal.tsx:324-445` |
| Task 4: Title-side modal | ✅ | NEW: `isbn-assignment-modal.tsx` |
| Task 5: Title detail integration | ✅ | `title-detail.tsx:371-438,452-464` |
| Task 6: Types and schema | ✅ | `schema.ts:75-81`, `types.ts:89-117` |
| Task 7: Unit tests | ✅ | `tests/unit/isbn-assignment.test.ts` |
| Task 8: E2E tests | ✅ | `tests/e2e/isbn-assignment.spec.ts` |

#### Test Results

- Unit Tests: 26/26 PASS (`npm run test -- --run tests/unit/isbn-assignment.test.ts`)
- Build: PASS (`npm run build`)
- E2E Tests: Ready for execution in CI/CD

#### Security Review

- ✅ Permission checks with `requirePermission(CREATE_AUTHORS_TITLES)`
- ✅ Tenant isolation via `getCurrentTenantId()`
- ✅ Zod input validation on all inputs
- ✅ Parameterized queries (no SQL injection risk)
- ✅ Row-level locking prevents race conditions

#### Minor Issues (Non-Blocking)

1. `title-detail.tsx:459-463`: Uses `window.location.reload()` instead of `router.refresh()` - functional but less optimal UX
2. `isbn-detail-modal.tsx:165`: `getTitles()` fetches all titles without pagination - potential performance issue for large datasets (future optimization)
3. Pre-existing unused imports in `isbn-detail-modal.tsx` (not introduced by this story)

#### Implementation Files

- `src/modules/isbn/actions.ts` - assignISBNToTitle Server Action
- `src/modules/isbn/queries.ts` - getNextAvailableISBN query
- `src/modules/isbn/schema.ts` - AssignISBNInput schema
- `src/modules/isbn/types.ts` - AssignedISBN, NextAvailableISBNPreview types
- `src/modules/isbn/components/isbn-detail-modal.tsx` - Assignment UI in ISBN detail
- `src/modules/titles/components/isbn-assignment-modal.tsx` - NEW: Title-side modal
- `src/modules/titles/components/title-detail.tsx` - Assign ISBN button integration
- `tests/unit/isbn-assignment.test.ts` - NEW: 26 unit tests
- `tests/e2e/isbn-assignment.spec.ts` - NEW: E2E test suite

## Change Log

- 2025-11-24: Story 2.9 drafted by SM Agent (Bob) - 8 ACs, 8 tasks, smart ISBN assignment with row locking
- 2025-11-24: Code review PASS by Dev Agent (Amelia) - all ACs verified, all tasks complete, 26/26 unit tests pass
