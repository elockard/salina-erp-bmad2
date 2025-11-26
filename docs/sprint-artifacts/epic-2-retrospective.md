# Epic 2 Retrospective: Author & Title Catalog Management

**Date**: November 24, 2025
**Facilitator**: Bob (Scrum Master)
**Attendees**: BMad (Project Lead), Alice (Product Owner), Charlie (Senior Dev), Dana (QA Engineer)

---

## Executive Summary

Epic 2 completed with **9/9 stories delivered** (100% completion rate). During the retrospective session, **3 TypeScript errors** were discovered and immediately resolved. The team identified test infrastructure gaps carried forward from Epic 1 that should be addressed before Epic 3.

**Key Achievement**: Established complete Author & Title catalog management with ISBN pool tracking, CSV import, and smart assignment with row-level locking.

---

## Epic 2 Delivery Metrics

### Story Completion

| Story | Description | Status | Tests |
|-------|-------------|--------|-------|
| 2.1 | Author Database Schema | done | Verified |
| 2.2 | Author Management Split View | done | 28 unit |
| 2.3 | Author Portal Access Provisioning | done | 17 tests |
| 2.4 | Title Database Schema | done | 36 unit |
| 2.5 | Title Management Split View | done | 27 E2E |
| 2.6 | ISBN Pool Database Schema | done | 64 unit |
| 2.7 | ISBN Import with CSV Upload | done | 55 tests |
| 2.8 | ISBN Pool Status View | done | 21 unit |
| 2.9 | ISBN Assignment with Row Locking | done | 26 unit |

- **Total Stories**: 9
- **Completed**: 9 (100%)
- **Total Tests Created**: 274+
- **All Code Reviews**: APPROVED

### Quality Metrics

- **TypeScript Errors Found During Retro**: 3 (all resolved)
- **Code Review Outcome**: All stories APPROVED
- **HIGH Severity Issues**: 0
- **MEDIUM Severity Issues**: 0
- **Production Blockers**: 0

### Business Outcomes

- Author catalog management operational
- Title catalog with multi-format support
- ISBN pool tracking with import/export
- Smart ISBN assignment preventing duplicates
- Author portal access provisioning
- Row-level security enforced across all tables

---

## Issues Found & Resolved During Retrospective

### Issue #1: Type Spec Divergence - author_id

**Severity**: LOW
**Stories**: 2.3
**Impact**: TypeScript compilation errors in test files

**Problem**: Tech spec indicated `users.author_id` column, but implementation used reverse FK direction `authors.portal_user_id`. Test type annotations weren't updated to match.

**Files Affected**:
- `tests/integration/portal-webhook.test.ts:209`
- `tests/unit/portal-access.test.ts:164`

**Resolution**: Added proper type annotations with optional `author_id` field:
```typescript
type PortalMetadata = { tenant_id: string; role: string; author_id?: string };
```

**Prevention**: Code review checklist should verify test types match actual implementation when spec diverges.

---

### Issue #2: ISBN Type Comparison Warning

**Severity**: LOW
**Story**: 2.8
**Impact**: TypeScript warning about unintentional comparison

**Problem**: Test variable typed as literal `"ebook"` compared against `"physical"`, TypeScript flagged as always-false comparison.

**File**: `tests/unit/isbn-queries.test.ts:261`

**Resolution**: Added explicit `: string` type annotation:
```typescript
const type: string = "ebook";
```

---

### Issue #3: Integration Tests Missing DATABASE_URL

**Severity**: MEDIUM
**Stories**: Multiple (pre-existing from Epic 1)
**Impact**: Integration tests couldn't connect to database

**Problem**: Vitest setup didn't load `.env` file, causing `DATABASE_URL` to be undefined.

**Resolution**: Added dotenv loading to `tests/setup.ts`:
```typescript
import { config } from "dotenv";
config();
```

**Note**: Tests now connect but fail on auth context - see Action Items.

---

## What Went Well

### 1. Pattern Reuse: Split View Explorer

The Split View pattern established in Story 2.2 (Authors) was seamlessly reused in Story 2.5 (Titles). Once the pattern was nailed, subsequent implementations followed predictably.

**Files demonstrating pattern reuse**:
- `src/modules/authors/components/author-list.tsx`
- `src/modules/titles/components/title-list.tsx`

### 2. Row-Level Locking for ISBN Assignment

Story 2.9 implemented PostgreSQL `FOR UPDATE` with `skipLocked: true` for graceful concurrent handling. This prevents race conditions when multiple users try to assign ISBNs simultaneously.

**Key implementation**: `src/modules/isbn/actions.ts:277`

### 3. ISBN-13 Checksum Validation

Story 2.7 correctly implemented the international ISBN-13 checksum algorithm per the ISBN Users Manual specification.

**Implementation**: `src/modules/isbn/utils.ts:44-63`

### 4. Comprehensive Test Coverage

274+ tests created across the epic:
- Unit tests for schemas, validation, queries
- Integration tests for Server Actions
- E2E test scaffolding for user flows

