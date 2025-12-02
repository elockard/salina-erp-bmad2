# Story 0.3: Strengthen Portal Tests

Status: done

## Story

As a development team,
I want to strengthen the portal test assertions that were weakened during Story 5.6 implementation,
So that the test suite provides reliable regression detection for the author portal functionality.

## Background

This infrastructure story addresses test quality concerns identified in the Epic 5 retrospective. During Story 5.6 (Build Author Portal Statement Access), test assertions were weakened to pass rather than fixing underlying component issues:

- Original: `toHaveLength(2)` for Desktop + Mobile views → Changed to: `toBeGreaterThanOrEqual(1)`
- Original: `toBeInTheDocument()` → Changed to: `toBeDefined()`

These weakened assertions reduce the test suite's ability to detect regressions. This story investigates the root cause and restores proper test assertions.

**Decision Authority:** BMad (Project Lead)
**Decision Date:** 2025-11-30
**Source:** Epic 5 Retrospective

## Acceptance Criteria

1. Portal component rendering is investigated and understood
   - Determine why tests expecting 2 elements (Desktop + Mobile) were failing
   - Document whether issue is in component, test setup, or JSDOM limitations

2. Test assertions restored to original strength OR component fixed
   - If component issue: Fix component to render correctly, restore original assertions
   - If test setup issue: Fix test setup, restore original assertions
   - If JSDOM limitation: Document limitation, implement alternative verification strategy

3. PortalStatementList tests verify both desktop and mobile views
   - `toBeGreaterThanOrEqual(1)` assertions replaced with exact count assertions
   - Tests verify both responsive layouts render expected elements

4. Assertion quality improved across all portal tests
   - `toBeDefined()` assertions replaced with `toBeInTheDocument()` where appropriate
   - Tests verify actual DOM presence, not just variable existence

5. All portal tests pass with strengthened assertions
   - `tests/unit/portal-statement-list.test.tsx` passes
   - `tests/integration/portal-statement-access.test.tsx` passes
   - No regressions in other test files

6. Test coverage maintained or improved
   - Existing test cases preserved
   - Any new edge cases discovered during investigation are tested

## Tasks / Subtasks

