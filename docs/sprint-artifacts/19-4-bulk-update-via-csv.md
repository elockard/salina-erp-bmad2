# Story 19.4: Bulk Update via CSV

Status: done

## Story

As a **publisher**,
I want **to update multiple titles via CSV**,
So that **I can make batch changes efficiently**.

## Acceptance Criteria

1. **Given** I have a CSV with updates
   **When** I upload the file
   **Then** system matches records by ISBN

2. **And** I can preview changes before applying

3. **And** only changed fields are updated

4. **And** update history is logged

5. **And** errors shown for invalid data

## Tasks / Subtasks

- [x] **Task 1: Add update mode types and detection** (AC: 1)
  - [x] 1.1 Add `UpdateWizardStep` type to `src/modules/import-export/types.ts`
  - [x] 1.2 Add `UpdateMode` type: "create" | "update" | "upsert"
  - [x] 1.3 Add `TitleDiff` interface for field-level change tracking
  - [x] 1.4 Add `BulkUpdateResult` interface for tracking update results
  - [x] 1.5 Add `UpdateRowMatch` interface for ISBN-to-title matching

- [x] **Task 2: Validate and match CSV data** (AC: 1, 2, 3, 5)
  - [x] 2.1 Run client-side validation using existing `validateCsvData()` before matching
  - [x] 2.2 Create `src/modules/import-export/matchers/isbn-matcher.ts`
  - [x] 2.3 Implement `matchTitlesByIsbn()` - looks up existing titles by ISBN
  - [x] 2.4 Implement `computeTitleDiff()` - compares CSV row to existing title
  - [x] 2.5 Implement `computeBulkDiff()` - batch diff computation for all matched rows
  - [x] 2.6 Handle partial matches (ISBN found vs not found)
  - [x] 2.7 Track rows without ISBN as validation errors (ISBN required for updates)
  - [x] 2.8 Return `{ matched: TitleMatch[], unmatched: string[], noIsbn: string[], errors: [] }`

- [x] **Task 3: Create diff preview table component** (AC: 2)
  - [x] 3.1 Create `src/modules/import-export/components/csv-update-preview.tsx`
  - [x] 3.2 Display side-by-side old value / new value for each changed field
  - [x] 3.3 Highlight changed fields with visual diff (green for additions, yellow for changes)
  - [x] 3.4 Show warning icon for Title field changes (significant change)
  - [x] 3.5 Show "No changes" badge for rows where values match
  - [x] 3.6 Show "Not found" badge for ISBNs with no match (with option to create)
  - [x] 3.7 Show "Missing ISBN" error badge for rows without ISBN field
  - [x] 3.8 Add row selection for selective updates
  - [x] 3.9 Show summary: "X titles will be updated, Y fields changed, Z errors"

- [x] **Task 4: Create bulk update modal** (AC: 1, 2, 5)
  - [x] 4.1 Create `src/modules/import-export/components/csv-update-modal.tsx`
  - [x] 4.2 Implement Step 1: File upload (reuse CsvImportModal pattern)
  - [x] 4.3 Implement Step 2: Column mapping (reuse ColumnMapper)
  - [x] 4.4 Implement Step 3: Diff preview with CsvUpdatePreview
  - [x] 4.5 Implement Step 4: Update progress with rollback on error
  - [x] 4.6 Implement Step 5: Success/error summary
  - [x] 4.7 Add toggle for "Create new titles for unmatched ISBNs" (upsert mode)

- [x] **Task 5: Create bulk update server action** (AC: 3, 4)
  - [x] 5.1 Add `bulkUpdateTitlesFromCsvAction()` to `src/modules/import-export/actions.ts`
  - [x] 5.2 Implement transaction wrapper for atomic updates
  - [x] 5.3 Update only fields that have changed (selective update)
  - [x] 5.4 Use Drizzle `set()` with dynamic field mapping
  - [x] 5.5 Track `updated_count` in csv_imports record
  - [x] 5.6 Add permission check (CREATE_AUTHORS_TITLES - same as title updates)

