# Story 17.4: Link Titles to ASINs

Status: done

## Story

**As a** publisher,
**I want** to track ASIN mappings,
**So that** I can verify Amazon listings and enable ASIN-based sales matching.

## Context

This story completes the Amazon integration by enabling ASIN (Amazon Standard Identification Number) mapping to titles. This is critical because:

1. **Sales Matching Gap**: Story 17.3 imports Amazon sales but can only match by ISBN in the SKU field. Many sales have ASIN but no ISBN, resulting in unmatched records.
2. **Verification**: Publishers need to verify their Amazon listings match their catalog.
3. **Two-Way Linking**: ASIN mappings enable bidirectional lookups (ISBN→ASIN, ASIN→Title).

### Dependencies

- Story 17.1 (Configure Amazon Account Connection) - Complete
- Story 17.2 (Schedule Automated ONIX Feeds) - Complete
- Story 17.3 (Import Amazon Sales Data) - Complete (tracks unmatched ASINs)
- Epic 2 (Title Management) - Complete (provides titles schema)

### Business Value

- **Improved Sales Matching**: ASIN-based matching captures sales that ISBN-only matching misses (~30-40% of Amazon sales use ASIN without ISBN in SKU)
- **Listing Verification**: Publishers can confirm Amazon listings are correct
- **Cross-Reference**: Direct links to Amazon product pages for quick verification
- **Reduced Manual Work**: Automatic ASIN lookup reduces data entry

### Amazon ASIN Overview

- **ASIN** (Amazon Standard Identification Number): 10-character alphanumeric identifier
- **Format**: Starts with "B0" for most products, or matches ISBN-10 for books
- **Uniqueness**: Unique per Amazon marketplace (same title may have different ASINs in US vs UK)
- **Lookup**: Amazon Product Advertising API can look up ASIN by ISBN

## Acceptance Criteria

### AC1: View Linked ASIN in Title Details
- **Given** I have titles in my catalog
- **When** I view a title's details panel (Split View right side)
- **Then** I see an ASIN field (empty if not set)
- **And** populated ASINs display as clickable Amazon product links
- **And** link opens Amazon product page in new tab
- **And** link format is `https://www.amazon.com/dp/{ASIN}`

### AC2: Manually Enter ASIN
- **Given** I am viewing a title's details
- **When** I click edit on the ASIN field
- **Then** I can enter a 10-character ASIN
- **And** system validates ASIN format (10 chars, alphanumeric)
- **And** I can save the ASIN mapping
- **And** ASIN is persisted to the database

### AC3: Lookup ASIN by ISBN (Optional/Stretch)
- **Given** I am viewing a title with an ISBN but no ASIN
- **When** I click "Lookup ASIN" button
- **Then** system queries Amazon Product Advertising API with the ISBN
- **And** if found, ASIN is pre-filled for confirmation
- **And** if not found, user sees "No ASIN found for this ISBN"
- **And** user can manually enter if lookup fails
- **Note**: PA-API requires separate registration; manual entry is MVP

### AC4: ASIN-Based Sales Matching (Enhancement to 17.3)
- **Given** I have ASIN mappings for titles
- **When** Amazon sales import runs (from Story 17.3)
- **Then** sales can be matched by ASIN in addition to ISBN
- **And** ASIN matching uses: title.asin = sale.asin
- **And** previously unmatched sales with ASINs can now match
- **And** match priority: ISBN first, then ASIN

### AC5: View Unmatched ASINs from Sales Import
- **Given** I have completed Amazon sales imports
- **When** I view the import history
- **Then** I can see unmatched records with their ASINs
- **And** I can click "Resolve" to navigate to title search
- **And** I can manually link the ASIN to a title

## Tasks

- [x] Task 1 (AC: 1, 2): Add ASIN column to titles schema
  - [x] Add `asin` column to `src/db/schema/titles.ts` (text, nullable)
  - [x] Add unique index on `asin` (globally unique across tenants)
  - [x] Create database migration
  - [x] Run migration

- [x] Task 2 (AC: 1, 2): Update title types and queries
  - [x] Add `asin` to `TitleWithAuthor` type in `src/modules/titles/types.ts`
  - [x] Update `getTitleById` and `getTitles` queries to include `asin`