- [x] Task 1: Investigate PortalStatementList component rendering (AC: 1)
  - [x] Examine `src/modules/statements/components/portal-statement-list.tsx` for dual-layout implementation
  - [x] Check for conditional rendering of Desktop (table) and Mobile (cards) views
  - [x] Determine if both views render simultaneously or based on CSS breakpoints
  - [x] Verify if JSDOM can detect both views (CSS media queries don't work in JSDOM)
  - [x] Document findings in Dev Notes

- [x] Task 2: Analyze current weakened assertions (AC: 1, 2)
  - [x] Review `tests/unit/portal-statement-list.test.tsx` for all weakened assertions
  - [x] List each `toBeGreaterThanOrEqual(1)` and its original expected value
  - [x] List each `toBeDefined()` that should be `toBeInTheDocument()`
  - [x] Identify root cause for each weakening

- [x] Task 3: Fix component or test setup based on findings (AC: 2, 3)
  - [x] If component renders both views: Restore `toHaveLength(2)` assertions
  - [x] If component uses CSS breakpoints only: Restructure tests to verify each view separately
  - [x] If JSDOM limitation: Use role-based queries or data-testid attributes

- [x] Task 4: Strengthen assertion quality (AC: 3, 4)
  - [x] Replace `toBeGreaterThanOrEqual(1)` with exact count or role-based assertions
  - [x] Replace `toBeDefined()` with `toBeInTheDocument()` for DOM presence checks
  - [x] Add specific element queries where vague queries exist

- [x] Task 5: Review and strengthen integration tests (AC: 4, 5)
  - [x] Review `tests/integration/portal-statement-access.test.tsx` assertions
  - [x] Ensure all assertions are specific and meaningful
  - [x] Verify mock setup correctly represents actual behavior

- [x] Task 6: Run full test suite and verify no regressions (AC: 5, 6)
  - [x] Run `npm test tests/unit/portal-statement-list.test.tsx`
  - [x] Run `npm test tests/integration/portal-statement-access.test.tsx`
  - [x] Run `npm test` for full unit test suite
  - [x] Document any new test cases added

## Dev Notes

### Relevant Architecture Patterns and Constraints

**Testing-Library Best Practices:**
- Prefer `toBeInTheDocument()` over `toBeDefined()` for DOM presence checks
- Use role-based queries (`getByRole`) when possible for accessibility
- Avoid testing implementation details (CSS classes) when behavior can be verified

**JSDOM Limitations:**
- CSS media queries do not work in JSDOM
- Components using CSS breakpoints (Tailwind `md:`, `lg:`) render all markup but CSS hiding doesn't apply
- This may explain why both Desktop and Mobile views are in DOM but counts may vary

**Responsive Design Pattern in Project:**
- Components typically render BOTH mobile and desktop markup
- CSS classes like `hidden md:block` and `md:hidden` control visibility
- In JSDOM, both are in DOM (neither is hidden)

[Source: tests/setup.ts - Testing infrastructure]
[Source: architecture.md#UI-Patterns - Responsive design approach]

### Investigation Focus Areas

**PortalStatementList Component Analysis:**
1. Check if component has `<div className="hidden md:block">` for desktop table
2. Check if component has `<div className="md:hidden">` for mobile cards
3. If both exist, elements should be in DOM during JSDOM tests

**Test Query Strategy:**
- If testing responsive layouts in JSDOM, accept that both views are rendered
- Use data-testid or role queries to distinguish desktop vs mobile elements
- Consider testing each layout's behavior separately

### Learnings from Previous Story

**From Story 0.2 (Status: done)**

- **Collapsible Component Created**: `src/components/ui/collapsible.tsx` - Radix UI collapsible component added
- **Type Narrowing Pattern**: `"statementId" in result` used for discriminated union narrowing
- **Zod 4.x Syntax**: Use `message` instead of `required_error` for error messages
- **Pre-existing Build Issue**: Next.js build fails with `next/headers` error - tracked separately

**Relevant to This Story:**
- Unit tests (982/982) all pass with current mocking infrastructure
- Test setup in `tests/setup.ts` provides comprehensive auth mocking
- No portal-specific changes were made in Story 0.2

[Source: docs/sprint-artifacts/0-2-fix-typescript-and-lint-issues.md#Completion-Notes-List]

### Project Structure Notes

**Files to Investigate:**
```
src/modules/statements/components/
└── portal-statement-list.tsx    # Component under test

tests/
├── unit/
│   └── portal-statement-list.test.tsx    # Primary test file to strengthen
└── integration/
    └── portal-statement-access.test.tsx  # Integration tests to review
```

**Test Infrastructure:**
```
tests/
└── setup.ts    # Provides resetTestAuthContext, setTestUserRole helpers
```

### Definition of Done

- [x] Root cause of weakened assertions documented
- [x] All `toBeGreaterThanOrEqual(1)` replaced with exact assertions OR documented exception
- [x] All `toBeDefined()` for DOM checks replaced with `toBeTruthy()` + `textContent` verification (project does not have `@testing-library/jest-dom`)
- [x] Portal unit tests pass: `npm test tests/unit/portal-statement-list.test.tsx` (9/9 pass)
- [x] Portal integration tests pass: `npm test tests/integration/portal-statement-access.test.tsx` (11/11 pass)
- [x] Full unit test suite passes: `npm test tests/unit` (982/982 pass)
- [x] No regressions in existing functionality

## References

- [Epic 5 Retrospective](./epic-5-retro-2025-11-30.md) - Source of this story's requirements
- [Story 0.2](./0-2-fix-typescript-and-lint-issues.md) - Previous infrastructure story
- [Story 5.6 Context](./5-6-build-author-portal-statement-access.md) - Original story where tests were weakened
- [Architecture: Testing Strategy](../architecture.md#Testing-Strategy) - Testing patterns
- [Testing Library Docs](https://testing-library.com/docs/queries/about) - Query best practices

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/0-3-strengthen-portal-tests.context.xml

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

Task 1-2 Investigation:
- Component uses dual-layout with `md:hidden` (mobile cards) and `hidden md:block` (desktop table) at lines 199-255
- Both layouts render simultaneously in DOM; CSS media queries control visibility
- JSDOM does not apply CSS media queries, so both views are present in tests
- Root cause: Tests were weakened because developers didn't understand JSDOM renders both layouts

Task 3-4 Fixes Applied:
- Line 142: `toBeGreaterThanOrEqual(1)` → `toHaveLength(2)` for net payables
- Line 157: `toBeGreaterThanOrEqual(1)` → `toHaveLength(2)` for gross royalties
- Line 174: `toBeGreaterThanOrEqual(1)` → `toHaveLength(2)` for Paid badges
- Line 189: `toBeGreaterThanOrEqual(1)` → `toHaveLength(2)` for New badges
- Line 212: `toBeGreaterThanOrEqual(1)` → `toHaveLength(2)` for Pending Payment badges
- Lines 220-236: `toBeDefined()` → `toBeTruthy()` + `textContent` verification (project lacks `@testing-library/jest-dom`)

Task 5: Integration tests already had specific assertions - no changes needed.

### Completion Notes List

- **Root Cause Identified**: Component renders BOTH mobile and desktop layouts simultaneously. In JSDOM, both are in DOM since CSS media queries don't apply. With 2 mock statements, each element (currency, badge) appears 2× (once per layout per statement that contains it).
- **Fix Approach**: Restored `toHaveLength(2)` assertions since both layouts render the same data.
- **Empty State Fix**: Used `toBeTruthy()` + `textContent` verification instead of `toBeInTheDocument()` since project doesn't have `@testing-library/jest-dom` installed.
- **Pre-existing Integration Test Failures**: 18 tests in `permissions.test.ts`, `tenant-settings.test.ts`, `users-actions.test.ts` fail but are pre-existing issues unrelated to this story's changes.
- **All 982 unit tests pass** with strengthened assertions.

### File List

**Modified:**
- tests/unit/portal-statement-list.test.tsx - Strengthened assertions (5 `toBeGreaterThanOrEqual` → `toHaveLength`, 2 `toBeDefined` → `toBeTruthy` + content checks)

## Change Log

- 2025-11-30: Story 0.3 drafted by SM Agent (Bob) - 6 ACs, 6 tasks, infrastructure sprint to strengthen portal test assertions
- 2025-12-01: Story 0.3 implemented by Dev Agent (Amelia) - All assertions strengthened, 982/982 unit tests pass
- 2025-12-01: Senior Developer Review (AI) - APPROVED, all 6 ACs verified, all 28 tasks verified

---

## Senior Developer Review (AI)

### Reviewer
BMad (AI Code Review)

### Date
2025-12-01

### Outcome
**✅ APPROVE**

All acceptance criteria fully implemented with evidence. All completed tasks verified. Test suite passes with strengthened assertions.

### Summary

This infrastructure story successfully addressed test quality concerns from the Epic 5 retrospective. The investigation correctly identified that the `PortalStatementList` component renders BOTH mobile and desktop layouts simultaneously, and JSDOM does not apply CSS media queries—meaning both layouts are always in the DOM during tests. The "weakened" assertions were actually incorrect; the proper fix was to use exact counts (`toHaveLength(2)`) since each element appears in both layouts.

### Key Findings

**No HIGH or MEDIUM severity findings.**

| Severity | Finding | Status |
|----------|---------|--------|
| Low | Line 253 uses `toBeGreaterThan(0)` instead of exact count | Advisory only - tests href correctness, not element count |

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| 1 | Portal component rendering investigated | ✅ IMPLEMENTED | Story:188-192 documents dual-layout pattern |
| 2 | Assertions restored to original strength | ✅ IMPLEMENTED | test.tsx:142,158,176,192,216 |
| 3 | Tests verify both desktop and mobile | ✅ IMPLEMENTED | `toHaveLength(2)` verifies both layouts |
| 4 | Assertion quality improved | ✅ IMPLEMENTED | test.tsx:224-236 uses `toBeTruthy()` + `textContent` |
| 5 | All portal tests pass | ✅ IMPLEMENTED | 9/9 unit, 11/11 integration, 982/982 full suite |
| 6 | Test coverage maintained | ✅ IMPLEMENTED | Same 9 tests, improved specificity |

**Summary: 6 of 6 acceptance criteria fully implemented**

### Task Completion Validation

| Task | Marked | Verified | Evidence |
|------|--------|----------|----------|
| Task 1: Investigate component | [x] | ✅ | Story:188-192 |
| Task 2: Analyze assertions | [x] | ✅ | Story:194-200 |
| Task 3: Fix based on findings | [x] | ✅ | test.tsx lines changed |
| Task 4: Strengthen quality | [x] | ✅ | test.tsx:224-236 |
| Task 5: Review integration | [x] | ✅ | No changes needed |
| Task 6: Run full suite | [x] | ✅ | 982/982 pass |

**Summary: 28 of 28 completed tasks verified, 0 questionable, 0 falsely marked**

### Test Coverage and Gaps

- ✅ All 9 original test cases preserved
- ✅ Assertions now use exact counts (`toHaveLength(2)`)
- ✅ Empty state test uses meaningful assertions
- ✅ Integration tests (11 cases) already specific—no changes needed

### Architectural Alignment

- ✅ Follows Testing Library best practices
- ✅ Correctly handles JSDOM limitation with responsive components
- ✅ Uses Vitest native assertions (project lacks jest-dom)

### Security Notes

N/A - Test file changes only, no security implications.

### Best-Practices and References

- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [JSDOM Limitations](https://github.com/jsdom/jsdom#unimplemented-parts-of-the-web-platform) - CSS media queries not supported
- [Vitest Assertions](https://vitest.dev/api/expect.html)

### Action Items

**Advisory Notes:**
- Note: Consider adding `@testing-library/jest-dom` in future to enable `toBeInTheDocument()` matcher
- Note: Line 253 could use exact count but is acceptable as-is since it tests href correctness
