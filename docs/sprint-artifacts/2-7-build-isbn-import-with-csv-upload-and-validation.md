# Story 2.7: Build ISBN Import with CSV Upload and Validation

Status: done

## Story

As a publisher administrator,
I want to import ISBNs from a CSV file with validation,
So that I can efficiently add ISBN blocks to my inventory pool.

## Acceptance Criteria

1. Import page accessible at `/settings/isbn-import` route
   - Page renders within settings layout
   - Permission check enforces `MANAGE_SETTINGS` (owner, admin only)
   - Unauthorized users see 403 or redirect

2. File upload component accepts CSV files only
   - Max file size: 1MB
   - Max rows: 100 ISBNs per import
   - MIME type validation: text/csv
   - Drag-and-drop support
   - File selection via button

3. ISBN type selection required before import
   - Radio buttons: "Physical" or "Ebook"
   - Type applies to all ISBNs in the import batch
   - Default: none selected (must choose)

4. CSV parsing with preview display
   - Client-side preview using papaparse
   - Show first 5-10 rows in preview table
   - Display total row count
   - Handle single-column CSV (ISBN-13 values only)

5. Each ISBN validated with ISBN-13 checksum algorithm
   - Must be 13 digits starting with 978 or 979
   - Checksum digit (position 13) must validate per ISBN-13 formula
   - Accept with or without hyphens/spaces (normalize before validation)
   - Invalid format: show specific error message

6. Duplicate detection (within file and database)
   - Detect duplicates within the CSV file
   - Check against existing ISBNs in database (all tenants - global uniqueness)
   - Report all duplicates with row numbers
   - Duplicates block import (all-or-nothing)

7. Validation errors displayed inline with row context
   - Show row number for each error
   - Show the invalid ISBN value
   - Show specific error reason (format, checksum, duplicate)
   - Summary count: "X of Y ISBNs have errors"

8. Transaction ensures all-or-nothing import
   - If any ISBN fails validation: no ISBNs imported
   - If all valid: transaction INSERT all ISBNs atomically
   - All imported ISBNs get status='available'
   - Set tenant_id from current session

9. Success feedback and navigation
   - Toast notification: "Successfully imported X ISBNs"
   - Redirect to `/isbn-pool` on success
   - Show import summary before redirect

## Tasks / Subtasks

- [x] Task 1: Create ISBN import page route and layout (AC: 1)
  - [x] Create `src/app/(dashboard)/settings/isbn-import/page.tsx`
  - [x] Add permission check using `requirePermission('MANAGE_SETTINGS')`
  - [x] Create page header with title and description
  - [x] Add breadcrumb navigation (Settings > ISBN Import)

- [x] Task 2: Implement ISBN-13 checksum validation utility (AC: 5)
  - [x] Create `src/modules/isbn/utils.ts` with validation functions
  - [x] Implement `normalizeIsbn13(isbn: string): string` - strips hyphens/spaces
  - [x] Implement `validateIsbn13Checksum(isbn: string): boolean` - ISBN-13 checksum algorithm
  - [x] Implement `validateIsbn13(isbn: string): { valid: boolean; error?: string }` - full validation
  - [x] Write unit tests for checksum validation with known valid/invalid ISBNs

- [x] Task 3: Build CSV upload component (AC: 2, 3, 4)
  - [x] Create `src/modules/isbn/components/isbn-import-form.tsx`
  - [x] Add file input with drag-and-drop zone (using shadcn/ui)
  - [x] Add ISBN type radio group (Physical / Ebook)
  - [x] Implement file validation (size, type, row count)
  - [x] Integrate papaparse for CSV parsing
  - [x] Display preview table with first rows

- [x] Task 4: Implement client-side validation with error display (AC: 5, 6, 7)
  - [x] Validate each ISBN row using `validateIsbn13()`
  - [x] Detect duplicates within file
  - [x] Build error list with row numbers and reasons
  - [x] Display inline validation errors component
  - [x] Show summary: "X of Y ISBNs valid" or error count

