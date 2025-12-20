# Validation Report

**Document:** docs/sprint-artifacts/15-2-build-core-rest-api-endpoints.md
**Checklist:** _bmad/bmm/workflows/4-implementation/create-story/checklist.md
**Date:** 2025-12-17

## Summary
- Overall: 17/24 passed (71%)
- Critical Issues: 5
- Enhancements: 4

---

## Section Results

### Story Context & Dependencies
Pass Rate: 4/4 (100%)

✓ **PASS** - Story statement with As a/I want/So that format
Evidence: Lines 9-11 contain properly formatted user story

✓ **PASS** - Dependencies documented
Evidence: Lines 17-19 reference Story 15.1 as prerequisite

✓ **PASS** - Business value documented
Evidence: Lines 21-26 list clear business value points

✓ **PASS** - Existing infrastructure referenced
Evidence: Lines 27-37 list all relevant existing modules

---

### Acceptance Criteria
Pass Rate: 8/10 (80%)

✓ **PASS** - AC1-4: Titles API endpoints documented
Evidence: Lines 41-93 provide detailed AC with JSON response schema

✓ **PASS** - AC5: Contacts API documented
Evidence: Lines 94-102 cover CRUD operations

✓ **PASS** - AC6: Sales API documented
Evidence: Lines 104-112 cover GET/POST with filtering

✓ **PASS** - AC7: ONIX Export API documented
Evidence: Lines 114-120 cover XML export with filtering

✓ **PASS** - AC8: Tenant isolation documented
Evidence: Lines 122-126 require strict isolation

✓ **PASS** - AC9: Error response format documented
Evidence: Lines 128-141 provide JSON schema

✓ **PASS** - AC10: Rate limit headers documented
Evidence: Lines 143-150 specify header requirements

⚠ **PARTIAL** - Publication status values
Evidence: Line 333 uses `scheduled` but actual schema uses `pending`
Impact: Zod schema will reject valid database values

⚠ **PARTIAL** - Sales filter parameter
Evidence: Line 108 uses `source=amazon` but schema field is `channel`
Impact: Filtering will fail with wrong parameter name

---

### Tasks & Technical Implementation
Pass Rate: 5/10 (50%)

✓ **PASS** - Task structure with AC mappings
Evidence: Lines 154-190 map tasks to acceptance criteria

✓ **PASS** - Authentication pattern documented
Evidence: Lines 194-217 show correct auth middleware usage

✓ **PASS** - Cursor pagination documented
Evidence: Lines 219-250 explain cursor-based approach

✓ **PASS** - Response utilities documented
Evidence: Lines 253-312 provide complete utility functions

✗ **FAIL** - ONIX Export API implementation incorrect
Evidence: Lines 495-577 show incorrect builder usage
- Story shows: `builder.toXML30()` and `builder.addTitle(title, authors, { channel })`
- Actual builder: Constructor takes version param, `addTitle` takes only `TitleWithAuthors`
Impact: Code will not compile; will cause significant rework

✗ **FAIL** - Missing imports in code examples
Evidence: Lines 438-440 use `sql` without import
Evidence: Line 534 uses `inArray` without import
Evidence: Line 551 references `tenants` without import
Impact: Code examples won't work as-is

✗ **FAIL** - Sales API missing required field handling
Evidence: Sales schema requires `created_by_user_id` (src/db/schema/sales.ts:153-155)
Story doesn't address how API will provide this for automated sales creation
Impact: POST /api/v1/sales will fail database constraint

✗ **FAIL** - Title create schema incomplete
Evidence: Lines 339-348 missing critical fields from actual schema:
- `subtitle`, `genre`, `word_count` (basic fields)
- `asin` (Amazon integration - Story 17.4)
- `epub_accessibility_conformance`, `accessibility_features`, `accessibility_hazards`, `accessibility_summary` (Story 14.3)
Impact: API won't support full title metadata creation

⚠ **PARTIAL** - Sensitive field exclusion incomplete
Evidence: Line 102 mentions `tax_id` but actual schema has more sensitive fields:
- `tin_encrypted`, `tin_type`, `tin_last_four`
- `payment_info`
- `w9_received`, `w9_received_date`
Impact: Sensitive financial/tax data could be exposed

---

## Failed Items

### 1. ONIX Export API Implementation (Critical)

**Problem:** Code example doesn't match actual ONIXMessageBuilder interface.

