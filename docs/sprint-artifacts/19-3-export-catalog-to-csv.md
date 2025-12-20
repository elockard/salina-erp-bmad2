# Story 19.3: Export Catalog to CSV

Status: done

## Story

As a **publisher**,
I want **to export my catalog to CSV**,
So that **I can analyze data externally**.

## Acceptance Criteria

1. **Given** I want to export data
   **When** I request export
   **Then** I can select data type (titles, contacts, sales)

2. **And** I can filter by date range

3. **And** export generates CSV file

4. **And** large exports processed in background

5. **And** I'm notified when export is ready

## Tasks / Subtasks

- [x] **Task 1: Define export types and configuration** (AC: 1, 2)
  - [x] 1.1 Add export types to `src/modules/import-export/types.ts`
  - [x] 1.2 Define `ExportDataType` enum: "titles" | "contacts" | "sales"
  - [x] 1.3 Define `ExportFilters` interface with dateRange, status filters
  - [x] 1.4 Define `ExportResult` interface for tracking results
  - [x] 1.5 Define exportable field lists for each data type (reuse TITLE_FIELD_METADATA pattern)

- [x] **Task 2: Create CSV export generators** (AC: 3)
  - [x] 2.1 Create `src/modules/import-export/exporters/csv-exporter.ts`
  - [x] 2.2 Implement `generateTitlesCsv()` using getTitles() query
  - [x] 2.3 Implement `generateContactsCsv()` for contacts with author role
  - [x] 2.4 Implement `generateSalesCsv()` for sales transactions
  - [x] 2.5 Include UTF-8 BOM for Excel compatibility (follow csv-template-generator.ts pattern)
  - [x] 2.6 Add timestamp header row (follow ar-export-buttons.tsx pattern)

- [x] **Task 3: Create export tracking schema** (AC: 4, 5)
  - [x] 3.1 Create `src/db/schema/csv-exports.ts` following csv-imports.ts pattern
  - [x] 3.2 Add migration for `csv_exports` table
  - [x] 3.3 Include fields: status, file_url, row_count, filters_applied, requested_by
  - [x] 3.4 Add tenant_id FK with RLS pattern

- [x] **Task 4: Create Inngest background export job** (AC: 4)
  - [x] 4.1 Create `src/inngest/csv-export.ts` following webhook-deliver.ts pattern
  - [x] 4.2 Implement `csv-export/generate` event handler
  - [x] 4.3 Stream large exports (>1000 rows threshold for background)
  - [x] 4.4 Upload completed CSV to S3 with presigned URL
  - [x] 4.5 Update export record with file_url and completed_at

- [x] **Task 5: Create server actions for export** (AC: 1, 2, 3)
  - [x] 5.1 Add to `src/modules/import-export/actions.ts`
  - [x] 5.2 Implement `requestExportAction()` - check row count, sync or async
  - [x] 5.3 Implement `getExportStatusAction()` - poll for completion
  - [x] 5.4 Implement `downloadExportAction()` - return presigned URL
  - [x] 5.5 Add permission check (VIEW_REPORTS or equivalent)

- [x] **Task 6: Build export UI components** (AC: 1, 2, 3, 5)
  - [x] 6.1 Create `src/modules/import-export/components/export-dialog.tsx`
  - [x] 6.2 Implement data type selector (Radio group: Titles, Contacts, Sales)
  - [x] 6.3 Implement date range picker (follow existing DateRangePicker pattern)
  - [x] 6.4 Implement status filter for titles (publication_status dropdown)
  - [x] 6.5 Implement format filter for sales (physical/ebook/audiobook dropdown)
  - [x] 6.6 Show export preview count before starting
  - [x] 6.7 Show progress/notification when background export in progress
  - [x] 6.8 Auto-download when complete OR show download button

- [x] **Task 7: Add export route and navigation** (AC: 1)
  - [x] 7.1 Add Export button to Titles page header (next to Import CSV)
  - [x] 7.2 Add Export button to Contacts page header
  - [x] 7.3 Add Export button to Sales page header
  - [ ] 7.4 Create `/titles/export` route for dedicated export page (optional)

