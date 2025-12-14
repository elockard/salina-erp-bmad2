# Story 14.1: Create ONIX 3.1 Message Generator

Status: in-progress

## Story

As a **publisher**,
I want **to generate ONIX 3.1 messages from my title catalog**,
so that **I can distribute metadata to retail channels**.

## Acceptance Criteria

1. **Given** I have titles with complete metadata
   **When** I select titles for ONIX export
   **Then** system generates valid ONIX 3.1 XML message

2. **And** message includes Header with sender identification:
   - SenderName (tenant name)
   - EmailAddress (tenant email)
   - SentDateTime
   - DefaultLanguageOfText (eng)
   - DefaultCurrencyCode (tenant default or USD)

3. **And** each Product contains required blocks:
   - **Block 1 (DescriptiveDetail):** ProductComposition, ProductForm, TitleDetail, Contributors
   - **Block 4 (PublishingDetail):** Publisher, PublishingStatus, PublishingDate
   - **Block 6 (ProductSupply):** Market, SupplyDetail, Price, Availability

4. **And** ProductIdentifier uses ISBN-13 (ProductIDType 15) and GTIN-13 (ProductIDType 03)

5. **And** I can export single title or batch of titles

6. **And** I can preview generated XML before download

7. **And** export history is stored in `onix_exports` table

## Tasks / Subtasks

- [x] Task 1: Create ONIX module structure (AC: 1, 3)
  - [x] Create `src/modules/onix/` directory structure
  - [x] Create types/interfaces matching ONIX 3.1 schema
  - [x] Implement XML escaping utilities
  - [x] Implement null-safe element builder (omit empty elements)

- [x] Task 2: Implement ONIXMessageBuilder class (AC: 1, 2, 3, 4)
  - [x] Create Header builder with tenant sender info
  - [x] Create ProductBuilder with all required blocks
  - [x] Implement ProductIdentifier builder (ISBN-13 type 15, GTIN-13 type 03)
  - [x] Implement DescriptiveDetail builder (Block 1) with multi-author support
  - [x] Implement PublishingDetail builder (Block 4)
  - [x] Implement ProductSupply builder (Block 6)
  - [x] Create XML serialization with proper escaping
  - [x] Generate unique RecordReference per product

- [x] Task 3: Create ONIX export database schema (AC: 7)
  - [x] Create `onix_exports` table migration
  - [x] Add Drizzle schema in `src/db/schema/onix-exports.ts`
  - [x] Include: id, tenant_id, title_ids, export_date, xml_content, status, created_by

- [x] Task 4: Implement export Server Actions (AC: 1, 5, 7)
  - [x] Create `exportSingleTitle` action with permission check
  - [x] Create `exportBatchTitles` action with permission check
  - [x] Store export history to `onix_exports` table
  - [ ] Use Inngest job for batch exports >50 titles (deferred - not needed for <50 titles)

- [x] Task 5: Build export UI (AC: 5, 6)
  - [x] Add export button to title detail view (permission-gated)
  - [ ] Add batch export to title list view (deferred)
  - [x] Create XML preview modal with syntax highlighting
  - [x] Add download with standardized filename

- [x] Task 6: Write tests (all ACs)
  - [x] Unit tests for ONIXMessageBuilder (30 tests)
  - [x] Unit tests for multi-author contributor handling
  - [x] Unit tests for XML escaping and empty element handling (20 tests)
  - [x] Unit tests for Server Actions (13 tests)
  - [x] Schema tests (14 tests)

## Dev Notes

### Technical Requirements

**FR Coverage:** FR135, FR142

- **FR135:** Generate ONIX 3.1 XML messages from title catalog
- **FR142:** Support batch export of multiple titles

**Permission Required:** `CREATE_AUTHORS_TITLES` (Owner, Admin, Editor roles)

### Architecture Pattern: ONIX Builder (Pattern 4)

Use the type-safe builder pattern per `architecture.md:831-942`:

```typescript
// modules/onix/builder/message-builder.ts
export class ONIXMessageBuilder {
  constructor(tenantId: string, tenant: Tenant)
  addTitle(title: TitleWithAuthors, options?: ExportOptions): this
  toXML(options?: { prettyPrint?: boolean }): string
}

// Fetch title with all authors using existing module
import { getTitleWithAuthors } from "@/modules/title-authors/queries";

const titleWithAuthors = await getTitleWithAuthors(titleId);
const builder = new ONIXMessageBuilder(tenantId, tenant);
builder.addTitle(titleWithAuthors);
const xml = builder.toXML();
```