- [x] **Task 6: Add audit logging for updates** (AC: 4)
  - [x] 6.1 Extend csv_imports schema (already has: updated_count, created_title_ids, imported_by)
  - [x] 6.2 ADD `import_mode` field: "create" | "update" | "upsert" (NEW)
  - [x] 6.3 ADD `updated_title_ids` uuid array for update audit trail (NEW - separate from created_title_ids)
  - [x] 6.4 ADD `update_details` JSONB for field-level change tracking (NEW)
  - [x] 6.5 Create migration: `drizzle/migrations/0006_lethal_lady_bullseye.sql`
  - [x] 6.6 Update schema relations if needed (not needed - no new relations)

- [x] **Task 7: Add update UI entry points** (AC: 1)
  - [x] 7.1 Add "Update via CSV" button to Titles page header
  - [x] 7.2 Add dropdown menu with "Import New" and "Update Existing" options
  - [x] 7.3 Wire up CsvUpdateModal to Titles page

- [x] **Task 8: Write tests** (AC: All)
  - [x] 8.1 Unit test ISBN matching - exact match, format normalization
  - [x] 8.2 Unit test diff computation - changed/unchanged/null handling
  - [x] 8.3 Unit test selective update - only changed fields in SQL
  - [ ] 8.4 Integration test full update flow (blocked by jsdom env issue)
  - [ ] 8.5 Integration test tenant isolation (blocked by jsdom env issue)
  - [ ] 8.6 Integration test error handling and rollback (blocked by jsdom env issue)

**Note:** Test file created at `tests/unit/isbn-matcher.test.ts`. Integration tests blocked by pre-existing jsdom dependency issue in test environment.

## Dev Notes

### FRs Implemented
- **FR174**: Publisher can bulk update title metadata via CSV upload

### Architecture Compliance

**Module Location:** `src/modules/import-export/` (Phase 3 module per architecture.md)

**CRITICAL - Reusable Components (DO NOT REINVENT):**
| Component | Location | Reuse Strategy |
|-----------|----------|----------------|
| CsvImportModal | `src/modules/import-export/components/csv-import-modal.tsx` | **FOLLOW** modal pattern, steps, state management |
| ColumnMapper | `src/modules/import-export/components/column-mapper.tsx` | **REUSE** directly for column mapping step |
| CsvParser | `src/modules/import-export/parsers/csv-parser.ts` | **REUSE** directly for file parsing |
| Import Types | `src/modules/import-export/types.ts` | **EXTEND** with update-specific types |
| Actions Pattern | `src/modules/import-export/actions.ts` | **FOLLOW** transaction pattern, error handling |
| csv_imports Schema | `src/db/schema/csv-imports.ts` | **EXTEND** with import_mode and update_details |

**File Structure:**
```
src/modules/import-export/
├── matchers/
│   └── isbn-matcher.ts            # NEW - ISBN matching and diff logic
├── components/
│   ├── csv-update-modal.tsx       # NEW - Bulk update wizard modal
│   ├── csv-update-preview.tsx     # NEW - Diff preview table
│   ├── csv-import-modal.tsx       # EXISTING - Reference pattern
│   └── index.ts                   # MODIFY - Export new components
├── actions.ts                     # MODIFY - Add bulkUpdateTitlesFromCsvAction
├── types.ts                       # MODIFY - Add update types
└── index.ts                       # MODIFY - Export new functions

src/db/schema/
└── csv-imports.ts                 # MODIFY - Add import_mode, update_details

src/modules/titles/components/
└── titles-split-view.tsx          # MODIFY - Add Update dropdown option
```

### Technical Requirements