### 5. Consistent Server Action Pattern

Every story followed the established pattern:
```typescript
// 1. Validate with Zod
// 2. Check permission
// 3. Get tenant context
// 4. Execute business logic
// 5. Revalidate and return ActionResult
```

---

## What Could Be Improved

### 1. Test Infrastructure (Carried from Epic 1)

**Issue**: Integration tests require authenticated session context, but auth mocking is incomplete.

**Impact**: 13 integration tests fail due to missing auth context.

**Files Affected**:
- `tests/integration/users-actions.test.ts`
- `tests/integration/tenant-settings.test.ts`

**Improvement**: Implement proper Clerk session mocking for integration tests.

### 2. Type Annotations When Spec Diverges

**Issue**: When implementation direction changes from original spec, test type annotations must be updated.

**Example**: `users.author_id` spec became `authors.portal_user_id` implementation.

**Improvement**: Add to code review checklist: "Verify test types match implementation, not spec."

### 3. Pre-existing Build Issues

**Issue**: `tenant-settings-form.tsx` has build warnings carried from Epic 1.

**Improvement**: Address technical debt before starting new epic.

---

## Patterns & Learnings for Epic 3

### Established Patterns to Reuse

**1. Server Action Pattern** (all stories):
```typescript
export async function myAction(data: unknown): Promise<ActionResult<T>> {
  const validated = schema.parse(data);
  await requirePermission(ALLOWED_ROLES);
  const tenantId = await getCurrentTenantId();
  // Execute with tenant isolation
  return { success: true, data: result };
}
```

**2. Split View Explorer Pattern** (Stories 2.2, 2.5):
- 320px fixed left panel with searchable list
- Flexible right panel with detail/edit view
- Mobile responsive below 768px

**3. Row-Level Locking Pattern** (Story 2.9):
```typescript
await tx.select().from(table)
  .where(conditions)
  .limit(1)
  .for("update", { skipLocked: true });
```

**4. CSV Import Pattern** (Story 2.7):
- Client-side preview with papaparse
- Server-side re-validation (never trust client)
- All-or-nothing transaction

### Technical Debt Carried Forward

| Item | Source | Priority |
|------|--------|----------|
| Integration test auth mocking | Epic 1 | HIGH |
| tenant-settings-form.tsx warnings | Epic 1 | MEDIUM |

---

## Epic 3 Preparation - Action Items

### Action Item 1: Fix Integration Test Auth Mocking

**Priority**: HIGH
**Description**: Add Clerk session mocking to integration tests so they can properly test Server Actions.

**Files to Update**:
- `tests/integration/users-actions.test.ts`
- `tests/integration/tenant-settings.test.ts`
- `tests/setup.ts` (add auth mock helpers)

**Approach**:
```typescript
// Mock getCurrentTenantId and requirePermission
vi.mock("@/lib/auth", () => ({
  getCurrentTenantId: vi.fn(() => "test-tenant-uuid"),
  requirePermission: vi.fn(() => Promise.resolve()),
  getCurrentUser: vi.fn(() => ({ id: "test-user", role: "admin" })),
}));
```

---

### Action Item 2: Fix Pre-existing Build Warnings

**Priority**: MEDIUM
**Description**: Address `tenant-settings-form.tsx` build warnings from Epic 1.

---

### Action Item 3: Update Code Review Checklist

**Priority**: LOW
**Description**: Add verification step: "Test types match implementation when spec diverges."

---

## Epic 3 Technical Prerequisites

**Story 3.1: Create Sales Transaction Database Schema**

**Dependencies from Epic 2**:
- Title schema with ISBN fields (Story 2.4)
- ISBN assignment working (Story 2.9)
- Author schema (Story 2.1)

**New Patterns to Establish**:
- Append-only ledger (no UPDATE/DELETE)
- CHECK constraints for business rules

**No blockers** - Epic 3 can proceed immediately.

---

## Retrospective Metrics

**Session Duration**: ~45 minutes
**Issues Found**: 3 TypeScript errors + 1 test config issue
**Issues Resolved**: 3 (TypeScript errors fixed, test config fixed)
**Code Files Modified**: 4
**Action Items Created**: 3

**Team Sentiment**: Positive - solid delivery, clear path forward

---

## Conclusion

Epic 2 successfully delivered a complete Author & Title catalog management system with sophisticated ISBN pool tracking. The retrospective identified test infrastructure gaps that should be addressed to maintain velocity in Epic 3.

**Epic 2 Status**: COMPLETE

**Epic 3 Readiness**: READY TO START (after addressing HIGH priority action item)

**Next Steps**:
1. Complete Action Item 1 (integration test auth mocking)
2. Begin Story 3.1: Create Sales Transaction Database Schema
3. Apply patterns from Epic 2 to sales entry forms

---

**Retrospective Facilitated By**: Bob (Scrum Master)
**Document Version**: 1.0
**Date**: November 24, 2025
