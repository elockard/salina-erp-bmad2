# Story 19.1: Import Catalog via CSV

Status: done

## Story

As a **new publisher**,
I want **to import my existing catalog from CSV**,
so that **I don't have to enter titles manually**.

## Acceptance Criteria

1. **Given** I have a CSV file with title data
   **When** I upload the file
   **Then** I can map CSV columns to Salina fields

2. **And** system validates data before import

3. **And** validation errors shown per row with line numbers

4. **And** I can fix errors and re-validate

5. **And** import creates titles with metadata

## Tasks / Subtasks

- [x] **Task 1: Create CSV parser and column mapping types** (AC: 1)
  - [x] 1.1 Create `src/modules/import-export/parsers/csv-parser.ts` with PapaParse
  - [x] 1.2 Define `CsvParseResult` interface with rows, headers, errors
  - [x] 1.3 Create `ColumnMapping` type for field mappings
  - [x] 1.4 Define importable title fields list (title, subtitle, author_name, isbn, genre, publication_date, publication_status, word_count, asin)

- [x] **Task 2: Create import validation schema** (AC: 2, 3)
  - [x] 2.1 Create `src/modules/import-export/schema.ts` with Zod schemas
  - [x] 2.2 Create `csvTitleRowSchema` for row-level validation
  - [x] 2.3 Create `ImportValidationResult` type with row-level errors
  - [x] 2.4 Add author name matching using `ilike()` pattern from contacts/queries.ts
  - [x] 2.5 Add ISBN-13 format validation and checksum verification
  - [x] 2.6 Add ASIN format validation (10 chars, alphanumeric)

- [x] **Task 3: Build multi-step import wizard UI** (AC: 1, 3, 4)
  - [x] 3.1 Create `src/modules/import-export/components/csv-import-modal.tsx` following onix-import-modal.tsx pattern
  - [x] 3.2 Implement Step 1: File upload with drag-and-drop
  - [x] 3.3 Implement Step 2: Column mapping interface with dropdowns
  - [x] 3.4 Implement Step 3: Validation preview - adapt `import-preview-table.tsx` component
  - [x] 3.5 Implement Step 4: Confirmation and progress display
  - [x] 3.6 Add "Fix and Re-validate" button functionality
  - [x] 3.7 Add sample data preview (first 5 rows)

- [x] **Task 4: Create server actions for import** (AC: 2, 5)
  - [x] 4.1 Create `src/modules/import-export/actions.ts`
  - [x] 4.2 Implement `validateCsvImportAction` for pre-import validation
  - [x] 4.3 Implement `importTitlesFromCsvAction` with `adminDb.transaction()` pattern
  - [x] 4.4 Add author lookup using `ilike()` for case-insensitive name matching
  - [x] 4.5 Add transaction wrapping for all-or-nothing import
  - [x] 4.6 Add permission check (CREATE_AUTHORS_TITLES)

- [x] **Task 5: Create import tracking schema** (AC: 5)
  - [x] 5.1 Create `src/db/schema/csv-imports.ts` following `onix-imports.ts` pattern exactly
  - [x] 5.2 Add migration for `csv_imports` table with proper indexes
  - [x] 5.3 Include `created_title_ids` array for undo capability
  - [x] 5.4 Include `imported_by` user reference for audit trail

- [x] **Task 6: Add import page route** (AC: 1)
  - [x] 6.1 Create `src/app/(dashboard)/titles/import/page.tsx`
  - [x] 6.2 Add navigation link to import from titles list
  - [x] 6.3 Add breadcrumb navigation

- [x] **Task 7: Write tests** (AC: All)
  - [x] 7.1 Unit tests for CSV parser - follow patterns in `tests/unit/`
  - [x] 7.2 Unit tests for validation schema
  - [x] 7.3 Unit tests for author name matching with ilike
  - [x] 7.4 Integration test for full import flow

## Dev Notes

### FRs Implemented
- **FR170**: Publisher can import existing catalog via CSV with column mapping
- **FR171**: System validates imported data and displays row-level error details

### Architecture Compliance

**Module Location:** `src/modules/import-export/` (Phase 3 module per architecture.md)

**CRITICAL - Reusable Components (DO NOT REINVENT):**
| Component | Location | Reuse Strategy |
|-----------|----------|----------------|
| ImportPreviewTable | `src/modules/onix/components/import-preview-table.tsx` | Adapt for CSV validation display - has selection, badges, expandable rows |
| Multi-step Modal | `src/modules/onix/components/onix-import-modal.tsx` | Follow exact pattern: Upload→Preview→Importing→Complete |
| CSV Parser | `src/modules/isbn/components/isbn-import-form.tsx` | PapaParse usage, header detection |
| Import Schema | `src/db/schema/onix-imports.ts` | Follow exact table structure |

**File Structure per Architecture:**
```
src/modules/import-export/
├── components/
│   ├── csv-import-modal.tsx        # Multi-step modal (adapt onix-import-modal)
│   ├── column-mapper.tsx           # Column mapping interface
│   └── csv-validation-table.tsx    # Adapt import-preview-table.tsx
├── parsers/
│   └── csv-parser.ts               # PapaParse wrapper
├── actions.ts                      # Server Actions
├── queries.ts                      # Import history queries
├── schema.ts                       # Zod validation schemas
└── types.ts                        # TypeScript types
```