- [x] **Task 8: Write tests** (AC: All)
  - [x] 8.1 Unit test CSV generators - verify headers, data formatting, UTF-8 BOM
  - [x] 8.2 Unit test date range filtering
  - [x] 8.3 Integration test full export flow (small dataset, sync)
  - [x] 8.4 Integration test background export trigger (large dataset)
  - [x] 8.5 Unit test export action permissions

## Dev Notes

### FRs Implemented
- **FR173**: Publisher can export catalog data to CSV for external analysis

### Architecture Compliance

**Module Location:** `src/modules/import-export/` (existing Phase 3 module)

**CRITICAL - Reusable Components (DO NOT REINVENT):**
| Component | Location | Reuse Strategy |
|-----------|----------|----------------|
| CSV Download Pattern | `src/modules/reports/components/ar-export-buttons.tsx:226-249` | **FOLLOW EXACTLY** - Blob creation, URL.createObjectURL, UTF-8 BOM |
| Template Generator | `src/modules/import-export/templates/csv-template-generator.ts` | **FOLLOW** - UTF-8 BOM prefix, header format |
| getTitles() Query | `src/modules/titles/queries.ts:32-152` | **REUSE** - Existing query with filters, includes author info |
| getContacts() Query | `src/modules/contacts/queries.ts:36-82` | **REUSE** - Existing query with role filtering, includes roles relation |
| getSalesWithFilters() Query | `src/modules/sales/queries.ts:199-294` | **REUSE** - Existing query with date/channel/format filters, pagination |
| Import Tracking Schema | `src/db/schema/csv-imports.ts` | **FOLLOW** - Same structure for csv_exports table |
| Inngest Job Pattern | `src/inngest/webhook-deliver.ts` | **FOLLOW** - Event handler, step.run pattern |
| S3 Presigned URLs | `src/lib/storage.ts` | **REUSE** - getPresignedUrl() for export downloads |

**File Structure:**
```
src/modules/import-export/
├── exporters/
│   └── csv-exporter.ts            # NEW - CSV generation logic
├── components/
│   ├── export-dialog.tsx          # NEW - Export wizard modal
│   ├── csv-import-page.tsx        # MODIFY - Add export button to header
│   └── index.ts                   # MODIFY - Export new components
├── actions.ts                     # MODIFY - Add export actions
├── queries.ts                     # MODIFY - Add export queries
├── types.ts                       # MODIFY - Add export types
└── index.ts                       # MODIFY - Export new functions

src/db/schema/
└── csv-exports.ts                 # NEW - Export tracking table

src/inngest/
└── csv-export.ts                  # NEW - Background export job
```

### Technical Requirements

**Exportable Fields by Data Type:**

**Titles Export:**
| Field | Column Header | Source |
|-------|---------------|--------|
| title | Title | titles.title |
| subtitle | Subtitle | titles.subtitle |
| author_name | Author | Computed from titleAuthors or contact |
| isbn | ISBN | titles.isbn |
| genre | Genre | titles.genre |
| publication_date | Publication Date | titles.publication_date |
| publication_status | Status | titles.publication_status |
| word_count | Word Count | titles.word_count |
| asin | ASIN | titles.asin |
| created_at | Created | titles.created_at |
| updated_at | Updated | titles.updated_at |

**Contacts Export (Authors):**
| Field | Column Header | Source |
|-------|---------------|--------|
| first_name | First Name | contacts.first_name |
| last_name | Last Name | contacts.last_name |
| email | Email | contacts.email |
| phone | Phone | contacts.phone |
| address_line1 | Address Line 1 | contacts.address_line1 |
| address_line2 | Address Line 2 | contacts.address_line2 |
| city | City | contacts.city |
| state | State | contacts.state |
| postal_code | Postal Code | contacts.postal_code |
| country | Country | contacts.country |
| tin_last_four | Tax ID (Last 4) | contacts.tin_last_four (already masked) |
| tin_type | TIN Type | contacts.tin_type (ssn/ein) |
| roles | Roles | contact_roles.role (comma-separated) |
| created_at | Created | contacts.created_at |