### Complete ONIX 3.1 Product Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.1" xmlns="http://ns.editeur.org/onix/3.1/reference">
  <Header>
    <Sender>
      <SenderName>Acme Publishing</SenderName>
      <EmailAddress>contact@acme.com</EmailAddress>
    </Sender>
    <SentDateTime>20251212T120000Z</SentDateTime>
    <DefaultLanguageOfText>eng</DefaultLanguageOfText>
    <DefaultCurrencyCode>USD</DefaultCurrencyCode>
  </Header>
  <Product>
    <!-- Unique per product, persistent across updates -->
    <RecordReference>acme-550e8400-e29b-41d4-a716-446655440000</RecordReference>
    <NotificationType>03</NotificationType>

    <!-- BOTH identifiers required by most channels -->
    <ProductIdentifier>
      <ProductIDType>15</ProductIDType>  <!-- ISBN-13 -->
      <IDValue>9781234567890</IDValue>
    </ProductIdentifier>
    <ProductIdentifier>
      <ProductIDType>03</ProductIDType>  <!-- GTIN-13 (same as ISBN for books) -->
      <IDValue>9781234567890</IDValue>
    </ProductIdentifier>

    <DescriptiveDetail>
      <ProductComposition>00</ProductComposition>  <!-- 00 = single-item product -->
      <ProductForm>BC</ProductForm>  <!-- BC = Paperback -->

      <TitleDetail>
        <TitleType>01</TitleType>  <!-- 01 = Distinctive title -->
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>  <!-- 01 = Product level -->
          <TitleText>The Great Gatsby</TitleText>
          <Subtitle>A Novel</Subtitle>  <!-- OMIT if null, never empty -->
        </TitleElement>
      </TitleDetail>

      <!-- Multiple contributors with sequence numbers -->
      <Contributor>
        <SequenceNumber>1</SequenceNumber>
        <ContributorRole>A01</ContributorRole>  <!-- A01 = Author -->
        <PersonNameInverted>Fitzgerald, F. Scott</PersonNameInverted>
        <NamesBeforeKey>F. Scott</NamesBeforeKey>
        <KeyNames>Fitzgerald</KeyNames>
      </Contributor>
      <Contributor>
        <SequenceNumber>2</SequenceNumber>
        <ContributorRole>A01</ContributorRole>
        <PersonNameInverted>Smith, Jane</PersonNameInverted>
        <NamesBeforeKey>Jane</NamesBeforeKey>
        <KeyNames>Smith</KeyNames>
      </Contributor>
    </DescriptiveDetail>

    <PublishingDetail>
      <Publisher>
        <PublishingRole>01</PublishingRole>  <!-- 01 = Publisher -->
        <PublisherName>Acme Publishing</PublisherName>
      </Publisher>
      <PublishingStatus>04</PublishingStatus>  <!-- 04 = Active -->
      <PublishingDate>
        <PublishingDateRole>01</PublishingDateRole>  <!-- 01 = Publication date -->
        <Date>20251201</Date>
      </PublishingDate>
    </PublishingDetail>

    <ProductSupply>
      <Market>
        <Territory>
          <CountriesIncluded>US</CountriesIncluded>
        </Territory>
      </Market>
      <SupplyDetail>
        <Supplier>
          <SupplierRole>01</SupplierRole>
          <SupplierName>Acme Publishing</SupplierName>
        </Supplier>
        <ProductAvailability>20</ProductAvailability>  <!-- 20 = Available -->
        <Price>
          <PriceType>01</PriceType>  <!-- 01 = RRP excluding tax -->
          <PriceAmount>24.99</PriceAmount>
          <CurrencyCode>USD</CurrencyCode>
        </Price>
      </SupplyDetail>
    </ProductSupply>
  </Product>
</ONIXMessage>
```

### RecordReference Strategy

Generate unique, persistent RecordReference:

```typescript
function generateRecordReference(tenantSlug: string, titleId: string): string {
  // Format: {tenant-slug}-{title-uuid}
  // Must be persistent across exports (same title = same reference)
  return `${tenantSlug}-${titleId}`;
}
```

### Multi-Author Contributor Handling

Titles can have multiple authors via `title_authors` table (Epic 10). Query with existing module:

```typescript
import { getTitleWithAuthors } from "@/modules/title-authors/queries";
import type { TitleWithAuthors } from "@/modules/title-authors/queries";

// Returns title with authors[] array, sorted by sequence
const title: TitleWithAuthors = await getTitleWithAuthors(titleId);

// Build contributors in sequence order
title.authors.forEach((author, index) => {
  const contributor = buildContributor({
    sequenceNumber: index + 1,
    role: author.isPrimary ? "A01" : "A01", // All authors get A01
    contact: author.contact,
  });
});
```

### Contact Name Formatting

Contacts have `first_name` and `last_name` fields. Author role may have `pen_name`:

```typescript
interface ContributorName {
  personNameInverted: string;  // "Last, First"
  namesBeforeKey: string;      // "First"
  keyNames: string;            // "Last"
}