### Technical Requirements

**CSV Parsing:**
- Use `papaparse` library (already installed for ISBN import)
- Auto-detect delimiter (comma vs tab)
- Handle quoted fields with proper escaping
- Support UTF-8 encoding with BOM detection
- Max file size: 5MB (configurable)
- Max rows: 1000 (prevents timeout; for larger imports, use Inngest background job - see Story 19.4 pattern)

**Column Mapping UI:**
- Detect CSV headers automatically
- Provide dropdown for each Salina field
- Auto-map common headers (title → title, isbn → isbn, author → author_name)
- Required fields: title (highlight if unmapped)
- Show sample data for each column

**Validation Rules:**
| Field | Validation | Error Message |
|-------|------------|---------------|
| title | Required, max 500 chars | "Title is required" / "Title too long" |
| isbn | ISBN-13 format + checksum | "Invalid ISBN-13 format" |
| asin | 10 chars alphanumeric | "ASIN must be 10 alphanumeric characters" |
| publication_date | YYYY-MM-DD format | "Date must be YYYY-MM-DD format" |
| publication_status | draft/pending/published/out_of_print | "Invalid status" |
| word_count | Positive integer | "Word count must be positive number" |
| author_name | Must match existing contact | "Author not found: [name]" |

**Author Matching Pattern (from contacts/queries.ts:45-67):**
```typescript
import { ilike, or } from "drizzle-orm";

// Case-insensitive author lookup
const searchTerm = `%${authorName.trim()}%`;
const matches = await db
  .select()
  .from(contacts)
  .where(
    and(
      eq(contacts.tenant_id, tenantId),
      or(
        ilike(contacts.first_name, searchTerm),
        ilike(contacts.last_name, searchTerm),
        // Full name match
        ilike(sql`${contacts.first_name} || ' ' || ${contacts.last_name}`, searchTerm),
      ),
    ),
  );

// Filter to contacts with author role
const authors = matches.filter(c =>
  c.roles?.some(r => r.role === 'author')
);
```

**Database Schema (follow onix-imports.ts exactly):**
```typescript
// src/db/schema/csv-imports.ts
export const csvImportStatusValues = ["success", "partial", "failed"] as const;

export const csvImports = pgTable(
  "csv_imports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenant_id: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

    // Import metadata
    filename: text("filename").notNull(),
    import_type: text("import_type").notNull(), // 'titles', 'contacts', 'sales'
    total_rows: integer("total_rows").notNull(),

    // Result counts
    imported_count: integer("imported_count").notNull(),
    skipped_count: integer("skipped_count").notNull().default(0),
    updated_count: integer("updated_count").notNull().default(0),
    error_count: integer("error_count").notNull().default(0),

    // Status and errors
    status: text("status", { enum: csvImportStatusValues }).notNull(),
    error_message: text("error_message"),

    // Undo capability - store created IDs
    created_title_ids: uuid("created_title_ids").array(),

    // Detailed results as JSON
    result_details: jsonb("result_details").$type<ImportResultSummary>(),
    column_mappings: jsonb("column_mappings").$type<ColumnMapping[]>(),

    // Audit trail
    imported_by: uuid("imported_by").references(() => users.id),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completed_at: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdIdx: index("csv_imports_tenant_id_idx").on(table.tenant_id),
    createdAtIdx: index("csv_imports_created_at_idx").on(table.created_at),
    statusIdx: index("csv_imports_status_idx").on(table.status),
    // Composite index for tenant + date queries (common pattern)
    tenantCreatedIdx: index("csv_imports_tenant_created_idx").on(
      table.tenant_id,
      table.created_at,
    ),
  }),
);
```

**Transaction Pattern (from invoices/actions.ts):**
```typescript
const result = await adminDb.transaction(async (tx) => {
  // 1. Create import record with 'processing' status
  const [importRecord] = await tx.insert(csvImports).values({...}).returning();

  // 2. Bulk insert titles
  const createdTitles = await tx.insert(titles).values(validRows).returning();

  // 3. Update import record with results
  await tx.update(csvImports)
    .set({
      status: 'success',
      created_title_ids: createdTitles.map(t => t.id),
      completed_at: new Date(),
    })
    .where(eq(csvImports.id, importRecord.id));

  return { importRecord, createdTitles };
});
```

**Error Types (mirrors ImportResultSummary in onix-imports.ts):**
```typescript
interface ImportError {
  row: number;        // 1-indexed (matches Excel row numbers)
  field: string;      // Column/field that failed
  value: string;      // Original value
  message: string;    // Human-readable error
}

interface ImportResultSummary {
  imported: number;
  skipped: number;
  updated: number;
  errors: number;
  conflicts: number;
}
```

### Security Requirements
- Permission: `CREATE_AUTHORS_TITLES` required
- Tenant isolation: All titles created with current tenant_id
- ISBN uniqueness: Check global uniqueness before insert
- ASIN uniqueness: Check global uniqueness before insert
- Input sanitization: All text fields trimmed, XSS-safe

