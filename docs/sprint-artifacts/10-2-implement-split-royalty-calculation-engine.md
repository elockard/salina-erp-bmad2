# Story 10.2: Implement Split Royalty Calculation Engine

**Status:** in-progress

## Story

**As the** royalty calculation system,
**I want** to calculate royalties based on author ownership percentages,
**So that** co-authors receive their fair share of earnings.

## Acceptance Criteria

### AC-10.2.1: Title-Level Royalty Calculation First
- [x] System calculates total royalty for the title using existing tiered calculation engine
- [x] Title royalty includes all formats (physical, ebook, audiobook)
- [x] Net sales (sales - approved returns) calculated per format as before
- [x] Tiered rates applied per format as in Story 4.4

### AC-10.2.2: Split Royalty by Ownership Percentage
- [x] After calculating title-level royalty, system splits by each author's ownership_percentage
- [x] Split uses Decimal.js: `authorRoyalty = totalTitleRoyalty.times(ownershipPercentage / 100)`
- [x] Each author receives exactly their percentage of the title royalty
- [x] Splits must sum exactly to total title royalty (verify with Decimal.js)

### AC-10.2.3: Per-Author Advance Recoupment
- [x] Each author has their own advance amount via their contract for THIS TITLE
- [x] Advance recoupment is tracked separately per author-contract
- [x] Author's split royalty is applied against their advance first
- [x] `authorNetPayable = authorSplitRoyalty - authorRecoupment`

### AC-10.2.4: Edge Case - One Author Fully Recouped
- [x] When one co-author has fully recouped their advance, their net payable flows through
- [x] Other co-authors continue recouping independently
- [x] System handles mixed recoupment states correctly
- [x] Example: Author A (60%, advance $0 remaining) gets full 60%, Author B (40%, advance $1000 remaining) gets split minus recoupment

### AC-10.2.5: Edge Case - Negative Periods
- [x] Negative periods (more returns than sales) don't reverse recoupment for any author
- [x] Net payable minimum is zero per author
- [x] Negative title royalty results in zero split to all authors
- [x] Advances already recouped are never "un-recouped"

### AC-10.2.6: Different Advance Amounts Per Author
- [x] Each co-author can have different advance amounts in their contracts
- [x] Recoupment logic handles different starting points per author
- [x] Progress tracked independently in each contract's advance_recouped field

### AC-10.2.7: Calculation Detail Per-Author Breakdown
- [x] RoyaltyCalculation type extended to include per-author breakdown
- [x] Each author's split shows: ownershipPercentage, splitAmount, recoupment, netPayable
- [x] Breakdown stored for statement generation (Story 10.3)

### AC-10.2.8: Single-Author Backward Compatibility
- [x] Single-author titles continue to work unchanged
- [x] 100% ownership = current behavior (no split calculation overhead)
- [x] All existing tests pass without modification

### AC-10.2.9: Author Without Contract Handling
- [x] If a title_author has no contract for this specific title, ERROR the calculation
- [x] Error message: "Author {contactId} has no active contract for title {titleId}"
- [x] Do NOT silently skip authors - this is a data integrity issue that must be fixed

### AC-10.2.10: Calculation Failure Handling
- [x] If calculation fails for any author, entire calculation fails (atomic)
- [x] Return clear error indicating which author failed and why
- [x] Do NOT create partial results for some authors

## Tasks / Subtasks

- [x] **Task 1: Extend RoyaltyCalculation Types** (AC: 10.2.7)
  - [x] Add `AuthorSplitBreakdown` interface to `src/modules/royalties/types.ts`
  - [x] Add `authorSplits: AuthorSplitBreakdown[]` to `RoyaltyCalculation`
  - [x] Add `titleTotalRoyalty: number` to track pre-split total
  - [x] Add `isSplitCalculation: boolean` flag
  - [x] Write unit tests for new type structures