- [x] Task 5: Create Server Action for ISBN import (AC: 6, 8)
  - [x] Create `importISBNs` action in `src/modules/isbn/actions.ts`
  - [x] Add permission check: `requirePermission('MANAGE_SETTINGS')`
  - [x] Server-side validation (re-validate all ISBNs)
  - [x] Query database for existing ISBNs (duplicate check)
  - [x] Use transaction for atomic bulk insert
  - [x] Return `ActionResult<ISBNImportResult>`

- [x] Task 6: Implement success handling and navigation (AC: 9)
  - [x] Display success toast with count
  - [x] Show import summary modal/card
  - [x] Implement redirect to `/isbn-pool`
  - [x] Handle edge cases (empty file, all duplicates)

- [x] Task 7: Write tests (AC: 1-9)
  - [x] Unit tests: ISBN-13 checksum validation (valid/invalid cases)
  - [x] Unit tests: CSV parsing and validation
  - [x] Integration tests: importISBNs Server Action
  - [x] E2E test: Full import flow (upload, validate, import, redirect)

## Dev Notes

### Relevant Architecture Patterns and Constraints

**Server Actions Pattern (from architecture.md):**
```typescript
"use server"
export async function importISBNs(data: FormData): Promise<ActionResult<ISBNImportResult>>
// Must check permission before any database operations
// Return structured ActionResult with success/error
```

**Permission Enforcement:**
- MANAGE_SETTINGS permission required (owner, admin roles only)
- Use `requirePermission()` from `src/lib/permissions.ts`

**Multi-Tenant Context:**
- Get tenant_id from session via `getCurrentTenantId()`
- All imported ISBNs scoped to current tenant

**ISBN-13 Checksum Algorithm:**
```typescript
// ISBN-13 checksum formula (per FR21)
// Sum = (d1*1 + d2*3 + d3*1 + d4*3 + ... + d12*3)
// Checksum = (10 - (Sum mod 10)) mod 10
// Must equal d13 (last digit)
function validateIsbn13Checksum(isbn: string): boolean {
  const digits = isbn.replace(/[-\s]/g, '');
  if (digits.length !== 13 || !/^\d+$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(digits[12]);
}
```

**CSV Format Expected:**
- Single column with ISBN-13 values
- Optional header row (detected automatically)
- Max 100 rows, 1MB file size

### Learnings from Previous Story

**From Story 2-6 (Create ISBN Pool Database Schema) - Status: Done:**

- **Schema Ready**: `src/db/schema/isbns.ts` - ISBN table with all required fields
- **Zod Schemas Available**: `src/modules/isbn/schema.ts` - Use `batchImportIsbnSchema` for validation
- **Types Available**: `src/modules/isbn/types.ts` - Use `ISBNImportResult` for action response
- **Format Validation**: `isbn13Schema` validates 978/979 prefix but NOT checksum - must add checksum validation
- **RLS Active**: ISBN queries automatically filtered by tenant_id
- **Global Uniqueness**: isbn_13 has global unique constraint (cross-tenant)

**Files to Reuse:**
- `src/modules/isbn/schema.ts` - Extend with checksum validation
- `src/modules/isbn/types.ts` - Use ISBNImportResult type
- `src/db/schema/isbns.ts` - Reference for NewISBN type

