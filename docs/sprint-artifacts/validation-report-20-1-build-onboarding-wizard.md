# Validation Report

**Document:** docs/sprint-artifacts/20-1-build-onboarding-wizard.md
**Checklist:** _bmad/bmm/workflows/4-implementation/create-story/checklist.md
**Date:** 2025-12-20

## Summary

- **Overall:** 18/24 checks passed (75%)
- **Critical Issues:** 3
- **Enhancements Needed:** 4
- **Optimizations:** 2

---

## Section Results

### Story Structure & Completeness
Pass Rate: 8/8 (100%)

- [x] ✓ PASS - Story format with As a/I want/So that
  - Evidence: Lines 5-7 - Properly formatted user story
- [x] ✓ PASS - Epic reference included
  - Evidence: Line 15 - Links to Epic 20
- [x] ✓ PASS - FRs implemented listed
  - Evidence: Lines 19-20 - FR176, FR181 specified
- [x] ✓ PASS - Business value articulated
  - Evidence: Lines 24-27 - Four clear value propositions
- [x] ✓ PASS - Dependencies documented
  - Evidence: Lines 31-38 - Prerequisites and dependencies listed
- [x] ✓ PASS - Acceptance criteria comprehensive
  - Evidence: Lines 44-257 - 12 detailed ACs with Given/When/Then format
- [x] ✓ PASS - Tasks broken down with checkboxes
  - Evidence: Lines 371-482 - Comprehensive task list with subtasks
- [x] ✓ PASS - Scope clearly defined (in/out)
  - Evidence: Lines 351-365 - In scope and out of scope sections

---

### Technical Specification Quality
Pass Rate: 4/7 (57%)

- [x] ✓ PASS - Database schema provided
  - Evidence: Lines 265-287 - Complete SQL schema with RLS policy
- [x] ✓ PASS - File structure documented
  - Evidence: Lines 289-315 - Clear directory structure
- [x] ✓ PASS - Implementation patterns referenced
  - Evidence: Lines 317-323 - References statement-wizard-modal.tsx pattern
- [⚠] PARTIAL - Existing actions/schemas not explicitly listed for reuse
  - Evidence: Story mentions reusing patterns but doesn't specify exact imports
  - **Gap:** Missing explicit references to:
    - `updateTenantSettings` from `src/modules/tenant/actions.ts`
    - `inviteUser` from `src/modules/users/actions.ts`
    - `createContact` from `src/modules/contacts/actions.ts`
    - `createTitle` from `src/modules/titles/actions.ts`
    - `createIsbnPrefix` from `src/modules/isbn-prefixes/actions.ts`
- [✗] FAIL - Missing existing UI component references
  - **Issue:** Story proposes creating `onboarding-progress.tsx` but `Progress` component already exists at `src/components/ui/progress.tsx`
  - **Impact:** Developer might reinvent the wheel
- [⚠] PARTIAL - Dev Notes missing specific import paths
  - Evidence: Lines 486-562 - Good code examples but missing import statements
- [✗] FAIL - Schema example uses raw SQL instead of Drizzle pattern
  - **Issue:** Lines 267-286 show raw SQL, should show Drizzle schema pattern matching existing schemas

---

### Reinvention Prevention
Pass Rate: 2/5 (40%)

- [✗] FAIL - Step 2 (Invite Team) doesn't reference existing `InviteUserDialog` pattern
  - Evidence: Story mentions Clerk invitation but doesn't reference existing:
    - `src/modules/users/components/invite-user-dialog.tsx`
    - `inviteUser` action from `src/modules/users/actions.ts`
    - `inviteUserSchema` from `src/modules/users/schema.ts`
  - **Impact:** Developer may create duplicate invitation logic
- [⚠] PARTIAL - Step 3 (Add Contact) missing form reuse guidance
  - Evidence: Lines 119-136 describe form but don't reference:
    - `createContactFormSchema` from `src/modules/contacts/schema.ts`
    - `createContact` action from `src/modules/contacts/actions.ts`
- [⚠] PARTIAL - Step 4 (Create Title) missing form reuse guidance
  - Evidence: Lines 139-156 describe form but don't reference:
    - `createTitleFormSchema` from `src/modules/titles/schema.ts`
    - `createTitle` action from `src/modules/titles/actions.ts`
- [⚠] PARTIAL - Step 5 (Configure ISBN) missing action reference
  - Evidence: Lines 160-176 describe functionality but don't reference:
    - `createIsbnPrefix` from `src/modules/isbn-prefixes/actions.ts`
    - `createIsbnPrefixSchema` from `src/modules/isbn-prefixes/schema.ts`
- [x] ✓ PASS - Tenant settings references existing patterns
  - Evidence: Lines 346-347 mention reusing tenant settings

---

### UX Design Alignment
Pass Rate: 2/2 (100%)

- [x] ✓ PASS - Wizard pattern aligns with UX spec
  - Evidence: UX spec lines 345-347 specify "Wizard-Guided Modal" pattern; story implements this