- [x] **Task 2: Create Split Calculation Helper Functions** (AC: 10.2.2, 10.2.5)
  - [x] Create `splitRoyaltyByOwnership(totalRoyalty, titleAuthors[])` in calculator.ts
  - [x] Use Decimal.js for all split calculations
  - [x] Verify splits sum to total (within Decimal precision)
  - [x] Handle edge case: zero or negative totalRoyalty
  - [x] Write unit tests with various split scenarios (50/50, 60/40, 33/33/34)

- [x] **Task 3: Create Per-Author Recoupment Function** (AC: 10.2.3, 10.2.4, 10.2.6)
  - [x] Create `calculateAuthorRecoupment(authorSplit, contract)` helper
  - [x] Apply same recoupment logic as existing but per-author
  - [x] Return `{ recoupment, netPayable }` for the author
  - [x] Handle fully recouped advance (recoupment = 0)
  - [x] Handle partial recoupment cases
  - [x] Write unit tests for recoupment scenarios

- [x] **Task 4: Extend Main Calculator for Multi-Author** (AC: 10.2.1, 10.2.2, 10.2.8, 10.2.9, 10.2.10)
  - [x] Modify `calculateRoyaltyForPeriod` signature to accept optional titleAuthors[]
  - [x] Query title_authors if not provided
  - [x] If single author (100%), use existing code path (backward compatible)
  - [x] If multiple authors, calculate title-level royalty first
  - [x] Then split and apply per-author recoupment
  - [x] Return enriched RoyaltyCalculation with authorSplits
  - [x] ERROR if any author lacks contract (AC-10.2.9)
  - [x] Atomic failure - all or nothing (AC-10.2.10)

- [x] **Task 5: Create Query for Title Authors with Contracts** (AC: 10.2.3, 10.2.6, 10.2.9)
  - [x] Add `getContractByContactAndTitle(contactId, titleId, tenantId)` to royalties/queries.ts
  - [x] Add `getTitleAuthorsWithContracts(titleId, tenantId)` to royalties/queries.ts
  - [x] Returns authors with their ownership percentages AND contract info
  - [x] Includes advance_amount, advance_paid, advance_recouped per author
  - [x] Returns null/undefined for author if no contract exists (caller handles error)
  - [x] **CODE REVIEW FIX:** Batch query optimization to avoid N+1 pattern (uses IN clause)
  - [ ] Write unit tests (PENDING: query tests need integration setup)

- [x] **Task 6: Update Admin Calculator and Inngest Integration** (AC: 10.2.1)
  - [x] Apply same changes to `calculateRoyaltyForPeriodAdmin`
  - [x] Use admin queries for background job context
  - [x] Update `generate-statements-batch.ts` to handle authorSplits:
    - [x] Checks if title has multiple authors via title_authors table
    - [x] Uses `calculateSplitRoyaltyForTitleAdmin` for multi-author titles
    - [x] Falls back to standard calculation for single-author titles
    - [x] Each statement uses that author's split data from calculation
  - [x] Ensure Inngest jobs work with split calculations
  - **NOTE:** Current implementation is author-centric (processes each author separately).
    For titles with multiple co-authors in same batch, split calc may run redundantly.
    Future optimization: title-centric approach as described in Dev Notes.

- [ ] **Task 7: Comprehensive Integration Testing** (AC: all)
  - [ ] Test 50/50 split with equal advances
  - [ ] Test 60/40 split with different advances
  - [ ] Test 33/33/34 split with three authors
  - [ ] Test one author fully recouped, one partially
  - [ ] Test negative period (returns > sales)
  - [ ] Test single author (backward compatibility)
  - [ ] Test title with no title_authors entries (edge case)
  - [ ] Test author without contract (should error)
  - [ ] Test partial calculation failure (should error atomically)

- [x] **Task 8: Update Statement Generation Integration** (AC: 10.2.7)
  - [x] Verify statement wizard can use new authorSplits data
  - [x] Calculation detail includes per-author breakdown
  - [x] Prepare data structure for Story 10.3 statement generation

## Code Review Fixes (2025-12-09)