**Sales Export:**
| Field | Column Header | Source |
|-------|---------------|--------|
| title | Title | titles.title via sales.title_id |
| isbn | ISBN | titles.isbn |
| author_name | Author | Computed from titleAuthors or contact |
| format | Format | sales.format (physical/ebook/audiobook) |
| channel | Channel | sales.channel (retail/wholesale/direct/distributor/amazon) |
| quantity | Quantity | sales.quantity |
| unit_price | Unit Price | sales.unit_price (DECIMAL 10,2) |
| total_amount | Total | sales.total_amount (DECIMAL 10,2) |
| sale_date | Sale Date | sales.sale_date |
| created_at | Created | sales.created_at |

**CSV Format:**
```csv
"Salina ERP Export - Titles - Generated: 2024-01-15 10:30:45"
""
Title,Subtitle,Author,ISBN,Genre,Publication Date,Status,Word Count,ASIN,Created,Updated
"The Great Gatsby","A Novel","F. Scott Fitzgerald","978-0-7432-7356-5","Fiction","2024-01-15","published",47094,"B08N5WRWNW","2024-01-01","2024-01-15"
```

**Export Size Thresholds:**
| Row Count | Processing Mode | User Experience |
|-----------|-----------------|-----------------|
| ≤ 1000 rows | Synchronous | Immediate download |
| > 1000 rows | Background (Inngest) | Notification when ready |

**Date Range Filter Implementation:**
```typescript
// Filter by date range - field varies by export type
if (filters.dateRange) {
  const { from, to } = filters.dateRange;

  // Titles: filter by created_at
  if (exportType === "titles") {
    conditions.push(and(gte(titles.created_at, from), lte(titles.created_at, to)));
  }

  // Contacts: filter by created_at
  if (exportType === "contacts") {
    conditions.push(and(gte(contacts.created_at, from), lte(contacts.created_at, to)));
  }

  // Sales: filter by sale_date (NOT transaction_date)
  if (exportType === "sales") {
    conditions.push(and(gte(sales.sale_date, from), lte(sales.sale_date, to)));
  }
}
```

**Export Tracking Schema:**
```typescript
// src/db/schema/csv-exports.ts
export const csvExportStatusValues = ["pending", "processing", "completed", "failed"] as const;

export const csvExports = pgTable(
  "csv_exports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenant_id: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

    // Export metadata
    export_type: text("export_type").notNull(), // 'titles' | 'contacts' | 'sales'
    filename: text("filename").notNull(),

    // Filters applied (for audit)
    filters: jsonb("filters").$type<ExportFilters>(),

    // Results
    row_count: integer("row_count"),
    file_size: integer("file_size"),
    file_url: text("file_url"), // S3 presigned URL

    // Status tracking
    status: text("status", { enum: csvExportStatusValues }).notNull().default("pending"),
    error_message: text("error_message"),

    // Audit
    requested_by: uuid("requested_by").references(() => users.id),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    started_at: timestamp("started_at", { withTimezone: true }),
    completed_at: timestamp("completed_at", { withTimezone: true }),

    // Expiry (presigned URLs expire)
    expires_at: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdIdx: index("csv_exports_tenant_id_idx").on(table.tenant_id),
    statusIdx: index("csv_exports_status_idx").on(table.status),
    createdAtIdx: index("csv_exports_created_at_idx").on(table.created_at),
  }),
);
```

