# Validation Report

**Document:** docs/sprint-artifacts/17-3-import-amazon-sales-data.md
**Checklist:** _bmad/bmm/workflows/4-implementation/create-story/checklist.md
**Date:** 2025-12-17

## Summary
- Overall: 18/23 items passed (78%)
- Critical Issues: **3**
- Enhancements: 4
- Optimizations: 2

---

## Section Results

### 1. Story Structure & Clarity
Pass Rate: 6/6 (100%)

✓ **User Story Format** - Lines 5-9: Proper As a/I want/So that format
Evidence: `**As a** publisher, **I want** to import sales from Amazon, **So that** royalties include Amazon sales without manual data entry.`

✓ **Context & Dependencies** - Lines 11-26: Clear dependencies listed
Evidence: Dependencies on Stories 17.1, 17.2, 16.3 and Epic 3 documented

✓ **Business Value** - Lines 21-26: Strong business justification
Evidence: "Amazon represents ~50% of US book sales - critical for accurate royalty calculations"

✓ **Acceptance Criteria** - Lines 52-119: 9 ACs in Given/When/Then format
Evidence: AC1-AC9 comprehensively cover all requirements

✓ **Tasks Breakdown** - Lines 121-162: 7 tasks with subtasks mapped to ACs
Evidence: Tasks are detailed with AC mapping

✓ **Test Scenarios** - Lines 1101-1147: Comprehensive test coverage
Evidence: Unit, integration, and manual test scenarios defined

---

### 2. Technical Specification Accuracy
Pass Rate: 4/7 (57%)

✓ **API Specification** - Lines 189-240: SP-API Reports flow documented
Evidence: Complete 4-step API flow with request/response examples

✓ **Code Templates** - Lines 242-534, 561-917: Comprehensive implementation templates
Evidence: Full reports-api-client.ts, sales-parser.ts, and Inngest job provided

✓ **Pattern References** - Lines 166-175: Existing patterns identified
Evidence: "CRITICAL: Reuse Existing Patterns" section with 6 patterns listed

✗ **FAIL: ASIN Field Does Not Exist** - Lines 783-797, 830-834
Impact: **CRITICAL BLOCKER** - TypeScript compilation will fail
Evidence: Story references `title.asin` in ISBN map building (line 794) and matching (line 832-833), but the titles schema has NO asin field. Story 17.4 is specifically about ASIN linking and notes "Store in title metadata or separate table" - meaning ASIN storage hasn't been implemented yet.

**Current titles schema fields:** id, tenant_id, author_id, contact_id, title, subtitle, genre, word_count, publication_status, isbn, eisbn, publication_date, created_at, updated_at, epub_accessibility_conformance, accessibility_features, accessibility_hazards, accessibility_summary

**NO `asin` field exists.**

✗ **FAIL: Sales Channel 'amazon' Does Not Exist** - Lines 809, 866
Impact: **CRITICAL BLOCKER** - Database INSERT will fail CHECK constraint
Evidence: Story uses `channel: "amazon"` but `salesChannelValues = ["retail", "wholesale", "direct", "distributor"]`. The 'amazon' value is NOT in the allowed enum.

**Ingram correctly uses `channel: "distributor"`** (see src/inngest/ingram-orders.ts line 330)

✗ **FAIL: Rate Limiting Functions Don't Exist** - Lines 953-958
Impact: Server action will fail to compile
Evidence: Story references `getLastTriggerTime(rateLimitKey)` and `setLastTriggerTime(rateLimitKey)` but these functions are not imported and don't exist in the codebase.

---

### 3. Anti-Pattern Prevention
Pass Rate: 5/5 (100%)

✓ **No Wheel Reinvention** - Lines 166-175, 177-187
Evidence: "ALREADY EXISTS - Do Not Recreate" section lists 7 existing components

✓ **Pattern Reuse** - Lines 170-175
Evidence: Explicit instructions to reuse Ingram patterns, AWS Signature V4, ISBN normalization

✓ **adminDb Usage** - Lines 581-582, 585
Evidence: Correctly specifies adminDb for Inngest jobs (no RLS session context)

✓ **Inngest Step Pattern** - Lines 705-725
Evidence: Uses step.run and step.sleep for proper Inngest handling

✓ **Duplicate Detection** - Lines 804-821
Evidence: Batch query pattern for O(1) duplicate lookup (avoids N+1)

---

### 4. Security Requirements
Pass Rate: 3/3 (100%)

✓ **Authentication** - Lines 950-951
Evidence: Role check for owner/admin on manual import trigger

✓ **Tenant Isolation** - Lines 1059
Evidence: "Tenant isolation - RLS on channel_feeds, sales use tenant_id from adminDb context"

✓ **Credential Security** - Lines 1060
Evidence: "Credential security - Never log decrypted credentials"

---

### 5. File Organization
Pass Rate: 2/2 (100%)

✓ **Project Structure** - Lines 1035-1053
Evidence: Clear directory structure with new vs modified file distinction

✓ **File List** - Lines 1180-1198
Evidence: Comprehensive list of 7 new files and 7 modified files

---

## Critical Issues (Must Fix)