**ISBN Matching Logic:**
```typescript
// src/modules/import-export/matchers/isbn-matcher.ts

import { and, eq, inArray } from "drizzle-orm";
import { titles } from "@/db/schema/titles";
import { getDb } from "@/lib/auth";

interface TitleMatch {
  isbn: string;
  title_id: string;
  existingTitle: {
    title: string;
    subtitle: string | null;
    genre: string | null;
    publication_date: string | null;
    publication_status: string;
    word_count: number | null;
    asin: string | null;
  };
  csvRow: ValidatedTitleRow;
  diff: TitleDiff;
  hasChanges: boolean;
}

interface MatchResult {
  matched: TitleMatch[];
  unmatched: string[];  // ISBNs not found in database
  errors: ImportRowError[];
}

/**
 * Match CSV rows to existing titles by ISBN
 * - Normalize ISBNs (remove hyphens, whitespace)
 * - Return matched titles with diff preview
 */
export async function matchTitlesByIsbn(
  db: DbClient,
  tenantId: string,
  rows: ValidatedTitleRow[],
): Promise<MatchResult> {
  // Extract ISBNs from rows
  const isbns = rows
    .map(r => r.data.isbn)
    .filter((isbn): isbn is string => !!isbn)
    .map(normalizeIsbn);

  // Look up existing titles
  const existingTitles = await db
    .select()
    .from(titles)
    .where(and(
      eq(titles.tenant_id, tenantId),
      inArray(titles.isbn, isbns),
    ));

  // Build ISBN -> title map
  const titleMap = new Map<string, typeof existingTitles[0]>();
  for (const title of existingTitles) {
    if (title.isbn) {
      titleMap.set(normalizeIsbn(title.isbn), title);
    }
  }

  // Match rows to titles
  const matched: TitleMatch[] = [];
  const unmatched: string[] = [];

  for (const row of rows) {
    if (!row.data.isbn) continue;

    const normalizedIsbn = normalizeIsbn(row.data.isbn);
    const existingTitle = titleMap.get(normalizedIsbn);

    if (existingTitle) {
      const diff = computeTitleDiff(existingTitle, row);
      matched.push({
        isbn: row.data.isbn,
        title_id: existingTitle.id,
        existingTitle: {
          title: existingTitle.title,
          subtitle: existingTitle.subtitle,
          genre: existingTitle.genre,
          publication_date: existingTitle.publication_date,
          publication_status: existingTitle.publication_status,
          word_count: existingTitle.word_count,
          asin: existingTitle.asin,
        },
        csvRow: row,
        diff,
        hasChanges: diff.changedFields.length > 0,
      });
    } else {
      unmatched.push(row.data.isbn);
    }
  }

  return { matched, unmatched, errors: [] };
}

/**
 * Normalize ISBN for matching
 * Removes hyphens, spaces, converts to uppercase
 */
function normalizeIsbn(isbn: string): string {
  return isbn.replace(/[-\s]/g, "").toUpperCase();
}
```

**Diff Computation:**
```typescript
interface FieldChange {
  field: string;
  oldValue: string | number | null;
  newValue: string | number | null;
}

interface TitleDiff {
  changedFields: FieldChange[];
  unchangedFields: string[];
  totalFields: number;
}

/**
 * Compute diff between existing title and CSV row
 * Only includes fields that are mapped in CSV
 */
function computeTitleDiff(
  existingTitle: ExistingTitle,
  csvRow: ValidatedTitleRow,
): TitleDiff {
  const changedFields: FieldChange[] = [];
  const unchangedFields: string[] = [];

  const fieldMappings: Array<{
    field: keyof ValidatedTitleRow["data"];
    dbField: keyof ExistingTitle;
    label: string;
  }> = [
    { field: "title", dbField: "title", label: "Title" },
    { field: "subtitle", dbField: "subtitle", label: "Subtitle" },
    { field: "genre", dbField: "genre", label: "Genre" },
    { field: "publication_date", dbField: "publication_date", label: "Publication Date" },
    { field: "publication_status", dbField: "publication_status", label: "Status" },
    { field: "word_count", dbField: "word_count", label: "Word Count" },
    { field: "asin", dbField: "asin", label: "ASIN" },
  ];

  for (const { field, dbField, label } of fieldMappings) {
    const newValue = csvRow.data[field];
    const oldValue = existingTitle[dbField];

    // Skip if field not in CSV (undefined)
    if (newValue === undefined) continue;

    // Compare values (handle null equivalence)
    const oldStr = oldValue?.toString() ?? "";
    const newStr = newValue?.toString() ?? "";

    if (oldStr !== newStr) {
      changedFields.push({
        field: label,
        oldValue,
        newValue: newValue ?? null,
      });
    } else {
      unchangedFields.push(label);
    }
  }

  return {
    changedFields,
    unchangedFields,
    totalFields: changedFields.length + unchangedFields.length,
  };
}
```