Applied fixes from adversarial code review:

### Fixed Issues

1. **MEDIUM-1: N+1 Query Pattern** - `getTitleAuthorsWithContracts` and `getTitleAuthorsWithContractsAdmin`
   - **Before:** N+1 queries (1 for authors + N for contracts)
   - **After:** 2 queries total using `IN` clause for batch contract fetch
   - **Files:** `src/modules/royalties/queries.ts:680-817`

2. **MEDIUM-2: Console.warn in Production** - `splitRoyaltyByOwnership`
   - **Before:** `console.warn()` for precision mismatch
   - **After:** `throw new Error()` - financial precision is critical
   - **File:** `src/modules/royalties/calculator.ts:421-426`

3. **MEDIUM-3: Dynamic Imports** - Split calculation functions
   - **Before:** `await import("./queries")` inside functions
   - **After:** Static imports at module top
   - **File:** `src/modules/royalties/calculator.ts:20-41`

4. **LOW-2: advancePaid Assumption** - `buildMultiAuthorSplits`
   - **Before:** Assumed `advance_paid = advance_amount`
   - **After:** Uses actual `advance_paid` from contract
   - **Files:** `src/modules/royalties/calculator.ts:519-523, 686-695, 816-825`

### Remaining Items (Not Fixed - Deferred)

- **CRITICAL-1:** Inngest author-centric approach causes redundant calculations for co-authored titles in same batch
  - Documented in Task 6 NOTE
  - Future optimization: title-centric approach

- **LOW-1:** Query unit tests need integration setup (documented in Task 5)

- **LOW-3:** Story status shows `in-progress` with incomplete Task 7 (integration tests)

## Dev Notes

### Critical Implementation Notes

1. **DO NOT modify the core tiered calculation logic** - That engine is battle-tested. Add split logic AFTER title-level calculation completes.

2. **Decimal.js is MANDATORY for all financial math**:
   ```typescript
   import Decimal from 'decimal.js';

   // Split calculation
   const authorSplit = totalRoyalty.times(new Decimal(ownershipPercentage).dividedBy(100));

   // Verify splits sum correctly
   const splitSum = authorSplits.reduce(
     (sum, s) => sum.plus(new Decimal(s.splitAmount)),
     new Decimal(0)
   );
   if (!splitSum.equals(totalRoyalty)) {
     throw new Error(`Split sum ${splitSum} != total ${totalRoyalty}`);
   }
   ```

3. **Query Pattern for Title Authors with Contracts**:
   ```typescript
   // Each title author needs their contract for recoupment
   // Contract is linked via: contracts.contact_id = title_authors.contact_id
   // AND contracts.title_id = title_authors.title_id (CRITICAL: must match BOTH)

   // WRONG - getContractByAuthorAndTenant doesn't filter by title_id
   // An author may have contracts for multiple titles!

   // RIGHT - new function needed:
   async function getContractByContactAndTitle(
     contactId: string,
     titleId: string,
     tenantId: string
   ): Promise<ContractWithRelations | null>
   ```

4. **Recoupment is PER-CONTRACT, not per-author-globally**:
   - Author A on Title X has contract with $5000 advance
   - Author A on Title Y has different contract with $2000 advance
   - Each contract tracks its own advance_recouped

5. **The existing calculator already calculates for a single contract/author**. Your job is to:
   - Get all title_authors for the title
   - For each author, find their contract FOR THIS SPECIFIC TITLE
   - Calculate title-level royalty once
   - Split the royalty by ownership percentages
   - Apply recoupment per author using their contract's advance data

6. **Author Without Contract = ERROR (Business Rule)**:
   - If a title_author exists but has no contract for that title, this is a data integrity issue
   - Do NOT silently skip - ERROR with clear message
   - Finance team must create contract before calculation can proceed

7. **Calculation Failures are Atomic**:
   - If any author's calculation fails, the entire calculation fails
   - No partial results - either all authors succeed or none do
   - This prevents inconsistent statement generation