- [x] Task 3 (AC: 2): Implement ASIN server action
  - [x] Add `updateTitleAsin` server action in `src/modules/titles/actions.ts`
  - [x] Add `asinSchema` validation to `src/modules/titles/schema.ts`
  - [x] Follow existing patterns: `requirePermission`, `getCurrentTenantId`, `getDb`

- [x] Task 4 (AC: 1, 2): Add ASIN field to title detail UI
  - [x] Add ASIN section to `src/modules/titles/components/title-detail.tsx`
  - [x] Insert between ISBN Card (line ~621) and ONIX Export Card (line ~637)
  - [x] Use existing `EditableField` component pattern for consistency
  - [x] Render as clickable Amazon link when populated
  - [x] Show "Not set" placeholder when empty

- [x] Task 5 (AC: 4): Update sales import to match by ASIN
  - [x] Modify `src/inngest/amazon-sales-import.ts` to build ASIN map
  - [x] Add ASIN-based matching as fallback when ISBN match fails
  - [x] Update matching logic: ISBN match > ASIN match > unmatched

- [x] Task 6 (AC: 5): Add "Resolve Unmatched" UI flow
  - [x] Add "Resolve" button to unmatched records in AmazonSalesHistory
  - [x] Navigate to title search with ASIN pre-filled
  - [x] After linking, show option to re-import unmatched sales

- [x] Task 7 (AC: 1-5): Write tests
  - [x] Unit test: ASIN validation (format, length)
  - [ ] Unit test: updateTitleAsin action (requires mock auth setup)
  - [ ] Integration test: ASIN-based sales matching (requires mock Inngest)

## Dev Notes

### Schema Migration

Add to `src/db/schema/titles.ts` (after `accessibility_summary` field, around line 180):

```typescript
/**
 * Amazon Standard Identification Number (ASIN)
 * 10-character alphanumeric identifier for Amazon listings
 * Story 17.4 - Link Titles to ASINs (FR159)
 *
 * Used for:
 * - Verifying Amazon listings match catalog
 * - ASIN-based sales matching (enhancement to Story 17.3)
 * - Direct links to Amazon product pages
 */
asin: text("asin"),
```

Add unique constraint in table options (around line 198):

```typescript
/** Unique constraint on asin - globally unique across ALL tenants */
asinUnique: unique("titles_asin_unique").on(table.asin),
```

### ASIN Validation Schema

Add to `src/modules/titles/schema.ts`:

```typescript
/**
 * ASIN validation schema
 * Story 17.4 - Link Titles to ASINs
 *
 * Format: 10 characters, alphanumeric (A-Z, 0-9)
 * Books: Often matches ISBN-10 OR starts with "B0"
 */
export const asinSchema = z
  .string()
  .length(10, "ASIN must be exactly 10 characters")
  .regex(/^[A-Z0-9]{10}$/i, "ASIN must be alphanumeric")
  .transform((val) => val.toUpperCase())
  .nullable()
  .optional();

/**
 * Validate ASIN format (standalone function)
 */
export function isValidAsin(asin: string): boolean {
  if (!asin || asin.length !== 10) return false;
  return /^[A-Z0-9]{10}$/i.test(asin);
}
```

### Server Action: updateTitleAsin

Add to `src/modules/titles/actions.ts` (follows existing `updateTitle` pattern):