**Selective Update Pattern:**
```typescript
// Only update fields that have changed
// DO NOT update unchanged fields (preserves data integrity)

async function updateTitle(
  tx: Transaction,
  titleId: string,
  diff: TitleDiff,
  csvRow: ValidatedTitleRow,
): Promise<void> {
  // Build update object with only changed fields
  const updateData: Partial<TitleInsert> = {};

  for (const change of diff.changedFields) {
    switch (change.field) {
      case "Title":
        updateData.title = csvRow.data.title;
        break;
      case "Subtitle":
        updateData.subtitle = csvRow.data.subtitle || null;
        break;
      case "Genre":
        updateData.genre = csvRow.data.genre || null;
        break;
      case "Publication Date":
        updateData.publication_date = csvRow.data.publication_date || null;
        break;
      case "Status":
        updateData.publication_status = csvRow.data.publication_status;
        break;
      case "Word Count":
        updateData.word_count = csvRow.data.word_count || null;
        break;
      case "ASIN":
        updateData.asin = csvRow.data.asin || null;
        break;
    }
  }

  // Only update if there are changes
  if (Object.keys(updateData).length > 0) {
    updateData.updated_at = new Date();

    await tx
      .update(titles)
      .set(updateData)
      .where(eq(titles.id, titleId));
  }
}
```

**Extended csv_imports Schema:**
```typescript
// Add to src/db/schema/csv-imports.ts

// Add import_mode enum
export const csvImportModeValues = ["create", "update", "upsert"] as const;

// Extend schema with new fields
export const csvImports = pgTable("csv_imports", {
  // ... existing fields ...

  // NEW: Import mode
  import_mode: text("import_mode", { enum: csvImportModeValues })
    .notNull()
    .default("create"),

  // NEW: Updated title IDs (for updates/upserts)
  updated_title_ids: uuid("updated_title_ids").array(),

  // NEW: Update details for audit trail
  update_details: jsonb("update_details").$type<UpdateDetails>(),
});

// Types for update details
interface UpdateDetails {
  updates: Array<{
    title_id: string;
    isbn: string;
    changes: Array<{
      field: string;
      oldValue: string | number | null;
      newValue: string | number | null;
    }>;
  }>;
  totalFieldsChanged: number;
}
```

**Server Action Pattern:**
```typescript
// src/modules/import-export/actions.ts

interface BulkUpdateInput {
  filename: string;
  columnMappings: ColumnMapping[];
  updates: TitleMatch[];  // Only matches with hasChanges: true
  createUnmatched: boolean;  // Upsert mode
  unmatchedRows?: ValidatedTitleRow[];  // Rows to create if createUnmatched
}

interface BulkUpdateResult {
  success: boolean;
  updatedCount: number;
  createdCount: number;
  skippedCount: number;
  errors: ImportRowError[];
  importId: string;
  updatedTitleIds: string[];
  createdTitleIds: string[];
}

export async function bulkUpdateTitlesFromCsvAction(
  input: BulkUpdateInput,
): Promise<BulkUpdateResult> {
  await requirePermission(CREATE_AUTHORS_TITLES);
  const tenantId = await getCurrentTenantId();
  const user = await getCurrentUser();
  const db = await getDb();

  const updatedTitleIds: string[] = [];
  const createdTitleIds: string[] = [];
  const updateDetails: UpdateDetails = { updates: [], totalFieldsChanged: 0 };

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Create import tracking record
      const [importRecord] = await tx.insert(csvImports).values({
        tenant_id: tenantId,
        filename: input.filename,
        import_type: "titles",
        import_mode: input.createUnmatched ? "upsert" : "update",
        total_rows: input.updates.length + (input.unmatchedRows?.length || 0),
        imported_count: 0,
        updated_count: 0,
        status: "success",
        imported_by: user?.id,
        column_mappings: input.columnMappings,
      }).returning();

      // 2. Apply updates
      for (const match of input.updates) {
        await updateTitle(tx, match.title_id, match.diff, match.csvRow);
        updatedTitleIds.push(match.title_id);

        updateDetails.updates.push({
          title_id: match.title_id,
          isbn: match.isbn,
          changes: match.diff.changedFields,
        });
        updateDetails.totalFieldsChanged += match.diff.changedFields.length;
      }

      // 3. Create new titles if upsert mode
      if (input.createUnmatched && input.unmatchedRows?.length) {
        const created = await tx.insert(titles)
          .values(input.unmatchedRows.map(r => ({
            tenant_id: tenantId,
            title: r.data.title,
            subtitle: r.data.subtitle || null,
            isbn: r.data.isbn || null,
            genre: r.data.genre || null,
            publication_date: r.data.publication_date || null,
            publication_status: r.data.publication_status || "draft",
            word_count: r.data.word_count || null,
            asin: r.data.asin || null,
          })))
          .returning({ id: titles.id });

        createdTitleIds.push(...created.map(t => t.id));
      }

      // 4. Update import record with results
      await tx.update(csvImports)
        .set({
          updated_count: updatedTitleIds.length,
          imported_count: createdTitleIds.length,
          updated_title_ids: updatedTitleIds,
          created_title_ids: createdTitleIds,
          update_details: updateDetails,
          completed_at: new Date(),
        })
        .where(eq(csvImports.id, importRecord.id));

      return { importId: importRecord.id };
    });

    return {
      success: true,
      updatedCount: updatedTitleIds.length,
      createdCount: createdTitleIds.length,
      skippedCount: 0,
      errors: [],
      importId: result.importId,
      updatedTitleIds,
      createdTitleIds,
    };
  } catch (error) {
    console.error("Bulk update error:", error);
    return {
      success: false,
      updatedCount: 0,
      createdCount: 0,
      skippedCount: input.updates.length,
      errors: [{
        row: 0,
        field: "",
        value: "",
        message: error instanceof Error ? error.message : "Update failed",
      }],
      importId: "",
      updatedTitleIds: [],
      createdTitleIds: [],
    };
  }
}
```