[Source: docs/sprint-artifacts/2-6-create-isbn-pool-database-schema-and-tracking.md#Dev-Agent-Record]

### Project Structure Notes

**New Files for Story 2.7:**
```
src/
├── app/
│   └── (dashboard)/
│       └── settings/
│           └── isbn-import/
│               └── page.tsx              # NEW: Import page route
├── modules/
│   └── isbn/
│       ├── actions.ts                    # NEW: importISBNs Server Action
│       ├── utils.ts                      # NEW: ISBN-13 validation utilities
│       └── components/
│           └── isbn-import-form.tsx      # NEW: Upload + preview component

tests/
├── unit/
│   └── isbn-validation.test.ts           # NEW: Checksum validation tests
├── integration/
│   └── isbn-import.test.ts               # NEW: Server Action tests
└── e2e/
    └── isbn-import.spec.ts               # NEW: E2E import flow test
```

**Dependencies:**
- papaparse (add if not present): `npm install papaparse @types/papaparse`
- shadcn/ui components: Button, Input, RadioGroup, Table, Toast, Card
- Existing: zod, react-hook-form, drizzle-orm

### Security Considerations

- Server-side re-validation required (never trust client)
- Rate limiting: Consider limiting imports per hour (future enhancement)
- File size enforced both client and server side
- SQL injection prevented via Drizzle parameterized queries

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-2.md#Story-2.7-ISBN-Import]
- [Source: docs/sprint-artifacts/tech-spec-epic-2.md#ISBN-Import-Flow]
- [Source: docs/sprint-artifacts/tech-spec-epic-2.md#AC2.7.1-7]
- [Source: src/modules/isbn/schema.ts] - Existing Zod schemas
- [Source: src/modules/isbn/types.ts] - ISBNImportResult type
- [ISBN-13 Checksum Algorithm](https://www.isbn-international.org/content/isbn-users-manual)

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/2-7-build-isbn-import-with-csv-upload-and-validation.context.xml

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Implemented ISBN-13 checksum validation per international standard algorithm
- Used papaparse for client-side CSV parsing with automatic header detection
- Server action uses atomic bulk INSERT for all-or-nothing guarantee
- Custom ImportISBNsResult type extends ActionResult to include error details on failure

### Completion Notes List

- All 9 acceptance criteria implemented and tested
- 55 total tests passing (40 unit + 15 integration)
- E2E test suite created for full import flow
- papaparse dependency added for CSV parsing
- Client-side validation provides immediate feedback before server submission
- Server-side re-validates all ISBNs (never trust client)
- Global uniqueness check across all tenants for ISBN deduplication

### File List

**New Files:**
- `src/app/(dashboard)/settings/isbn-import/page.tsx` - Import page route with permission check
- `src/modules/isbn/actions.ts` - importISBNs Server Action with validation
- `src/modules/isbn/utils.ts` - ISBN-13 validation utilities (normalize, checksum, validate)
- `src/modules/isbn/components/isbn-import-form.tsx` - CSV upload form with preview
- `tests/unit/isbn-validation.test.ts` - Unit tests for ISBN validation (40 tests)
- `tests/integration/isbn-import.test.ts` - Integration tests for Server Action (15 tests)
- `tests/e2e/isbn-import.spec.ts` - E2E tests for import flow

**Modified Files:**
- `package.json` - Added papaparse dependency
- `package-lock.json` - Updated lockfile

## Change Log

- 2025-11-24: Story 2.7 drafted by SM Agent (Bob) - 9 ACs, 7 tasks, ISBN CSV import with validation
- 2025-11-25: Story 2.7 implemented by Dev Agent (Amelia) - All tasks complete, 55 tests passing
- 2025-11-25: Senior Developer Review (AI) - APPROVE

---

## Senior Developer Review (AI)

### Review Metadata

- **Reviewer:** BMad
- **Date:** 2025-11-25
- **Outcome:** APPROVE
- **Story:** 2.7 - Build ISBN Import with CSV Upload and Validation

### Summary

This story implements a complete ISBN CSV import feature with excellent code quality, comprehensive validation, and thorough test coverage. All 9 acceptance criteria are fully implemented with proper evidence. All 7 tasks marked complete have been verified. The implementation follows established patterns from the architecture document and tech spec. No blocking issues found.

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| AC1 | Import page at `/settings/isbn-import` with permission check | IMPLEMENTED | `src/app/(dashboard)/settings/isbn-import/page.tsx:21-48` (page), `:23` (permission), `:28-34` (breadcrumb) |
| AC2 | CSV upload (1MB max, 100 rows, MIME validation, drag-drop) | IMPLEMENTED | `isbn-import-form.tsx:26` (size), `:28` (rows), `:80-92` (MIME), `:200-218` (drag-drop) |
| AC3 | ISBN type selection (Physical/Ebook) required | IMPLEMENTED | `isbn-import-form.tsx:286-319` (radio), `:65` (default null), `:313-317` (warning) |
| AC4 | CSV parsing with preview (papaparse, 5-10 rows) | IMPLEMENTED | `isbn-import-form.tsx:5,102-170` (parsing), `:442-478` (preview table) |
| AC5 | ISBN-13 checksum validation (978/979 prefix) | IMPLEMENTED | `utils.ts:44-63` (checksum), `:76-121` (full validation), `actions.ts:79-86` (server-side) |
| AC6 | Duplicate detection (file + database) | IMPLEMENTED | `utils.ts:128-152` (file), `isbn-import-form.tsx:139-153` (client), `actions.ts:106-133` (database) |
| AC7 | Inline validation errors with row context | IMPLEMENTED | `isbn-import-form.tsx:446-450` (row#), `:459-460` (value), `:471-473` (error), `:398-409` (summary) |
| AC8 | All-or-nothing transaction import | IMPLEMENTED | `actions.ts:92-104` (early return), `:147` (atomic INSERT), `:141` (status), `:138` (tenant_id) |
| AC9 | Success feedback and navigation | IMPLEMENTED | `isbn-import-form.tsx:257` (toast), `:258` (redirect), `:395-424` (summary card) |

**Summary:** 9 of 9 acceptance criteria fully implemented

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
|------|-----------|-------------|----------|
| Task 1: Create ISBN import page route | Complete [x] | VERIFIED | `page.tsx` created, permission check line 23, header lines 37-42, breadcrumb lines 28-34 |
| Task 2: ISBN-13 checksum validation utility | Complete [x] | VERIFIED | `utils.ts` created, normalizeIsbn13 line 27-29, validateIsbn13Checksum lines 44-63, validateIsbn13 lines 76-121, 40 unit tests |
| Task 3: Build CSV upload component | Complete [x] | VERIFIED | `isbn-import-form.tsx` created, drag-drop lines 330-382, radio lines 295-312, validation lines 80-92, papaparse lines 102-170 |
| Task 4: Client-side validation with error display | Complete [x] | VERIFIED | ISBN validation lines 125-136, duplicate detection lines 139-153, error display lines 453-474, summary lines 398-423 |
| Task 5: Server Action for ISBN import | Complete [x] | VERIFIED | `actions.ts` created, permission line 52, validation lines 66-90, DB duplicate check lines 106-133, bulk insert line 147 |
| Task 6: Success handling and navigation | Complete [x] | VERIFIED | Toast line 257, summary card lines 395-424, redirect line 258, edge cases lines 120-123 |
| Task 7: Write tests | Complete [x] | VERIFIED | Unit tests (40), integration tests (15), E2E tests created - total 55 tests passing |

**Summary:** 7 of 7 completed tasks verified, 0 questionable, 0 falsely marked complete

### Test Coverage and Gaps

**Existing Coverage:**
- Unit tests for ISBN validation: 40 tests covering normalize, checksum, full validation, duplicates
- Integration tests for Server Action: 15 tests covering permissions, validation, duplicates, all-or-nothing
- E2E tests for full import flow: Tests for page access, file upload, validation display, type selection

**Coverage Quality:** Excellent. Tests cover all ACs with specific scenarios for valid/invalid inputs.

**No significant gaps identified.**

### Architectural Alignment

**Tech Spec Compliance:**
- Follows Server Actions pattern per `architecture.md` (line 74)
- Uses `requirePermission(MANAGE_SETTINGS)` per tech spec
- Follows Zod validation pattern per architecture (line 76)
- Uses `ActionResult` response pattern (custom variant for error details)

**Architecture Violations:** None

### Security Notes

**Positive:**
- Server-side re-validation of all ISBNs (never trusts client) - `actions.ts:61-90`
- Permission check before any database operations - `actions.ts:52`
- Proper error handling without exposing internal details - `actions.ts:163-192`
- File size/type validation both client and server side

**Recommendations (Advisory):**
- Consider rate limiting for import endpoint in production (noted in code comments)
- Consider adding audit logging for ISBN imports

### Best-Practices and References

- ISBN-13 checksum algorithm correctly implemented per [ISBN International Manual](https://www.isbn-international.org/content/isbn-users-manual)
- papaparse used for client-side CSV parsing (well-maintained library)
- Follows React Server Component patterns
- Proper use of `"use server"` directive
- TypeScript types properly defined

### Action Items

**Code Changes Required:**
- None

**Advisory Notes:**
- Note: Consider adding rate limiting for production deployment (future enhancement)
- Note: Consider audit logging for import operations (future enhancement)
- Note: Pre-existing test failures in `tenant-settings.test.ts` and `users-actions.test.ts` require DATABASE_URL env var (not related to this story)