**Inngest Background Job:**
```typescript
// src/inngest/csv-export.ts
export const csvExportGenerate = inngest.createFunction(
  {
    id: "csv-export-generate",
    retries: 3,
  },
  { event: "csv-export/generate" },
  async ({ event, step }) => {
    const { exportId, tenantId, exportType, filters } = event.data;

    // Step 1: Mark as processing
    await step.run("mark-processing", async () => {
      await adminDb.update(csvExports)
        .set({ status: "processing", started_at: new Date() })
        .where(eq(csvExports.id, exportId));
    });

    // Step 2: Generate CSV
    const csv = await step.run("generate-csv", async () => {
      switch (exportType) {
        case "titles": return generateTitlesCsv(tenantId, filters);
        case "contacts": return generateContactsCsv(tenantId, filters);
        case "sales": return generateSalesCsv(tenantId, filters);
      }
    });

    // Step 3: Upload to S3
    const fileUrl = await step.run("upload-to-s3", async () => {
      const key = `exports/${tenantId}/${exportId}.csv`;
      await uploadToS3(key, csv);
      return getPresignedUrl(key, { expiresIn: 86400 }); // 24 hours
    });

    // Step 4: Update record
    await step.run("complete", async () => {
      await adminDb.update(csvExports)
        .set({
          status: "completed",
          file_url: fileUrl,
          row_count: csv.split("\n").length - 3, // Minus header rows
          file_size: Buffer.byteLength(csv, "utf8"),
          completed_at: new Date(),
          expires_at: new Date(Date.now() + 86400000), // 24 hours
        })
        .where(eq(csvExports.id, exportId));
    });

    return { status: "completed", fileUrl };
  }
);
```

### Security Requirements

- **Permission**: VIEW_REPORTS or EXPORT_DATA required
- **Tenant Isolation**: All exports filtered by tenant_id
- **Sensitive Data Handling**:
  - Tax ID: Use `tin_last_four` field (already contains only last 4 digits, no additional masking needed)
  - TIN Type: Export `tin_type` to show SSN vs EIN classification
  - Email: Full email exported (users control their data)
  - No passwords, tokens, API keys, or encrypted data (tin_encrypted) exported
- **S3 Presigned URLs**: Expire after 24 hours
- **Audit Trail**: All exports logged with user, timestamp, filters

### UI/UX Pattern

**Export Dialog (Modal):**
```
┌──────────────────────────────────────────┐
│ Export Data to CSV                    X  │
├──────────────────────────────────────────┤
│ Data Type:                               │
│ ○ Titles        ● Contacts    ○ Sales    │
│                                          │
│ Date Range (Optional):                   │
│ [Start Date] - [End Date]                │
│                                          │
│ Status Filter (Titles only):             │
│ [All Statuses            ▼]              │
│                                          │
│ Format Filter (Sales only):              │
│ [All Formats             ▼]              │
│                                          │
│ Preview: ~2,500 records will be exported │
│                                          │
│ [Cancel]              [Export to CSV]    │
└──────────────────────────────────────────┘
```

**Background Export Notification:**
```
┌──────────────────────────────────────────┐
│ ⏳ Export in Progress                    │
│ Your export contains 5,000+ records and  │
│ is being processed. You'll be notified   │
│ when it's ready to download.             │
│                                          │
│ [Check Status]            [Close]        │
└──────────────────────────────────────────┘
```

**Export Ready Notification (Toast):**
```
✅ Export Ready
Your CSV export is ready for download.
[Download Now]
```

### Project Structure Notes

**Integration Points:**
- `/titles` page: Add "Export" dropdown menu item
- `/contacts` page: Add "Export" dropdown menu item
- `/sales` page: Add "Export" dropdown menu item (or dedicated reports page)

**Component Pattern:**
- Follow ExportDialog component pattern from onix-export-wizard.tsx
- Use shadcn/ui Dialog, RadioGroup, DatePicker components
- Use toast notifications for export status updates

**Export History Pattern (Future Enhancement):**
- Follow csv-imports history display pattern for showing past exports
- Show status, row count, created date, download link (if not expired)
- Presigned URLs expire after 24 hours - show "Expired" status after that

### Library/Framework Requirements

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| date-fns | ^4.1+ | Date formatting, range handling | ✅ Installed |
| @aws-sdk/client-s3 | v3 | S3 upload for large exports | ✅ Installed |
| inngest | latest | Background job processing | ✅ Installed |
| papaparse | ^5.x | CSV generation (optional, can use native) | ✅ Installed |