### UI/UX Pattern

**4-Step Wizard Flow (same as onix-import-modal.tsx):**
1. **Upload** - Drag-and-drop or file picker, validates file type/size
2. **Map Columns** - Match CSV columns to Salina fields
3. **Preview & Validate** - Use adapted ImportPreviewTable with error highlighting
4. **Import** - Progress bar, success/error summary

**Error Display (adapt import-preview-table.tsx):**
- DataTable with sortable columns: Row #, Field, Value, Error
- Selection checkboxes for skipping invalid rows
- Expandable rows for multiple errors per row
- Status badges: Valid (green), Errors (red), Warnings (yellow)
- Filter by field type
- Export errors to CSV using ar-export-buttons.tsx pattern:
```typescript
// From src/modules/reports/components/ar-export-buttons.tsx
const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
const url = URL.createObjectURL(blob);
// ... download link
```

### Project Structure Notes

**Routes:**
- Import wizard: `/titles/import`
- Import history: `/titles/import/history` (optional, future)

**Navigation:**
- Add "Import CSV" button to `/titles` page header
- Breadcrumb: Titles > Import

### Library/Framework Requirements

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| papaparse | ^5.x | CSV parsing | ✅ Installed |
| zod | ^3.25+ | Schema validation | ✅ Installed |
| @tanstack/react-table | ^8.21+ | Validation preview table | ✅ Installed |

### Testing Requirements

**Unit Tests (`tests/unit/csv-import.test.ts`):**
- CSV parser: valid files, quoted fields, tab-delimited, oversized rejection
- Validation: required fields, ISBN-13 checksum, ASIN format, date format
- Author matching: case-insensitive, whitespace trimming, no-match handling

**Integration Tests (`tests/integration/csv-import.test.ts`):**
- Full import flow with valid CSV
- Validation error handling
- Transaction rollback on DB error
- Tenant isolation enforcement
- Permission requirements

### References

- [Source: docs/epics.md#Epic-19] - Story requirements and acceptance criteria
- [Source: docs/architecture.md#Project-Structure] - import-export module location (lines 311-323)
- [Source: src/modules/onix/components/import-preview-table.tsx] - **REUSE** validation table component
- [Source: src/modules/onix/components/onix-import-modal.tsx] - **FOLLOW** multi-step wizard pattern
- [Source: src/db/schema/onix-imports.ts] - **FOLLOW** import tracking schema pattern
- [Source: src/modules/isbn/components/isbn-import-form.tsx] - PapaParse CSV parsing
- [Source: src/modules/contacts/queries.ts:45-67] - ilike() author lookup pattern
- [Source: src/modules/invoices/actions.ts] - Transaction pattern for bulk inserts
- [Source: src/modules/reports/components/ar-export-buttons.tsx] - CSV export/download pattern
- [Source: src/db/schema/titles.ts] - Title table schema and fields
- [Source: src/modules/titles/schema.ts] - Zod validation schemas for titles

### Previous Story Learnings

**From Story 14.5 (ONIX Import):**
- ImportPreviewTable component is well-tested and handles complex validation display
- Multi-step modal pattern with progress tracking works well for imports
- Store created IDs in array for potential undo/audit capability

**From Epic 17 (Amazon Integration):**
- Use `parseDelimitedLine()` helper for proper field escaping
- Track line numbers starting at 1 for user-friendly errors
- Store original raw line in error details for debugging

**From Story 2.7 (ISBN Import):**
- PapaParse `complete` callback for async handling
- Header detection: check if first row looks like header vs data
- Client-side validation before server submission

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

- Story 19-1 implementation was completed as part of the broader Epic 19 development
- Stories 19.2-19.5 were developed first, building the infrastructure that Story 19-1 defined
- All functionality verified present: CSV parser, validation schema, multi-step wizard, server actions, import tracking, page route, and comprehensive tests
- PapaParse used for CSV parsing with auto-detection of delimiters and headers
- Zod validation schemas for all importable fields including BISAC codes (added in Story 19.5)
- Multi-step wizard follows established onix-import-modal.tsx pattern

### File List

- [x] `src/modules/import-export/types.ts`
- [x] `src/modules/import-export/schema.ts`
- [x] `src/modules/import-export/parsers/csv-parser.ts`
- [x] `src/modules/import-export/actions.ts`
- [x] `src/modules/import-export/queries.ts`
- [x] `src/modules/import-export/components/csv-import-modal.tsx`
- [x] `src/modules/import-export/components/column-mapper.tsx`
- [x] `src/modules/import-export/components/csv-validation-table.tsx`
- [x] `src/modules/import-export/components/csv-import-page.tsx`
- [x] `src/db/schema/csv-imports.ts`
- [x] `src/db/schema/index.ts` (add csv-imports export)
- [x] `src/app/(dashboard)/titles/import/page.tsx`
- [x] `drizzle/migrations/XXXX_add_csv_imports.sql`
- [x] `tests/unit/csv-parser.test.ts`
- [x] `tests/unit/csv-import-schema.test.ts`
- [x] `tests/integration/csv-import.test.ts`