### Security Requirements

- **Permission**: `CREATE_AUTHORS_TITLES` required for bulk updates (same as single title updates)
- **Tenant Isolation**: All updates filtered by tenant_id in WHERE clause
- **ISBN Uniqueness**: Validate ISBNs are unique within tenant before update
- **Audit Trail**: All updates logged with user, timestamp, field changes
- **Transaction Safety**: Full rollback on any error
- **Large Dataset Protection**: Consider Inngest background processing for >1000 rows (matches export threshold)

### UI/UX Pattern

**Update Modal Flow (5-Step Wizard):**
1. **Upload** - Same as import, drag-and-drop CSV
2. **Map Columns** - Same as import, reuse ColumnMapper
3. **Match & Preview** - NEW: Show ISBN matching results + diff preview
4. **Update** - Progress bar, atomic transaction
5. **Complete** - Success summary with undo option

**Diff Preview Table:**
```
┌────────────────────────────────────────────────────────────────┐
│ Bulk Update Preview                                             │
├────────────────────────────────────────────────────────────────┤
│ ☑ ISBN: 978-0-7432-7356-5                        [3 changes]   │
│   ┌───────────────────┬────────────────┬────────────────┐      │
│   │ Field             │ Current Value  │ New Value      │      │
│   ├───────────────────┼────────────────┼────────────────┤      │
│   │ ⚠ Title           │ The Gatsby     │ The Great...   │ DIFF │
│   │ Status            │ draft          │ published      │ DIFF │
│   │ Word Count        │ 45000          │ 47094          │ DIFF │
│   └───────────────────┴────────────────┴────────────────┘      │
│   ⚠ Title field change - verify this is intentional            │
├────────────────────────────────────────────────────────────────┤
│ ☑ ISBN: 978-1-234-56789-0                        [No changes]  │
│   All fields match - no update needed                          │
├────────────────────────────────────────────────────────────────┤
│ ☐ ISBN: 978-9-999-99999-9                        [Not found]   │
│   ⚠ Title not found in catalog                                 │
│   □ Create new title with this data                            │
├────────────────────────────────────────────────────────────────┤
│ ✗ Row 5: "My New Book"                          [Missing ISBN] │
│   ❌ ISBN required for updates - cannot match to existing title │
└────────────────────────────────────────────────────────────────┘

Summary: 2 titles will be updated, 5 total fields changed
         1 ISBN not found (check box to create)
         1 row skipped (missing ISBN)

[Cancel]                           [Update Selected Titles]
```