### Advance Recoupment Persistence

The calculator is a PURE function that does NOT persist changes. Advance recoupment updates happen in the Inngest job AFTER statement creation:

```typescript
// In generate-statements-batch.ts, AFTER creating statement:
// For each authorSplit with recoupment > 0:
await adminDb
  .update(contracts)
  .set({
    advance_recouped: sql`advance_recouped + ${authorSplit.recoupment}`,
    updated_at: new Date(),
  })
  .where(eq(contracts.id, authorSplit.contractId));
```

**Transaction Handling:**
- All advance_recouped updates for a single title's authors should be in ONE transaction
- If any update fails, rollback all updates for that title
- Statement creation and advance updates are separate (statement first, then advances)

### Inngest Integration Pattern

The current `generate-statements-batch.ts` loops over `authorIds`. For co-authored titles, this changes:

**Current Flow (single author per title):**
```
for each authorId:
  → get contract
  → calculateRoyaltyForPeriodAdmin(authorId, tenantId, ...)
  → create 1 statement
```

**New Flow (supports co-authors):**
```
for each authorId:
  → get all titles where this author has ownership (via title_authors)
  → for each title:
    → calculateRoyaltyForPeriodAdmin now returns authorSplits[]
    → if isSplitCalculation:
      → create 1 statement for THIS author using their split data
    → else:
      → create 1 statement (backward compatible)
```

**Alternative (Recommended) - Title-Centric Approach:**
```
// Change Inngest to iterate by TITLE, not by author
for each title with sales in period:
  → calculateRoyaltyForTitle(titleId, tenantId, period)
  → returns { authorSplits: [...] }
  → for each authorSplit:
    → create statement for that author
    → update that author's contract.advance_recouped
```

This prevents duplicate calculations when the same title has multiple authors.

### File Locations (FOLLOW EXACTLY)

- Types: `src/modules/royalties/types.ts`
- Calculator: `src/modules/royalties/calculator.ts`
- Queries: `src/modules/royalties/queries.ts`
- Title Authors Queries: `src/modules/title-authors/queries.ts`
- Inngest Job: `src/inngest/generate-statements-batch.ts`
- Unit Tests: `tests/unit/split-royalty-calculator.test.ts`
- Integration Tests: `tests/integration/split-royalty-calculation.test.ts`

### Type Extensions Required

```typescript
// Add to src/modules/royalties/types.ts

/**
 * Per-author split breakdown for co-authored titles
 * Story 10.2: Split Royalty Calculation Engine
 */
export interface AuthorSplitBreakdown {
  /** Author's contact ID */
  contactId: string;
  /** Author's contract ID for this title */
  contractId: string;
  /** Ownership percentage (e.g., 60 for 60%) */
  ownershipPercentage: number;
  /** Author's share of title royalty before recoupment */
  splitAmount: number;
  /** Amount recouped from this author's advance */
  recoupment: number;
  /** Net payable to this author */
  netPayable: number;
  /** Author's advance status for context */
  advanceStatus: {
    totalAdvance: number;
    previouslyRecouped: number;
    remainingAfterThisPeriod: number;
  };
}

/**
 * Extended RoyaltyCalculation with split support
 */
export interface RoyaltyCalculation {
  // ... existing fields ...

  /** Title-level total royalty before split (equals totalRoyaltyEarned for single author) */
  titleTotalRoyalty: number;

  /** Whether this is a split calculation (multiple authors) */
  isSplitCalculation: boolean;

  /** Per-author breakdown (empty array for single author) */
  authorSplits: AuthorSplitBreakdown[];
}
```

### New Query Function Required

