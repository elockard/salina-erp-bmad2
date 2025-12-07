# Validation Report

**Document:** docs/sprint-artifacts/7-3-migrate-authors-to-contacts.md
**Checklist:** .bmad/bmm/workflows/4-implementation/create-story/checklist.md
**Date:** 2025-12-05

## Summary
- Overall: 14/20 passed (70%)
- Critical Issues: 6

## Section Results

### Reinvention Prevention
Pass Rate: 2/4 (50%)

✓ PASS: Uses existing contacts schema from Story 7.1
Evidence: Lines 448-453 reference Story 7.1 learnings and contacts schema patterns

✓ PASS: References existing contact module types
Evidence: Lines 345-346: `import type { ContactWithRoles } from "@/modules/contacts/types";`

⚠ PARTIAL: getDb() pattern not followed
Evidence: Line 344 uses `import { db } from "@/db"` but existing authors/queries.ts (line 3) uses `import { getCurrentTenantId, getDb } from "@/lib/auth"`. The story should use the existing `getDb()` pattern.
Impact: Developer may use wrong import pattern, causing inconsistency with existing codebase.

✗ FAIL: Missing encryption handling for tax_id
Evidence: Lines 17-20 show `tax_id → tax_id` mapping but don't mention that existing authors use AES-256-GCM encryption (see src/modules/authors/actions.ts:40). Migration must preserve encrypted values correctly.
Impact: Could expose sensitive tax IDs if decrypted during migration or cause data corruption.

### Technical Specification Accuracy
Pass Rate: 3/5 (60%)

✓ PASS: Complete field mapping documented
Evidence: Lines 15-28 show comprehensive field mapping with edge cases (name splitting)

✓ PASS: Foreign key updates specified
Evidence: Lines 38-46 (AC-7.3.3) detail all FK updates needed for titles, contracts, statements

✓ PASS: Transaction safety mentioned
Evidence: Lines 213, 507-508: Migration wrapped in BEGIN/COMMIT transaction

⚠ PARTIAL: Migration SQL has potential bug in mapping logic
Evidence: Lines 293-299 join on `c.portal_user_id IS NOT DISTINCT FROM a.portal_user_id AND c.created_at = a.created_at`. This fails if two authors have same tenant, NULL portal_user_id, and same created_at timestamp.
Impact: Could create incorrect author→contact mappings, breaking data integrity.

✗ FAIL: Missing Drizzle schema updates
Evidence: Lines 437-440 list files to modify (titles.ts, contracts.ts, statements.ts) but don't show the actual Drizzle column definitions with `.references()` syntax. Developer needs exact code.
Impact: Developer may implement incorrectly or waste time figuring out syntax.

### File Structure and Organization
Pass Rate: 2/3 (67%)

✓ PASS: Correct migration file location
Evidence: Line 430: `drizzle/migrations/XXXX_migrate_authors_to_contacts.sql`

✓ PASS: Correct test file locations
Evidence: Lines 433-434: tests/unit/ and tests/integration/ paths follow existing patterns

⚠ PARTIAL: Missing Drizzle Kit workflow
Evidence: No mention of running `pnpm drizzle-kit generate` or `pnpm drizzle-kit migrate` commands. Developer needs to know the correct workflow for this project.
Impact: Developer may manually create migration files incorrectly.

### Previous Story Learnings
Pass Rate: 3/3 (100%)

✓ PASS: Story 7.1 patterns referenced
Evidence: Lines 448-453 list specific learnings about contacts schema

✓ PASS: Story 7.2 patterns referenced
Evidence: Lines 455-461 list action patterns, permission checks, audit logging

✓ PASS: Anti-patterns section included
Evidence: Lines 506-516 list 9 specific anti-patterns to avoid

### Regression Prevention
Pass Rate: 2/4 (50%)

✓ PASS: Rollback capability defined
Evidence: Lines 54-58 (AC-7.3.5) and Task 2 (lines 91-97) detail rollback script

✓ PASS: Data validation queries provided
Evidence: Lines 404-424 show pre/post migration validation queries

✗ FAIL: Statements module updates not specified
Evidence: Story mentions updating `src/modules/authors/` but src/modules/statements/ uses author_id extensively (queries.ts lines 51, 100-101, 596; actions.ts lines 243, 312-338). These need updating too.
Impact: Statement generation wizard, portal statements, and all statement queries will break.