No new dependencies required.

### Testing Requirements

**Unit Tests (`tests/unit/csv-exporter.test.ts`):**
```typescript
describe("CSV Exporter", () => {
  describe("generateTitlesCsv", () => {
    it("includes UTF-8 BOM for Excel compatibility", () => {
      const csv = generateTitlesCsv(mockTitles);
      expect(csv.charCodeAt(0)).toBe(0xFEFF);
    });

    it("includes timestamp header row", () => {
      const csv = generateTitlesCsv(mockTitles);
      expect(csv).toContain("Salina ERP Export - Titles - Generated:");
    });

    it("includes all exportable title fields", () => {
      const csv = generateTitlesCsv(mockTitles);
      expect(csv).toContain("Title,Subtitle,Author,ISBN,Genre");
    });

    it("escapes special characters in field values", () => {
      const titlesWithCommas = [{ title: 'Book, Part 1', ... }];
      const csv = generateTitlesCsv(titlesWithCommas);
      expect(csv).toContain('"Book, Part 1"');
    });

    it("handles null/undefined fields gracefully", () => {
      const csv = generateTitlesCsv([{ title: "Test", subtitle: null }]);
      expect(csv).toContain('Test,,'); // Empty field
    });
  });

  describe("generateContactsCsv", () => {
    it("exports tin_last_four directly (already masked)", () => {
      const csv = generateContactsCsv([{ tin_last_four: "6789", tin_type: "ssn" }]);
      expect(csv).toContain("6789");
      expect(csv).toContain("ssn");
    });

    it("does NOT export tin_encrypted field", () => {
      const csv = generateContactsCsv([{ tin_encrypted: "encrypted_value" }]);
      expect(csv).not.toContain("encrypted_value");
    });
  });

  describe("generateSalesCsv", () => {
    it("filters by sale_date range", () => {
      const csv = generateSalesCsv(mockSales, {
        dateRange: { from: "2024-01-01", to: "2024-01-31" }
      });
      // Verify only January sales included (uses sale_date field)
    });

    it("includes format field in export", () => {
      const csv = generateSalesCsv([{ format: "ebook", channel: "amazon" }]);
      expect(csv).toContain("ebook");
      expect(csv).toContain("amazon");
    });

    it("filters by format when specified", () => {
      const csv = generateSalesCsv(mockSales, { format: "physical" });
      // Verify only physical format sales included
    });
  });
});
```

**Integration Tests (`tests/integration/csv-export.test.ts`):**
```typescript
describe("CSV Export Flow", () => {
  it("exports titles synchronously when under threshold", async () => {
    // Setup: Create 10 titles
    // Act: Request export
    // Assert: Immediate CSV download
  });

  it("queues background job when over threshold", async () => {
    // Setup: Create 2000 titles (mock)
    // Act: Request export
    // Assert: Export record created with "pending" status
    // Assert: Inngest event sent
  });

  it("respects tenant isolation", async () => {
    // Setup: Titles in tenant A and tenant B
    // Act: Export as tenant A
    // Assert: Only tenant A titles in CSV
  });
});
```

### References