**Current Story (Lines 558-577):**
```typescript
builder.addTitle(title, authors, { channel });
const xml = format === "3.0"
  ? builder.toXML30()
  : builder.toXML();
```

**Actual Implementation (src/modules/onix/builder/message-builder.ts):**
```typescript
// Constructor takes version as third parameter
const builder = new ONIXMessageBuilder(tenantId, tenant, "3.0");

// addTitle takes TitleWithAuthors, not (title, authors, options)
builder.addTitle(title); // TitleWithAuthors type

// Single toXML() method for all versions
const xml = builder.toXML();
```

**Recommendation:** Rewrite ONIX export endpoint to:
1. Use version param in constructor
2. Use `getTitleWithAuthors` query pattern from `src/modules/title-authors/queries.ts`
3. Call single `toXML()` method

---

### 2. Missing Imports in Code Examples (Critical)

**Problem:** Code examples reference symbols not imported.

**Missing imports for titles route:**
```typescript
import { sql } from "drizzle-orm"; // For count query
```

**Missing imports for ONIX route:**
```typescript
import { inArray } from "drizzle-orm"; // For title_ids filter
import { tenants } from "@/db/schema/tenants"; // For tenant lookup
```

**Recommendation:** Add complete import statements to all code examples.

---

### 3. Sales API created_by_user_id Handling (Critical)

**Problem:** Sales schema requires `created_by_user_id` but API tokens don't have user context.

**Schema requirement (src/db/schema/sales.ts:153-155):**
```typescript
created_by_user_id: uuid("created_by_user_id")
  .notNull()
  .references(() => users.id),
```

**Recommendation:** Options:
1. Create a system user per tenant for API-created sales
2. Store API key ID as a new `created_by_api_key_id` field (requires schema change)
3. Make `created_by_user_id` nullable for API sales (requires schema change)

Add explicit handling in Dev Notes with chosen approach.

---

### 4. Incomplete Title Create Schema (High)

**Problem:** Many fields from actual titles schema missing.

**Add to createTitleSchema:**
```typescript
const createTitleSchema = z.object({
  // Existing fields...

  // Missing basic fields
  subtitle: z.string().max(500).optional(),
  genre: z.string().max(100).optional(),
  word_count: z.number().int().positive().optional(),

  // Amazon integration (Story 17.4)
  asin: z.string().regex(/^[A-Z0-9]{10}$/).optional(),

  // Accessibility (Story 14.3)
  epub_accessibility_conformance: z.string().optional(),
  accessibility_features: z.array(z.string()).optional(),
  accessibility_hazards: z.array(z.string()).optional(),
  accessibility_summary: z.string().optional(),
});
```

---

### 5. Publication Status Enum Mismatch (Medium)

**Problem:** Story uses `scheduled` but schema uses `pending`.

**Fix Line 333:**
```typescript
status: z.enum(["draft", "pending", "published", "out_of_print"]).optional(),
```

---

## Partial Items

### 1. Sales Filter Parameter Name

**Problem:** Story uses `source` but schema field is `channel`.

**Fix Line 108:**
```diff
- ?title_id=uuid&start_date=2024-01-01&end_date=2024-12-31&source=amazon
+ ?title_id=uuid&start_date=2024-01-01&end_date=2024-12-31&channel=amazon
```

### 2. Sensitive Field Exclusion for Contacts

**Add to AC5 (after line 102):**
```markdown
- **And** the following sensitive fields are excluded from API responses:
  - `tax_id`, `tin_encrypted`, `tin_type`, `tin_last_four`
  - `payment_info`
  - `w9_received`, `w9_received_date`
```

---

## Recommendations

### Must Fix (Critical)
1. **Rewrite ONIX export code example** to match actual builder interface
2. **Add missing imports** to all code examples
3. **Add explicit handling for created_by_user_id** in sales API
4. **Complete title create schema** with all supported fields
5. **Fix publication_status enum** to use `pending` not `scheduled`

### Should Improve (Enhancement)
1. **Fix sales filter** parameter name from `source` to `channel`
2. **Expand sensitive field exclusion list** for contacts API
3. **Add contact_roles** to contacts API response (include roles array)
4. **Add TitleWithAuthors query pattern** reference from existing title-authors module

### Consider (Optimization)
1. Add example for handling ONIX price from `list_price` field
2. Consider adding `format` field to sales filtering (currently missing)
3. Add pagination to ONIX export for large catalogs (stream response)