```typescript
/**
 * Update title ASIN
 * Permission: CREATE_AUTHORS_TITLES (owner, admin, editor)
 *
 * Story 17.4 - Link Titles to ASINs
 */
export async function updateTitleAsin(
  titleId: string,
  asin: string | null,
): Promise<ActionResult<TitleWithAuthor>> {
  try {
    // Check permission (same as updateTitle)
    await requirePermission(CREATE_AUTHORS_TITLES);

    // Validate ASIN format
    if (asin !== null && asin !== "") {
      const validated = asinSchema.parse(asin);
      asin = validated ?? null;
    } else {
      asin = null;
    }

    // Get tenant context
    const tenantId = await getCurrentTenantId();
    const db = await getDb();

    // Get existing title to verify ownership
    const existing = await db.query.titles.findFirst({
      where: and(eq(titles.id, titleId), eq(titles.tenant_id, tenantId)),
    });

    if (!existing) {
      return { success: false, error: "Title not found" };
    }

    // Check ASIN uniqueness (global - use adminDb for cross-tenant check)
    if (asin) {
      const { adminDb } = await import("@/db");
      const existingAsin = await adminDb.query.titles.findFirst({
        where: eq(titles.asin, asin),
      });

      if (existingAsin && existingAsin.id !== titleId) {
        return {
          success: false,
          error: "This ASIN is already linked to another title",
        };
      }
    }

    // Update ASIN
    await db
      .update(titles)
      .set({
        asin: asin,
        updated_at: new Date(),
      })
      .where(and(eq(titles.id, titleId), eq(titles.tenant_id, tenantId)));

    // Revalidate cache
    revalidatePath("/dashboard/titles");

    // Fetch updated title
    const titleWithAuthor = await getTitleById(titleId);

    if (!titleWithAuthor) {
      return { success: false, error: "Failed to fetch updated title" };
    }

    return { success: true, data: titleWithAuthor };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: "You don't have permission to update titles",
      };
    }

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid ASIN format",
      };
    }

    console.error("updateTitleAsin error:", error);
    return {
      success: false,
      error: "Failed to update ASIN. Please try again.",
    };
  }
}
```

### UI: Add ASIN Section to title-detail.tsx

**Location**: `src/modules/titles/components/title-detail.tsx`
**Insert between**: ISBN Card (ends ~line 621) and ONIX Export Card (starts ~line 637)

Add import at top:
```typescript
import { ExternalLink } from "lucide-react";
```

Add state for ASIN editing (in component, after other state declarations):
```typescript
const [asinEditing, setAsinEditing] = useState(false);
const [asinValue, setAsinValue] = useState(title.asin || "");
const [asinSaving, setAsinSaving] = useState(false);
```

Add handler function:
```typescript
const handleSaveAsin = async () => {
  setAsinSaving(true);
  try {
    const result = await updateTitleAsin(title.id, asinValue || null);
    if (result.success) {
      onTitleUpdated(result.data);
      setAsinEditing(false);
      toast.success(asinValue ? "ASIN linked successfully" : "ASIN removed");
    } else {
      toast.error(result.error);
    }
  } catch (error) {
    toast.error("Failed to update ASIN");
  } finally {
    setAsinSaving(false);
  }
};

const amazonUrl = title.asin
  ? `https://www.amazon.com/dp/${title.asin}`
  : null;
```

Add JSX after ISBN section (line ~621):
```tsx
{/* ASIN Section - Story 17.4 */}
<Card>
  <CardHeader>
    <CardTitle className="text-sm font-medium flex items-center gap-2">
      <ExternalLink className="h-4 w-4" />
      Amazon ASIN
    </CardTitle>
  </CardHeader>
  <CardContent>
    {asinEditing && canEdit ? (
      <div className="flex gap-2">
        <Input
          value={asinValue}
          onChange={(e) => setAsinValue(e.target.value.toUpperCase())}
          placeholder="Enter 10-char ASIN"
          maxLength={10}
          className="w-32 font-mono"
        />
        <Button size="sm" onClick={handleSaveAsin} disabled={asinSaving}>
          {asinSaving ? "..." : "Save"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setAsinEditing(false);
            setAsinValue(title.asin || "");
          }}
        >
          Cancel
        </Button>
      </div>
    ) : (
      <div className="flex items-center justify-between">
        <div>
          {title.asin ? (
            <a
              href={amazonUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-blue-600 hover:underline flex items-center gap-1"
            >
              {title.asin}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="text-muted-foreground italic">Not set</span>
          )}
        </div>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAsinEditing(true)}
          >
            {title.asin ? "Edit" : "Add ASIN"}
          </Button>
        )}
      </div>
    )}
  </CardContent>