function formatContributorName(
  contact: Contact,
  authorRoleData?: { pen_name?: string }
): ContributorName {
  // Use pen name if available
  if (authorRoleData?.pen_name) {
    // Pen names stored as single string, use as-is
    return {
      personNameInverted: authorRoleData.pen_name,
      namesBeforeKey: "",
      keyNames: authorRoleData.pen_name,
    };
  }

  return {
    personNameInverted: `${contact.last_name}, ${contact.first_name}`,
    namesBeforeKey: contact.first_name,
    keyNames: contact.last_name,
  };
}
```

### Null/Empty Element Handling

**CRITICAL:** Empty tags invalidate ONIX files. Never output `<Tag></Tag>` or `<Tag/>`.

```typescript
// Helper to conditionally include elements
function optionalElement(tag: string, value: string | null | undefined): string {
  if (!value || value.trim() === "") {
    return ""; // Omit entirely - do NOT return empty tag
  }
  return `<${tag}>${escapeXML(value)}</${tag}>`;
}

// Usage
const subtitle = optionalElement("Subtitle", title.subtitle);
// Returns "" if null, not "<Subtitle></Subtitle>"
```

### Key Codelist Values

| Element | Codelist | Values |
|---------|----------|--------|
| ProductIDType | List 5 | 03 = GTIN-13, 15 = ISBN-13 |
| NotificationType | List 1 | 03 = New/Update |
| ProductComposition | List 2 | 00 = Single-item |
| TitleType | List 15 | 01 = Distinctive title |
| TitleElementLevel | List 149 | 01 = Product level |
| ContributorRole | List 17 | A01 = Author, B01 = Editor |
| ProductForm | List 150 | BB = Hardback, BC = Paperback, ED = EPUB |
| PublishingRole | List 45 | 01 = Publisher |
| PublishingStatus | List 64 | 04 = Active |
| PublishingDateRole | List 163 | 01 = Publication date |
| SupplierRole | List 93 | 01 = Publisher to retailer |
| ProductAvailability | List 65 | 20 = Available |
| PriceType | List 58 | 01 = RRP excluding tax |

### ProductForm Mapping

Salina currently tracks `publication_status` but not format. For MVP, default to paperback:

```typescript
function getProductForm(title: Title): string {
  // TODO: Add format field to titles table in future story
  // For now, default to paperback (BC)
  return "BC";
}
```

**Note:** Story 14.x or Epic 19 should add `format` field to titles for accurate ProductForm.

### File Structure

```
src/modules/onix/
├── index.ts                    # Module exports
├── types.ts                    # ONIX interfaces
├── builder/
│   ├── message-builder.ts      # ONIXMessageBuilder class
│   ├── product-builder.ts      # ProductBuilder class
│   ├── contributor-builder.ts  # Multi-author contributor handling
│   ├── blocks/
│   │   ├── descriptive-detail.ts   # Block 1
│   │   ├── publishing-detail.ts    # Block 4
│   │   └── product-supply.ts       # Block 6
│   └── utils/
│       ├── xml-escape.ts           # XML character escaping
│       ├── date-format.ts          # ONIX date formatting
│       └── optional-element.ts     # Null-safe element builder
├── actions/
│   ├── export-single.ts        # Export single title action
│   └── export-batch.ts         # Export batch titles action
└── components/
    ├── export-button.tsx       # Export trigger button
    └── xml-preview-modal.tsx   # Preview with syntax highlighting
```

### Database Schema

```typescript
// src/db/schema/onix-exports.ts
export const onixExports = pgTable("onix_exports", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenant_id: uuid("tenant_id").notNull().references(() => tenants.id),
  title_ids: uuid("title_ids").array().notNull(),
  export_date: timestamp("export_date").notNull().defaultNow(),
  xml_content: text("xml_content").notNull(),
  product_count: integer("product_count").notNull(),
  status: text("status", { enum: ["success", "validation_error", "failed"] }).notNull(),
  error_message: text("error_message"),
  created_by: uuid("created_by").references(() => users.id),
  created_at: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("onix_exports_tenant_id_idx").on(table.tenant_id),
}));
```

### Server Action Pattern

Follow existing `ActionResult<T>` pattern:

```typescript
"use server";

import { getCurrentTenantId, getDb, requirePermission } from "@/lib/auth";
import { CREATE_AUTHORS_TITLES } from "@/lib/permissions";
import type { ActionResult } from "@/lib/types";