### Issue 1: ASIN Field Does Not Exist in Schema

**Problem:** The story code references `title.asin` multiple times, but no `asin` column exists in the titles table. Story 17.4 is specifically about "Link Titles to ASINs" and comes AFTER this story.

**Location:** Lines 783-797 (build-isbn-map), Lines 830-834 (matching logic)

**Evidence:**
```typescript
// From story - WILL FAIL:
if (title.asin) {
  entries.push([title.asin.toUpperCase(), { id: title.id, format: "physical" }]);
}
```

**Fix Required:**
1. Remove ALL ASIN matching logic from Story 17.3
2. Update AC5 to only mention ISBN matching (not ASIN)
3. Note in Dev Notes that ASIN matching requires Story 17.4 first
4. ISBN extraction from SKU field is still valid approach

---

### Issue 2: Sales Channel 'amazon' Not in Schema Enum

**Problem:** The `sales` table has a CHECK constraint limiting channel to: `["retail", "wholesale", "direct", "distributor"]`. Using `channel: "amazon"` will fail.

**Location:** Lines 809, 866, and throughout

**Evidence:**
```typescript
// src/db/schema/sales.ts lines 52-57:
export const salesChannelValues = [
  "retail",
  "wholesale",
  "direct",
  "distributor",
] as const;
```

**Fix Options:**
1. **Option A (Recommended):** Add "amazon" to `salesChannelValues` and create a migration
2. **Option B:** Use `channel: "direct"` since Amazon is marketplace sales
3. **Option C:** Use `channel: "retail"` treating Amazon as retail

**Recommended approach:** Add Task 0 to modify schema before implementation:
- Update `src/db/schema/sales.ts` to add `"amazon"` to salesChannelValues
- Create database migration to add the enum value

---

### Issue 3: Rate Limiting Functions Don't Exist

**Problem:** Server action references undeclared functions for rate limiting.

**Location:** Lines 953-958

**Evidence:**
```typescript
const lastTrigger = await getLastTriggerTime(rateLimitKey);  // NOT IMPORTED
await setLastTriggerTime(rateLimitKey);  // NOT IMPORTED
```

**Fix Required:**
1. Either implement rate limiting using Redis/DB pattern, OR
2. Remove rate limiting entirely (simpler), OR
3. Use a simple in-memory approach with timestamp tracking

---

## Enhancement Opportunities (Should Add)

### Enhancement 1: Schema Migration Task

Add explicit task for schema changes:
```
- [ ] Task 0 (AC: 4): Add 'amazon' to sales channel enum
  - [ ] Update salesChannelValues in src/db/schema/sales.ts
  - [ ] Create migration: ALTER TYPE to add 'amazon' value
  - [ ] Run migration before other tasks
```

### Enhancement 2: Clarify ISBN-Only Matching

Update AC5 to be clear that ASIN matching is NOT in scope:
```
### AC5: Match Sales to Titles by ISBN
- **And** Note: ASIN-based matching requires Story 17.4 completion
```

### Enhancement 3: Import Helper Functions from Ingram

Instead of duplicating helper functions, import from Ingram parser:
```typescript
// Instead of duplicating in sales-parser.ts:
import { findColumn, parseDelimitedLine, parseFlexibleDate } from "@/modules/channels/adapters/ingram/order-parser";
```

### Enhancement 4: Add Type Checking to Build ISBN Map

Ensure type safety for titles query:
```typescript
columns: { id: true, isbn: true, eisbn: true },  // Remove asin until 17.4
```

---

## Optimizations (Nice to Have)

### Optimization 1: Batch Sales Insert

Instead of inserting sales one-by-one, batch insert for better performance:
```typescript
const salesToInsert = [];
// ... build array
await adminDb.insert(sales).values(salesToInsert);
```

### Optimization 2: Use Decimal.js Import

Ensure proper import at top of Inngest job:
```typescript
import Decimal from "decimal.js";  // Already shown but verify in implementation
```

---

## Recommendations

### 1. Must Fix (Blockers)

| Priority | Issue | Action |
|----------|-------|--------|
| P0 | ASIN field doesn't exist | Remove all `title.asin` references |
| P0 | Channel 'amazon' not valid | Add to schema enum OR use 'direct' |
| P1 | Rate limiting undefined | Remove or implement properly |

### 2. Should Improve

| Issue | Action |
|-------|--------|
| Schema migration task | Add Task 0 for channel enum change |
| AC5 clarity | Update to note ASIN requires Story 17.4 |
| Helper function reuse | Import from Ingram parser |

### 3. Consider

| Issue | Action |
|-------|--------|
| Batch inserts | Optimize for large imports |
| Proper imports | Verify all imports in final code |

---

## Validation Verdict

**STATUS: 🚨 CRITICAL ISSUES FOUND**

The story has 3 critical issues that MUST be fixed before implementation:
1. ASIN field references will cause TypeScript compilation failure
2. Sales channel 'amazon' will cause database constraint violation
3. Rate limiting functions are undefined

These are not minor issues - they are **implementation blockers** that would cause immediate failures during development.

**RECOMMENDED ACTION:** Apply fixes before marking story as ready-for-dev.