✗ FAIL: Portal analytics components not specified
Evidence: Portal page (src/app/(portal)/portal/page.tsx lines 86-99) uses components that take `authorId` prop. These need updating to use `contactId`. Story doesn't mention them.
Impact: Author portal analytics will break after migration.

### Implementation Clarity
Pass Rate: 2/3 (67%)

✓ PASS: Acceptance criteria are specific
Evidence: 7 ACs with detailed checkbox items (lines 13-71)

✓ PASS: Code examples provided
Evidence: TypeScript and SQL examples throughout Dev Notes section (lines 157-424)

⚠ PARTIAL: Portal authentication update vague
Evidence: Task 5 (lines 113-117) says "Update author portal login flow" but doesn't specify the exact changes needed to src/app/(portal)/portal/page.tsx. The page queries authors table directly (line 41-45).
Impact: Developer may miss portal page updates.

## Failed Items

### 1. Missing encryption handling for tax_id
**Category:** Critical - Data Security
**Recommendation:** Add explicit note that tax_id is stored encrypted with AES-256-GCM. The SQL migration should copy the encrypted value as-is (no decryption/re-encryption needed since format is unchanged). Add validation that encrypted values work after migration.

### 2. Migration SQL mapping bug
**Category:** Critical - Data Integrity
**Recommendation:** Replace the fragile JOIN-based mapping with a CTE that generates UUIDs upfront:
```sql
WITH author_uuids AS (
  SELECT id as author_id, gen_random_uuid() as contact_id FROM authors
)
INSERT INTO contacts (...)
SELECT au.contact_id, ... FROM authors a JOIN author_uuids au ON a.id = au.author_id;
INSERT INTO author_contact_mapping SELECT * FROM author_uuids;
```

### 3. Missing Drizzle schema column definitions
**Category:** Important - Implementation Clarity
**Recommendation:** Add explicit Drizzle column definitions for contact_id in each schema file:
```typescript
// In titles.ts
contact_id: uuid("contact_id").references(() => contacts.id),
```

### 4. Statements module updates not specified
**Category:** Critical - Regression Prevention
**Recommendation:** Add to File List:
- `src/modules/statements/queries.ts` - Update author_id filters to use contact_id
- `src/modules/statements/actions.ts` - Update author lookups to use contacts
- `src/modules/statements/types.ts` - Update AuthorIds to ContactIds
- `src/modules/statements/components/*.tsx` - Update authorId props

### 5. Portal analytics components not specified
**Category:** Important - Regression Prevention
**Recommendation:** Add to File List:
- `src/app/(portal)/portal/components/author-*.tsx` - Update authorId prop to contactId or keep as-is if querying via contact

### 6. Missing getDb() pattern usage
**Category:** Minor - Code Consistency
**Recommendation:** Update code examples to use `const db = await getDb()` pattern instead of importing db directly.

## Partial Items

### 1. Drizzle Kit workflow missing
**Recommendation:** Add task: "Generate Drizzle migration with `pnpm drizzle-kit generate:pg`" before running SQL.

### 2. Portal authentication update vague
**Recommendation:** Add specific code showing portal page update:
```typescript
// Before: Query authors table
const author = await db.query.authors.findFirst({
  where: and(eq(authors.portal_user_id, user.id), eq(authors.is_active, true)),
});

// After: Query contacts with author role
const contact = await db.query.contacts.findFirst({
  where: and(
    eq(contacts.portal_user_id, user.id),
    eq(contacts.status, 'active'),
  ),
  with: { roles: true },
});
const isAuthor = contact?.roles.some(r => r.role === 'author');
```

## Recommendations

### 1. Must Fix (Critical Failures)
1. Add encryption handling note for tax_id preservation
2. Fix migration SQL mapping to use upfront UUID generation
3. Add statements module to file list with specific files
4. Add portal analytics components to file list

### 2. Should Improve (Important Gaps)
1. Add explicit Drizzle column definitions for contact_id
2. Add specific portal page code update example
3. Add Drizzle Kit workflow commands

### 3. Consider (Minor Improvements)
1. Update code examples to use getDb() pattern
2. Add `src/modules/authors/types.ts` to file modification list
3. Add `src/modules/authors/schema.ts` to file modification list if Zod schemas need updating

## LLM Optimization Notes

The story is comprehensive but could be optimized:
- Migration SQL shown twice (lines 221-266 and 271-334) - consolidate to single correct version
- Some redundancy between Tasks and Dev Notes code examples
- File lists appear twice (lines 429-444 and 554-568) - consolidate

Overall, the story provides excellent coverage but needs the critical gaps addressed to prevent implementation failures.