```typescript
// Add to src/modules/royalties/queries.ts

/**
 * Get contract for a specific contact and title combination
 *
 * CRITICAL: An author (contact) may have contracts for MULTIPLE titles.
 * This function gets the contract for ONE specific title.
 *
 * @param contactId - Contact UUID (author)
 * @param titleId - Title UUID
 * @param tenantId - Tenant UUID
 * @returns Contract with tiers or null if no contract exists
 */
export async function getContractByContactAndTitle(
  contactId: string,
  titleId: string,
  tenantId: string,
): Promise<ContractWithRelations | null> {
  const db = await getDb();

  const contract = await db.query.contracts.findFirst({
    where: and(
      eq(contracts.contact_id, contactId),
      eq(contracts.title_id, titleId),
      eq(contracts.tenant_id, tenantId),
      eq(contracts.status, "active"),
    ),
    with: {
      author: true,
      title: true,
      tiers: {
        orderBy: [asc(contractTiers.format), asc(contractTiers.min_quantity)],
      },
    },
  });

  return contract || null;
}

// Admin version for Inngest
export async function getContractByContactAndTitleAdmin(
  contactId: string,
  titleId: string,
  tenantId: string,
): Promise<ContractWithRelations | null> {
  // Same as above but uses adminDb
}
```

### Algorithm Overview

```
1. Input: titleId, tenantId, periodStart, periodEnd

2. Get title_authors for titleId
   2a. If empty: ERROR - title has no authors
   2b. If single author with 100%: use existing code path (backward compatible)
   2c. If multiple authors: proceed with split calculation

3. For each title_author, get their contract FOR THIS TITLE:
   3a. Call getContractByContactAndTitle(contactId, titleId, tenantId)
   3b. If no contract found: ERROR with clear message
   3c. Store contract with author info for later

4. Calculate title-level royalty (REUSE EXISTING LOGIC):
   4a. Get sales by format for period
   4b. Get approved returns by format for period
   4c. Calculate net sales per format
   4d. Apply tiered rates per format (use ANY author's contract tiers - they should be same)
   4e. Sum to get totalTitleRoyalty

5. For each title_author with their contract:
   5a. Calculate split: authorSplit = totalTitleRoyalty * (ownership_percentage / 100)
   5b. Calculate recoupment from their contract's advance
   5c. Calculate netPayable = authorSplit - recoupment
   5d. Build AuthorSplitBreakdown

6. Return RoyaltyCalculation with:
   - titleTotalRoyalty
   - isSplitCalculation: true
   - authorSplits array
   - totalRoyaltyEarned: totalTitleRoyalty (for backward compat)
   - advanceRecoupment: sum of all author recoupments
   - netPayable: sum of all author netPayables
```

### Existing Code References

**Current calculator.ts structure** (DO NOT BREAK):
- `calculateRoyaltyForPeriod()` - main entry point (lines 51-141)
- `groupTiersByFormat()` - tier lookup helper (lines 149-168)
- `calculateNetSales()` - sales - returns (lines 180-201)
- `applyTieredRates()` - tiered rate application (lines 220-304)
- `calculateAdvanceRecoupment()` - recoupment logic (lines 322-343)
- `calculateRoyaltyForPeriodAdmin()` - admin version for Inngest (lines 361-456)

**Title Authors queries** (from Story 10.1):
- `getTitleAuthors(titleId)` - returns authors with percentages
- `getTitleWithAuthors(titleId)` - title + all authors
- `isAuthorOnTitle(titleId, contactId)` - check membership

**Inngest batch job** (needs modification):
- `src/inngest/generate-statements-batch.ts` - currently loops by authorId
- Line 175: calls `calculateRoyaltyForPeriodAdmin(authorId, tenantId, ...)`
- Lines 217-228: builds advanceRecoupment from single contract

### Testing Strategy

**Unit Tests** (tests/unit/split-royalty-calculator.test.ts):
- `splitRoyaltyByOwnership()` with 50/50, 60/40, 33/33/34
- `calculateAuthorRecoupment()` with various advance states
- Edge cases: zero royalty, negative royalty, single author
- Error case: author without contract

**Integration Tests** (tests/integration/split-royalty-calculation.test.ts):
- Create title with two authors (60/40)
- Create contracts with different advances ($5000, $2000)
- Create sales data
- Run calculation
- Verify splits are correct
- Verify recoupments are applied correctly per author
- Test atomic failure when one author has no contract