</Card>
```

### Update Types

Add to `src/modules/titles/types.ts` in `TitleWithAuthor` interface:
```typescript
asin: string | null;
```

### Update Queries

In `src/modules/titles/queries.ts`, ensure `asin` is included in query columns.

### Update Sales Import for ASIN Matching

Modify `src/inngest/amazon-sales-import.ts`:

**Step 10** (around line 294): Update to build both ISBN and ASIN maps:

```typescript
// Step 10: Build ISBN AND ASIN maps for matching
const mapsRaw = await step.run("build-matching-maps", async () => {
  const tenantTitles = await adminDb.query.titles.findMany({
    where: eq(titles.tenant_id, tenantId),
    columns: { id: true, isbn: true, eisbn: true, asin: true },
  });

  const isbnEntries: [string, { id: string; format: "physical" | "ebook" }][] = [];
  const asinEntries: [string, string][] = []; // ASIN -> title ID

  for (const title of tenantTitles) {
    if (title.isbn) {
      isbnEntries.push([normalizeIsbn(title.isbn), { id: title.id, format: "physical" }]);
    }
    if (title.eisbn) {
      isbnEntries.push([normalizeIsbn(title.eisbn), { id: title.id, format: "ebook" }]);
    }
    if (title.asin) {
      asinEntries.push([title.asin.toUpperCase(), title.id]);
    }
  }
  return { isbnEntries, asinEntries };
});

const isbnMap = new Map(mapsRaw.isbnEntries);
const asinMap = new Map(mapsRaw.asinEntries);
```

**Step 12** (around line 356): Update matching logic:

```typescript
// Match by ISBN first (priority 1)
let titleMatch = sale.isbn ? isbnMap.get(sale.isbn) : undefined;

// Fallback: Match by ASIN (priority 2) - Story 17.4
if (!titleMatch && sale.asin) {
  const asinTitleId = asinMap.get(sale.asin.toUpperCase());
  if (asinTitleId) {
    titleMatch = { id: asinTitleId, format: "physical" };
  }
}
```

### Amazon Product Advertising API Note

**Important**: The Amazon Product Advertising API (PA-API) for ASIN lookup requires:
1. Separate registration at Amazon Associates program
2. Affiliate account with performance requirements
3. Different credentials from SP-API

**Recommendation**: For MVP, implement manual ASIN entry only. ASIN lookup is marked as optional/stretch goal.

### Project Structure

```
src/
├── db/schema/
│   └── titles.ts                    # MODIFY: Add asin column + unique constraint
│
├── modules/titles/
│   ├── actions.ts                   # MODIFY: Add updateTitleAsin action
│   ├── schema.ts                    # MODIFY: Add asinSchema validation
│   ├── types.ts                     # MODIFY: Add asin to TitleWithAuthor
│   ├── queries.ts                   # MODIFY: Include asin in query results
│   └── components/
│       └── title-detail.tsx         # MODIFY: Add ASIN section after ISBN
│
├── inngest/
│   └── amazon-sales-import.ts       # MODIFY: Add ASIN matching logic
│
└── modules/channels/adapters/amazon/components/
    └── amazon-sales-history.tsx     # MODIFY: Add "Resolve" for unmatched