**Success Summary:**
```
┌────────────────────────────────────────────────────────────────┐
│ ✅ Bulk Update Complete                                         │
├────────────────────────────────────────────────────────────────┤
│ Updated: 15 titles                                              │
│ Created: 2 new titles (upsert mode)                            │
│ Skipped: 3 titles (no changes)                                 │
│ Total fields changed: 42                                       │
│                                                                │
│ Import ID: abc-123-def for audit trail                         │
└────────────────────────────────────────────────────────────────┘
                                                    [Done]
```

### Project Structure Notes

**Routes:**
- Update modal triggered from Titles page (no dedicated route needed)
- Future: `/titles/import/history` for import/update history

**Navigation:**
- Add dropdown to Titles page: "Import ▼" → "Import New Titles" | "Update Existing Titles"
- Both options open respective modals

### Library/Framework Requirements

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| papaparse | ^5.x | CSV parsing | ✅ Installed |
| zod | ^3.25+ | Schema validation | ✅ Installed |
| @tanstack/react-table | ^8.21+ | Diff preview table | ✅ Installed |
| date-fns | ^4.1+ | Date formatting | ✅ Installed |

No new dependencies required.

### Testing Requirements

**Unit Tests (`tests/unit/csv-bulk-update.test.ts`):**
```typescript
describe("ISBN Matcher", () => {
  it("normalizes ISBN formats (with/without hyphens)", () => {
    expect(normalizeIsbn("978-0-7432-7356-5")).toBe("9780743273565");
    expect(normalizeIsbn("9780743273565")).toBe("9780743273565");
  });

  it("matches titles by normalized ISBN", async () => {
    // Setup: Create title with ISBN "978-0-7432-7356-5"
    // Act: Match with "9780743273565" (no hyphens)
    // Assert: Match found
  });

  it("returns unmatched for ISBNs not in database", async () => {
    // Setup: Empty database
    // Act: Try to match ISBN
    // Assert: Returned in unmatched array
  });
});

describe("Diff Computation", () => {
  it("detects changed fields correctly", () => {
    const existing = { title: "Old Title", genre: "Fiction" };
    const csvRow = { data: { title: "New Title", genre: "Fiction" } };
    const diff = computeTitleDiff(existing, csvRow);

    expect(diff.changedFields).toHaveLength(1);
    expect(diff.changedFields[0].field).toBe("Title");
    expect(diff.unchangedFields).toContain("Genre");
  });

  it("handles null values correctly", () => {
    const existing = { subtitle: null };
    const csvRow = { data: { subtitle: "New Subtitle" } };
    const diff = computeTitleDiff(existing, csvRow);

    expect(diff.changedFields[0].oldValue).toBeNull();
    expect(diff.changedFields[0].newValue).toBe("New Subtitle");
  });

  it("treats empty string and null as equivalent", () => {
    const existing = { subtitle: null };
    const csvRow = { data: { subtitle: "" } };
    const diff = computeTitleDiff(existing, csvRow);

    expect(diff.changedFields).toHaveLength(0);
  });
});

describe("Selective Update", () => {
  it("only updates changed fields in SQL", async () => {
    // Verify UPDATE statement only includes changed columns
    // Not all columns in the row
  });

  it("always updates updated_at timestamp", async () => {
    // Verify updated_at is included in every update
  });
});
```

**Integration Tests (`tests/integration/csv-bulk-update.test.ts`):**
```typescript
describe("CSV Bulk Update Flow", () => {
  it("updates titles via CSV with diff preview", async () => {
    // Setup: Create 5 titles
    // Act: Upload CSV with changes to 3 titles
    // Assert: 3 titles updated, 2 unchanged
  });

  it("rolls back on error", async () => {
    // Setup: Create titles, mock DB error on 3rd update
    // Act: Attempt bulk update
    // Assert: All updates rolled back
  });

  it("logs update details for audit", async () => {
    // Act: Perform bulk update
    // Assert: csv_imports record has update_details with field changes
  });

  it("respects tenant isolation", async () => {
    // Setup: Title in tenant A with same ISBN as title in tenant B
    // Act: Update as tenant A
    // Assert: Only tenant A title updated
  });

  it("handles upsert mode correctly", async () => {
    // Setup: 2 existing titles, 1 new ISBN in CSV
    // Act: Bulk update with createUnmatched: true
    // Assert: 2 updated, 1 created
  });
});
```