### Performance Considerations

For titles with many co-authors (3+):
- Batch the contract queries: `getContractsForTitleAuthors(titleId, contactIds[])`
- Use single query with `IN` clause rather than N separate queries
- Consider caching title_authors during statement generation batch

### Known Environment Issues

From Story 10.1 completion notes: Pre-existing TypeScript errors exist in:
- `tests/integration/invoice-actions.test.ts`
- `tests/integration/isbn-import.test.ts`

These are unrelated to this story and should be ignored during development.

### Dependencies

**Prerequisites:**
- Story 10.1 complete (title_authors table and queries exist)
- Epic 4 complete (royalty calculation engine exists)
- Epic 5 complete (statements infrastructure exists)

**Blocking:**
- Story 10.3 (Split Royalty Statements for Co-Authors)

### References

- [Epics: Story 10.2](docs/epics.md#story-102-implement-split-royalty-calculation-engine)
- [PRD FR112](docs/prd.md): Split royalty calculation requirement
- [Architecture: Pattern 1](docs/architecture.md): Tiered Royalty Calculation Engine
- [Story 10.1](docs/sprint-artifacts/10-1-add-multiple-authors-per-title-with-ownership-percentages.md): Title authors schema and queries
- [Calculator](src/modules/royalties/calculator.ts): Existing calculation engine
- [Title Authors Queries](src/modules/title-authors/queries.ts): Author retrieval functions
- [Inngest Batch Job](src/inngest/generate-statements-batch.ts): Statement generation background job

## Dev Agent Record

### Context Reference

This story extends the royalty calculation engine (Epic 4) to support co-authored books from Story 10.1. The key insight is: calculate title-level royalty first using the existing battle-tested engine, THEN split by ownership percentages, THEN apply per-author recoupment from their individual contracts.

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Code review session 2024-12-09: Found story status never updated, Inngest not integrated

### Completion Notes List

1. **2024-12-09 Code Review Findings:**
   - Story status was `ready-for-dev` but implementation existed
   - All AC criteria implemented in calculator.ts
   - 28 unit tests passing
   - Inngest job NOT updated to use split calculation (FIXED)
   - Added split sum verification with console.warn
   - Deferred: Integration tests, N+1 query optimization

2. **Implementation Notes:**
   - `splitRoyaltyByOwnership()` uses Decimal.js for precision
   - `calculateAuthorRecoupment()` handles per-author advance states
   - `buildMultiAuthorSplits()` combines splitting and recoupment
   - `calculateSplitRoyaltyForTitleAdmin()` is the main entry point for multi-author
   - Inngest now detects co-authored titles and uses split calculation

3. **Remaining Work (Task 6 & 7):**
   - [ ] Integration tests for split calculation with DB
   - [ ] Batch contract queries optimization (N+1 pattern exists)

### File List

**New Files (Actual):**
- `tests/unit/split-royalty-calculator.test.ts` - 28 unit tests for split calculation

**Modified Files (Actual):**
- `src/modules/royalties/types.ts` - Added AuthorSplitBreakdown interface, extended RoyaltyCalculation
- `src/modules/royalties/calculator.ts` - Added split functions: splitRoyaltyByOwnership, calculateAuthorRecoupment, buildMultiAuthorSplits, calculateSplitRoyaltyForTitleAdmin, calculateSplitRoyaltyForTitle
- `src/modules/royalties/queries.ts` - Added getContractByContactAndTitle, getContractByContactAndTitleAdmin, getTitleAuthorsWithContracts, getTitleAuthorsWithContractsAdmin
- `src/inngest/generate-statements-batch.ts` - Added multi-author detection and split calculation support
- `docs/sprint-artifacts/10-2-implement-split-royalty-calculation-engine.md` - Status and task updates

**Deferred Files:**
- `tests/integration/split-royalty-calculation.test.ts` - Not created (requires complex DB mocking)