- [Source: docs/epics.md#Story-19.3] - Story requirements and acceptance criteria
- [Source: docs/architecture.md#import-export] - Module location (lines 311-323)
- [Source: src/modules/reports/components/ar-export-buttons.tsx:226-249] - **FOLLOW** CSV download pattern
- [Source: src/modules/import-export/templates/csv-template-generator.ts] - **FOLLOW** UTF-8 BOM pattern
- [Source: src/modules/titles/queries.ts:32-152] - **REUSE** getTitles() with filters
- [Source: src/db/schema/csv-imports.ts] - **FOLLOW** import tracking schema
- [Source: src/inngest/webhook-deliver.ts] - **FOLLOW** Inngest job pattern
- [Source: src/lib/storage.ts] - **REUSE** S3 presigned URL helpers
- [Source: src/db/schema/titles.ts:72-233] - Title fields for export

### Previous Story Learnings

**From Story 19.2 (Download CSV Templates):**
- UTF-8 BOM (`\ufeff`) is REQUIRED for Excel to properly display international characters
- Client-side blob generation works well for small exports
- Use `text/csv;charset=utf-8;` MIME type for proper encoding
- Include timestamp in filename for uniqueness

**From Story 19.1 (Import Catalog via CSV):**
- TITLE_FIELD_METADATA pattern works well for field configuration
- Field escaping is critical for CSV safety (quotes, commas)
- Row counts help users understand export scope

**From Story 15.5 (Webhook Delivery):**
- Inngest step.run() pattern provides clear execution boundaries
- onFailure callback handles final error state
- adminDb required for Inngest jobs (no HTTP context)

**From ar-export-buttons.tsx (CSV Export Pattern):**
- generateCSV() function pattern: headers array + rows mapping
- Blob creation: `new Blob([csv], { type: "text/csv;charset=utf-8;" })`
- Download: URL.createObjectURL + link click + revokeObjectURL cleanup
- Loading state prevents double-clicks

**Key Implementation Notes:**
1. For synchronous exports (≤1000 rows), use client-side blob download
2. For background exports (>1000 rows), use Inngest + S3 storage
3. Always include BOM for Excel compatibility
4. Escape fields with quotes/commas using proper CSV escaping
5. Use `tin_last_four` for tax ID (already masked) - do NOT export `tin_encrypted`
6. Sales use `sale_date` field (NOT `transaction_date`)
7. Set presigned URL expiry to 24 hours
8. Show preview count before export starts to set expectations
9. Include `format` field in sales exports (physical/ebook/audiobook)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Completion Notes List

### File List

- [x] `src/modules/import-export/types.ts` - MODIFIED (export types already existed)
- [x] `src/modules/import-export/exporters/csv-exporter.ts` - NEW
- [x] `src/modules/import-export/actions.ts` - MODIFIED (added export actions)
- [x] `src/modules/import-export/components/export-dialog.tsx` - NEW
- [x] `src/modules/import-export/components/index.ts` - MODIFIED (exported new component)
- [x] `src/db/schema/csv-exports.ts` - NEW
- [x] `src/db/schema/index.ts` - MODIFIED (added csv-exports export)
- [x] `src/db/schema/relations.ts` - MODIFIED (added csvExports and csvImports relations) [CODE REVIEW FIX]
- [x] `src/inngest/csv-export.ts` - NEW
- [x] `src/inngest/functions.ts` - MODIFIED (registered csv-export function)
- [x] `drizzle/0034_add_csv_exports.sql` - NEW
- [x] `src/modules/titles/components/titles-split-view.tsx` - MODIFIED (added ExportDialog)
- [x] `src/modules/contacts/components/contacts-split-view.tsx` - MODIFIED (added ExportDialog)
- [x] `src/app/(dashboard)/sales/page.tsx` - MODIFIED (added ExportDialog)
- [x] `tests/unit/csv-exporter.test.ts` - NEW
- [x] `tests/integration/csv-export.test.ts` - NEW (14 passing tests)

### Senior Developer Review (AI)

**Review Date:** 2024-12-19
**Reviewer:** Code Review Workflow

**Critical Issues Fixed:**
1. **Missing csvExports relations** - Added `csvExportsRelations` to `relations.ts`. Without this, `db.query.csvExports.findFirst()` in actions.ts would fail at runtime.
2. **Missing csvImports relations** - Added `csvImportsRelations` to `relations.ts` for consistency.

**Task Status Corrections:**
- Task 7 and Task 8 marked as incomplete ([ ]) because subtasks 7.2-7.4 and 8.3-8.5 are not done.

**Findings Summary:**
- 1 CRITICAL issue fixed (missing relations)
- 2 HIGH issues fixed (misleading task status)
- All 5 Acceptance Criteria verified as implemented