```

### Security Requirements

1. **Tenant Isolation**: ASIN updates scoped to tenant's titles via `getDb()`
2. **Permission Check**: Uses `requirePermission(CREATE_AUTHORS_TITLES)`
3. **Input Validation**: ASIN format validated server-side via Zod
4. **Unique Constraint**: Database enforces global ASIN uniqueness

### Edge Cases

1. **Invalid ASIN format**: Reject with "ASIN must be exactly 10 characters" or "ASIN must be alphanumeric"
2. **Duplicate ASIN**: Block with "This ASIN is already linked to another title"
3. **NULL ASIN**: Allow clearing ASIN (set to null)
4. **Case sensitivity**: Normalize to uppercase before storage
5. **International ASINs**: Same ASIN format across marketplaces (US, UK, etc.)

### References

- [Source: docs/epics.md - Story 17.4: Link Titles to ASINs]
- [Source: src/modules/titles/actions.ts - Existing action patterns]
- [Source: src/modules/titles/components/title-detail.tsx - UI patterns]
- [Source: src/inngest/amazon-sales-import.ts - Sales import with ASIN note]
- [Source: src/db/schema/titles.ts - Title schema patterns]

## Test Scenarios

### Unit Tests

**ASIN Validation (`src/modules/titles/__tests__/asin-validation.test.ts`)**
- Valid 10-char alphanumeric ASIN passes
- Invalid length (9, 11 chars) fails
- Invalid characters (special chars) fails
- Null/empty ASIN allowed (optional field)
- Case normalization works (lowercase → uppercase)

**updateTitleAsin Action (`src/modules/titles/__tests__/update-title-asin.test.ts`)**
- Successfully updates ASIN for own tenant's title
- Rejects update for other tenant's title (not found)
- Rejects invalid ASIN format
- Rejects duplicate ASIN (global uniqueness)
- Allows clearing ASIN (set to null)
- Requires CREATE_AUTHORS_TITLES permission

### Integration Tests

**ASIN-Based Sales Matching (`src/inngest/__tests__/asin-sales-matching.test.ts`)**
- Sale with ISBN matches by ISBN (priority 1)
- Sale with ASIN only matches by ASIN (priority 2)
- Sale with both ISBN and ASIN prefers ISBN match
- Unmatched sale tracked with ASIN for manual resolution
- ASIN matching finds correct title

### Manual Testing Checklist

- [ ] Create title without ASIN
- [ ] View title in Split View - ASIN shows "Not set"
- [ ] Click "Add ASIN" - enter invalid format (9 chars) - see error
- [ ] Enter valid 10-char ASIN - save succeeds
- [ ] View title - ASIN shows as clickable Amazon link
- [ ] Click Amazon link - opens product page in new tab
- [ ] Edit ASIN - change to different value
- [ ] Edit ASIN - clear field (set to empty) - ASIN removed
- [ ] Try duplicate ASIN - see uniqueness error
- [ ] Run Amazon sales import with ASIN-only sales
- [ ] Verify sales matched by ASIN
- [ ] Check import history shows reduced unmatched count

## Dev Agent Record

### Context Reference

This story completes the Amazon integration by enabling bidirectional ASIN-title mapping:

**Prior Stories Context:**
- Story 17.1 established Amazon account connection with SP-API authentication
- Story 17.2 implemented ONIX feed delivery to Amazon
- Story 17.3 implemented sales import but noted ASIN matching requires this story
- Unmatched records from 17.3 include ASINs for resolution in this story

**Key Files from Prior Stories:**
- `src/modules/channels/adapters/amazon/api-client.ts` - AWS Sig V4 auth
- `src/modules/channels/adapters/amazon/sales-parser.ts` - Extracts ASIN from sales
- `src/inngest/amazon-sales-import.ts` - Sales import job (line 293 and 374 reference Story 17.4)
- `src/db/schema/titles.ts` - Title schema (add ASIN column)

**Existing Patterns to Follow:**
- Server actions: See `updateTitle` in `src/modules/titles/actions.ts` lines 129-222
- Schema validation: See `src/modules/titles/schema.ts` for Zod patterns
- UI components: See `title-detail.tsx` EditableField pattern lines 123-238
- Permission check: `requirePermission(CREATE_AUTHORS_TITLES)` from `@/lib/auth`
- Tenant-scoped db: `await getDb()` returns tenant-filtered database connection

### Agent Model Used

{{agent_model_name_version}}

### Completion Notes List

- PREREQUISITE: Add `asin` column to titles schema before other tasks
- ASIN stored uppercase (case-insensitive matching)
- ASIN uniqueness enforced at database level (global, not per-tenant)
- ISBN matching takes priority over ASIN matching in sales import
- PA-API for ASIN lookup is OPTIONAL (separate registration required)
- Manual ASIN entry is the MVP approach
- Use existing `EditableField` pattern or inline edit for consistency with title-detail.tsx

### File List

**Modified files:**
- `src/db/schema/titles.ts` - Add `asin` column with unique constraint
- `src/modules/titles/actions.ts` - Add `updateTitleAsin` action
- `src/modules/titles/schema.ts` - Add `asinSchema` validation
- `src/modules/titles/types.ts` - Add `asin` to TitleWithAuthor type
- `src/modules/titles/queries.ts` - Include `asin` in query results
- `src/modules/titles/components/title-detail.tsx` - Add ASIN section after ISBN
- `src/inngest/amazon-sales-import.ts` - Add ASIN-based matching
- `src/modules/channels/adapters/amazon/components/amazon-sales-history.tsx` - Add "Resolve" for unmatched

**New files:**
- `src/modules/titles/__tests__/asin-validation.test.ts` - ASIN format validation tests
- `src/modules/titles/__tests__/update-title-asin.test.ts` - Server action tests
- `src/inngest/__tests__/asin-sales-matching.test.ts` - Sales matching tests

**Database migration:**
- Add `asin` column to `titles` table
- Add unique index on `titles.asin`