- [x] ✓ PASS - Progress indicator matches UX patterns
  - Evidence: UX spec mentions progress bars for long operations (line 1087)

---

### LLM Developer Optimization
Pass Rate: 2/2 (100%)

- [x] ✓ PASS - Clear task breakdown with actionable items
  - Evidence: Lines 371-482 - Each task is specific and completable
- [x] ✓ PASS - Code examples provided for complex logic
  - Evidence: Lines 490-562 - Form state, progress calculation, API examples

---

## Failed Items

### 1. [CRITICAL] Missing Progress UI Component Reference

**Issue:** Story proposes creating `onboarding-progress.tsx` with "Visual progress bar" but shadcn/ui Progress component already exists.

**Location:** `src/components/ui/progress.tsx`

**Existing Component:**
```tsx
import { Progress } from "@/components/ui/progress";
// Usage: <Progress value={33} />
```

**Recommendation:** Update story to explicitly use existing Progress component instead of creating new one.

---

### 2. [CRITICAL] Missing Existing Action/Schema References for Steps 2-5

**Issue:** Each step describes functionality without referencing existing, tested code that should be reused.

**Step 2 - Invite Team** should reference:
```tsx
import { inviteUser } from "@/modules/users/actions";
import { inviteUserSchema, type InviteUserInput } from "@/modules/users/schema";
```

**Step 3 - Add Contact** should reference:
```tsx
import { createContact } from "@/modules/contacts/actions";
import { createContactFormSchema, type CreateContactFormInput } from "@/modules/contacts/schema";
```

**Step 4 - Create Title** should reference:
```tsx
import { createTitle } from "@/modules/titles/actions";
import { createTitleFormSchema, type CreateTitleFormInput } from "@/modules/titles/schema";
```

**Step 5 - Configure ISBN** should reference:
```tsx
import { createIsbnPrefix } from "@/modules/isbn-prefixes/actions";
import { createIsbnPrefixSchema, type CreateIsbnPrefixInput } from "@/modules/isbn-prefixes/schema";
```

**Impact:** Without these references, developer will likely create duplicate validation logic and actions.

---

### 3. [CRITICAL] Schema Example Uses Raw SQL Instead of Drizzle

**Issue:** Database schema shows raw SQL (lines 267-286) instead of Drizzle ORM pattern used throughout codebase.

**Current (Raw SQL):**
```sql
CREATE TABLE onboarding_progress (...)
```

**Should Be (Drizzle Pattern):**
```typescript
// src/db/schema/onboarding.ts
import { pgTable, uuid, varchar, integer, jsonb, timestamp, unique } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const onboardingProgress = pgTable("onboarding_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenant_id: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("not_started"),
  current_step: integer("current_step").notNull().default(1),
  steps_completed: jsonb("steps_completed").notNull().default({}),
  step_data: jsonb("step_data").notNull().default({}),
  started_at: timestamp("started_at", { withTimezone: true }),
  completed_at: timestamp("completed_at", { withTimezone: true }),
  dismissed_at: timestamp("dismissed_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqTenant: unique().on(table.tenant_id),
}));
```

---

## Partial Items

### 1. Step 1 (Company Profile) Missing Tenant Settings Reuse Details

**Gap:** Story mentions reusing tenant settings but doesn't specify:
- Exact action: `updateTenantSettings` from `src/modules/tenant/actions.ts`
- Exact schema: `updateTenantSettingsFormSchema` from `src/modules/tenant/schema.ts`
- Existing form: `TenantSettingsForm` at `src/modules/tenant/components/tenant-settings-form.tsx`

**Recommendation:** Add explicit import references in Dev Notes.

---

### 2. Logo Upload Missing S3 Pattern Reference

**Gap:** Story mentions "S3 presigned URLs" but doesn't reference:
- Whether S3 file upload is already implemented
- Existing file upload patterns (if any)
- Storage module location

**Recommendation:** Add note about checking existing S3/storage implementation or defer logo upload to future enhancement.

---

## Recommendations

### 1. Must Fix (Critical Failures)

1. **Add "Existing Code to Reuse" section** to Dev Notes with explicit imports for all steps
2. **Replace raw SQL** with Drizzle schema pattern
3. **Reference existing Progress component** instead of proposing new one

### 2. Should Improve (Important Gaps)

1. Add explicit form component reuse references for each step
2. Add existing InviteUserDialog as reference for Step 2
3. Clarify logo upload approach (existing pattern or skip for MVP)
4. Add test file patterns from existing test files

### 3. Consider (Minor Improvements)

1. Add UX design spec line references for wizard patterns
2. Add color scheme reference (#1E3A5F Editorial Navy)
3. Add keyboard accessibility notes (Enter to advance mentioned, Tab navigation?)

---

## Quick Fix Commands

To apply critical fixes, respond with:
- **all** - Apply all suggested improvements
- **critical** - Apply only the 3 critical issues
- **select [1,2,3...]** - Apply specific numbered improvements
- **none** - Keep story as-is

**Your choice:**