export async function exportSingleTitle(
  titleId: string
): Promise<ActionResult<{ xml: string; filename: string }>> {
  try {
    await requirePermission(CREATE_AUTHORS_TITLES);
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // ... build ONIX XML ...

    return {
      success: true,
      data: { xml, filename: `salina-onix-${tenantSlug}-${Date.now()}.xml` }
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { success: false, error: "Permission denied" };
    }
    return { success: false, error: "Export failed" };
  }
}
```

### Batch Export with Inngest

For exports >50 titles, use background job:

```typescript
// src/inngest/functions/onix-batch-export.ts
export const onixBatchExport = inngest.createFunction(
  { id: "onix-batch-export" },
  { event: "onix/batch.export" },
  async ({ event, step }) => {
    const { tenantId, titleIds, userId } = event.data;
    // Build XML for each title, store result
  }
);
```

### Download Filename Convention

```typescript
// Format: salina-onix-{tenant-slug}-{timestamp}.xml
const filename = `salina-onix-${tenant.slug}-${Date.now()}.xml`;
```

### XML Escaping

```typescript
function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
```

### ONIX Date Formats

```typescript
// SentDateTime: ISO 8601 compact
function formatSentDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  // Returns: 20251212T120000Z
}

// PublishingDate: YYYYMMDD
function formatPublishingDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
  // Returns: 20251212
}
```

### Important Constraints

1. **US Market Only (Phase 1):** Single ProductSupply for US market
2. **No validation blocking:** Story 14.2 adds XSD validation - this story generates well-formed XML but doesn't block on validation errors
3. **Store full XML:** Keep `xml_content` in database for audit trail
4. **ISBN required:** Only titles with assigned ISBN can be exported
5. **Multi-tenant isolation:** Always filter by tenant_id via RLS

### Testing Requirements

```typescript
describe("ONIXMessageBuilder", () => {
  it("generates valid header with tenant info", () => {
    const builder = new ONIXMessageBuilder(tenantId, mockTenant);
    const xml = builder.toXML();
    expect(xml).toContain('<ONIXMessage release="3.1"');
    expect(xml).toContain(`<SenderName>${mockTenant.name}</SenderName>`);
  });

  it("generates unique RecordReference per title", () => {
    builder.addTitle(mockTitle1);
    builder.addTitle(mockTitle2);
    const xml = builder.toXML();
    expect(xml).toContain(`<RecordReference>${tenantSlug}-${mockTitle1.id}</RecordReference>`);
    expect(xml).toContain(`<RecordReference>${tenantSlug}-${mockTitle2.id}</RecordReference>`);
  });

  it("handles multiple authors with correct sequence", () => {
    const titleWithCoAuthors = { ...mockTitle, authors: [author1, author2] };
    builder.addTitle(titleWithCoAuthors);
    const xml = builder.toXML();
    expect(xml).toContain("<SequenceNumber>1</SequenceNumber>");
    expect(xml).toContain("<SequenceNumber>2</SequenceNumber>");
  });

  it("uses pen name when available", () => {
    const authorWithPenName = {
      ...mockAuthor,
      roleSpecificData: { pen_name: "Mark Twain" }
    };
    // ...
    expect(xml).toContain("<KeyNames>Mark Twain</KeyNames>");
  });

  it("omits empty elements instead of generating empty tags", () => {
    const titleNoSubtitle = { ...mockTitle, subtitle: null };
    builder.addTitle(titleNoSubtitle);
    const xml = builder.toXML();
    expect(xml).not.toContain("<Subtitle></Subtitle>");
    expect(xml).not.toContain("<Subtitle/>");
  });

  it("escapes special characters in text content", () => {
    const titleSpecialChars = { ...mockTitle, title: "Tom & Jerry's <Adventures>" };
    builder.addTitle(titleSpecialChars);
    const xml = builder.toXML();
    expect(xml).toContain("Tom &amp; Jerry&apos;s &lt;Adventures&gt;");
  });

  it("includes both ISBN-13 and GTIN-13 identifiers", () => {
    builder.addTitle(mockTitle);
    const xml = builder.toXML();
    expect(xml).toContain("<ProductIDType>15</ProductIDType>");
    expect(xml).toContain("<ProductIDType>03</ProductIDType>");
  });
});
```

### References

- [Source: docs/architecture.md#Pattern 4: ONIX 3.1 Message Builder]
- [Source: docs/analysis/research/domain-onix-3.1-research-2025-12-12.md]
- [Source: docs/epics.md#Story 14.1]
- [Source: src/db/schema/titles.ts]
- [Source: src/db/schema/contacts.ts - first_name, last_name fields]
- [Source: src/modules/title-authors/queries.ts - getTitleWithAuthors]
- [Source: src/modules/titles/actions.ts - ActionResult pattern]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

TBD

### Debug Log References

### Completion Notes List

### File List