### References

- [Source: docs/epics.md#Story-19.4] - Story requirements and acceptance criteria
- [Source: src/modules/import-export/components/csv-import-modal.tsx] - **FOLLOW** modal pattern
- [Source: src/modules/import-export/components/column-mapper.tsx] - **REUSE** column mapping
- [Source: src/modules/import-export/parsers/csv-parser.ts] - **REUSE** CSV parsing
- [Source: src/modules/import-export/types.ts] - **EXTEND** with update types
- [Source: src/modules/import-export/actions.ts] - **FOLLOW** transaction pattern
- [Source: src/db/schema/csv-imports.ts] - **EXTEND** with import_mode
- [Source: src/db/schema/titles.ts] - Title table schema for updates

### Previous Story Learnings

**From Story 19.1 (Import Catalog via CSV):**
- CsvImportModal pattern is well-structured with clear step progression
- ColumnMapper component handles all column mapping UI efficiently
- Import tracking via csv_imports table provides good audit trail
- Transaction wrapper ensures atomicity - essential for bulk operations

**From Story 19.3 (Export Catalog to CSV):**
- UTF-8 BOM pattern works well for Excel compatibility (not needed for update but good pattern)
- Row count thresholds (1000 for sync/async) may apply to updates too
- Actions pattern with consistent error handling is reliable

**From Story 17.3 (Import Amazon Sales):**
- ISBN matching requires normalization (remove hyphens)
- Batch operations should use transactions
- Track line numbers for user-friendly errors

**From Story 14.5 (ONIX Import):**
- ImportPreviewTable pattern for showing validation/diff results
- Selection checkboxes allow user control over what gets processed
- Status badges (Valid/Error/Warning) provide clear visual feedback

**Key Implementation Notes:**
1. **ISBN Normalization is CRITICAL** - Always normalize ISBNs (remove hyphens/spaces) before matching
2. **ISBN Required for Updates** - Rows without ISBN cannot be matched; show as validation errors
3. **Selective Updates Only** - Never update unchanged fields (prevents accidental data loss)
4. **Audit Trail Required** - Store field-level changes in update_details for compliance
5. **Transaction Required** - All updates must be atomic (all succeed or all rollback)
6. **Reuse CsvImportModal Pattern** - Follow the same 5-step wizard structure
7. **Diff Preview is Essential** - Users must see exactly what will change before confirming
8. **Title Field Warning** - Show warning when title text changes (significant field)
9. **Handle "No Changes" Rows** - Skip rows where values match (don't update updated_at unnecessarily)
10. **Upsert Mode Optional** - Let user decide if unmatched ISBNs should create new titles
11. **Permission: CREATE_AUTHORS_TITLES** - Same permission used for title create/update operations

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Completion Notes List

### File List

- [ ] `src/modules/import-export/types.ts` - MODIFY (add update types)
- [ ] `src/modules/import-export/matchers/isbn-matcher.ts` - NEW
- [ ] `src/modules/import-export/components/csv-update-modal.tsx` - NEW
- [ ] `src/modules/import-export/components/csv-update-preview.tsx` - NEW
- [ ] `src/modules/import-export/components/index.ts` - MODIFY (export new components)
- [ ] `src/modules/import-export/actions.ts` - MODIFY (add bulkUpdateTitlesFromCsvAction)
- [ ] `src/db/schema/csv-imports.ts` - MODIFY (add import_mode, updated_title_ids, update_details)
- [ ] `src/modules/titles/components/titles-split-view.tsx` - MODIFY (add Update dropdown)
- [ ] `drizzle/migrations/XXXX_add_csv_imports_update_fields.sql` - NEW (import_mode, updated_title_ids, update_details)
- [ ] `tests/unit/csv-bulk-update.test.ts` - NEW
- [ ] `tests/integration/csv-bulk-update.test.ts` - NEW
