# Story 11.2: Track Annual Earnings for 1099 Threshold

**Status:** code-complete

## Story

**As the** system,
**I want** to track annual earnings per author for 1099 threshold determination,
**So that** we know which authors require 1099 forms.

## Acceptance Criteria

### AC-11.2.1: 1099 Preparation Report Page

- [x] New report accessible at `/reports/tax-preparation`
- [x] Report is accessible only to Finance, Admin, and Owner roles
- [x] Report has a year selector defaulting to current calendar year
- [x] Report title clearly indicates "1099 Preparation Report"

### AC-11.2.2: Annual Earnings Calculation

- [x] **CRITICAL:** Query MUST include `eq(statements.tenant_id, tenantId)` as FIRST filter condition
- [x] Earnings calculated from all statements (draft, sent, failed) where `period_end` falls within calendar year
- [x] Use `net_payable` field from statements as earnings amount
- [x] Sum all statements per author for total annual earnings
- [x] Handle legacy `author_id` relations via migration compatibility query (see Dev Notes)
- [x] Filter to only US-based authors (`is_us_based = true`) - use CURRENT status
- [x] Filter to only active contacts (`status = 'active'`)

### AC-11.2.3: Author Listing with Earnings

- [x] Report displays all US-based authors (contacts with Author role) who have earnings > $0 in selected year
- [x] Each row shows:
  - Author name (from `contacts.name`)
  - TIN status: "Provided" if `tin_encrypted IS NOT NULL`, else "Missing"
  - TIN type: "SSN" or "EIN" (from `tin_type` field), blank if TIN missing
  - Annual earnings (formatted as currency via `formatCurrency()`)
  - 1099 required: "Yes" if earnings >= $600, else "No"
  - W-9 status: "Received" if `w9_received = true`, else "Missing"
- [x] Table sortable by earnings (descending default) and name
- [x] W-9 received DATE is NOT displayed (status only)

### AC-11.2.4: $600 Threshold Flagging

- [x] Authors earning **>= $600** (not > $600) flagged as requiring 1099
- [x] Green badge for "Yes" (requires 1099)
- [x] Gray badge for "No" (below threshold)
- [x] Warning icon on rows where requires1099=true AND tinStatus="Missing"

### AC-11.2.5: Filtering Capabilities

- [x] Year selector dropdown (current year default, last 5 years available)
- [x] 1099 Required filter: All / Required / Not Required
- [x] TIN Status filter: All / Provided / Missing
- [x] W-9 Status filter: All / Received / Missing
- [x] Filters combinable (AND logic)
- [x] Filter state managed via React useState (matching existing report patterns)

### AC-11.2.6: Summary Statistics

- [x] Four stat cards (copy pattern from `liability-summary-stats.tsx` lines 41-143):
  - Total Authors: count of authors with earnings in year
  - Requiring 1099: count where earnings >= $600
  - Total Earnings: sum of all earnings (formatted currency)
  - Missing TIN: count where requires1099=true AND tinStatus="missing"
- [x] Stats calculated from UNFILTERED data (show totals regardless of filter)

### AC-11.2.7: Missing TIN Warning System

- [x] Warning Alert (shadcn Alert, variant="warning") when Missing TIN count > 0
- [x] Message: "{count} author(s) earning $600+ are missing Tax ID information"
- [x] Link to `/contacts?role=author` to address issues
- [x] Alert positioned between filters and table

### AC-11.2.8: Data Export

- [x] Export CSV button in table header area
- [x] Filename: `1099-preparation-{year}.csv`
- [x] CSV columns: Name, TIN Status, TIN Type, Annual Earnings, 1099 Required, W-9 Status
- [x] **SECURITY:** NEVER include `tin_encrypted` or actual TIN value
- [x] Safe to include: `tin_type` ("SSN"/"EIN"), calculated status ("Provided"/"Missing")
- [x] Use CSV escaping pattern from `exportAuditLogsCsv` in `reports/queries.ts`

## Tasks / Subtasks

- [x] **Task 0: Migration Status Verification** **[DO THIS FIRST]**
  - [x] Run: `SELECT COUNT(*) FROM statements WHERE contact_id IS NULL AND author_id IS NOT NULL`
  - [x] If count > 0: Implement UNION query for legacy compatibility
  - [x] If count = 0: Use contact_id-only query (simpler)
  - [x] Document finding in completion notes

- [x] **Task 1: Database Query Implementation** (AC: 11.2.2) **[CRITICAL]**
  - [x] Create `src/modules/reports/queries/tax-preparation.ts`
  - [x] Implement `getAnnualEarningsByAuthor(tenantId, year)` - see query pattern below
  - [x] Implement `getTaxPreparationStats(tenantId, year)` for summary stats
  - [x] **CRITICAL:** tenant_id filter MUST be FIRST in WHERE clause
  - [x] Use Decimal.js for all financial calculations
  - [x] Return `ActionResult<T>` type wrapper for consistency

- [x] **Task 2: Zod Schema for Filters** (AC: 11.2.5)
  - [x] Add to `src/modules/reports/schema.ts`:
    ```typescript
    export const taxPreparationFilterSchema = z.object({
      year: z.number().int().min(2020).max(2100),
      requires1099: z.enum(["all", "required", "not-required"]).default("all"),
      tinStatus: z.enum(["all", "provided", "missing"]).default("all"),
      w9Status: z.enum(["all", "received", "missing"]).default("all"),
    });
    export type TaxPreparationFilterInput = z.infer<typeof taxPreparationFilterSchema>;
    ```

- [x] **Task 3: Report Page Route** (AC: 11.2.1)
  - [x] Create `src/app/(dashboard)/reports/tax-preparation/page.tsx`
  - [x] Permission check pattern:
    ```typescript
    import { requirePermission } from "@/lib/auth";
    export default async function TaxPreparationPage() {
      await requirePermission(["finance", "admin", "owner"]);
      // ... fetch data and render
    }
    ```

- [x] **Task 4: Summary Stats Component** (AC: 11.2.6)
  - [x] Create `src/modules/reports/components/tax-preparation-stats.tsx`
  - [x] Copy structure from `liability-summary-stats.tsx` lines 41-143
  - [x] Icons: Users, FileCheck, DollarSign, AlertTriangle (from lucide-react)

- [x] **Task 5: Filter Controls Component** (AC: 11.2.5)
  - [x] Create `src/modules/reports/components/tax-preparation-filters.tsx`
  - [x] Year: Select with options [currentYear, currentYear-1, ..., currentYear-4]
  - [x] Other filters: Select components with All/specific options

- [x] **Task 6: Author Earnings Table Component** (AC: 11.2.3, 11.2.4)
  - [x] Create `src/modules/reports/components/tax-preparation-table.tsx`
  - [x] Use shadcn Table components
  - [x] Implement client-side sorting (name, earnings)
  - [x] Badge colors: green for Yes, gray for No
  - [x] AlertTriangle icon (text-yellow-600) for missing TIN on $600+ authors

- [x] **Task 7: Missing TIN Warning Alert** (AC: 11.2.7)
  - [x] Inline in client component or separate `tax-preparation-warning.tsx`
  - [x] Use shadcn Alert with `variant="warning"`

- [x] **Task 8: Client Component Assembly** (AC: all)
  - [x] Create `src/modules/reports/components/tax-preparation-client.tsx`
  - [x] State management pattern (from `sales-report-client.tsx`):
    ```typescript
    const [filters, setFilters] = useState<TaxPreparationFilterInput>(defaultFilters);
    const [data, setData] = useState<AuthorEarnings[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    ```

- [x] **Task 9: CSV Export Implementation** (AC: 11.2.8)
  - [x] Add export button to table header
  - [x] CSV generation pattern (from `liability-export-button.tsx`):
    ```typescript
    const escapeCSV = (value: string | number | null): string => {
      if (value === null) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    ```
  - [x] Download via Blob/createObjectURL pattern

- [x] **Task 10: Navigation Integration**
  - [x] Add "Tax Preparation" to reports navigation
  - [x] Conditionally render based on role

- [x] **Task 11: Comprehensive Testing** (AC: all)
  - [x] See detailed test cases below

## Dev Notes

### CRITICAL: Security Requirements

**TIN Data Handling:**
1. `tin_encrypted` - AES-256-GCM encrypted, NEVER decrypt for this report
2. `tin_type` - Plain text "ssn" or "ein", safe to display/export
3. `tin_last_four` - Masked "1234" format, safe to display (NOT used in this story)
4. TIN Status derived: `tin_encrypted !== null ? "provided" : "missing"`

**CSV Export Security:**
- NEVER include `tin_encrypted` column
- NEVER attempt to decrypt TIN
- Safe columns: Name, TIN Status (calculated), TIN Type, Earnings, 1099 Required, W-9 Status

### CRITICAL: Multi-Tenant Isolation

```typescript
// ALWAYS use tenant_id as FIRST filter condition
.where(
  and(
    eq(statements.tenant_id, tenantId),  // FIRST - prevents cross-tenant leaks
    gte(statements.period_end, yearStart),
    lte(statements.period_end, yearEnd),
    // ... other conditions
  )
)
```

### Database Schema Reference

**Contacts Tax Fields** (`src/db/schema/contacts.ts`):
| Field | Type | Description |
|-------|------|-------------|
| `tin_encrypted` | TEXT | AES-256-GCM encrypted TIN (NEVER export) |
| `tin_type` | TEXT | 'ssn' or 'ein' (safe to export) |
| `tin_last_four` | TEXT | Last 4 digits for display (not used here) |
| `is_us_based` | BOOLEAN | Required for 1099 (default: true) |
| `w9_received` | BOOLEAN | W-9 form received (default: false) |
| `w9_received_date` | TIMESTAMP | Date received (NOT displayed in this story) |

**Statements Fields** (`src/db/schema/statements.ts`):
| Field | Type | Description |
|-------|------|-------------|
| `net_payable` | DECIMAL(10,2) | Amount payable to author |
| `period_end` | DATE | End of statement period (use for year filtering) |
| `contact_id` | UUID | FK to contacts (new pattern) |
| `author_id` | UUID | FK to authors (legacy, nullable) |
| `tenant_id` | UUID | Multi-tenant isolation |
| `status` | TEXT | 'draft', 'sent', 'failed' (include ALL) |

### Query Implementation

```typescript
// src/modules/reports/queries/tax-preparation.ts
import { db } from "@/db";
import { statements, contacts, contactRoles } from "@/db/schema";
import { and, eq, gte, lte, sum, isNotNull } from "drizzle-orm";
import Decimal from "decimal.js";

const IRS_1099_THRESHOLD = 600;

export interface AuthorEarnings {
  contactId: string;
  name: string;
  email: string | null;
  tinStatus: "provided" | "missing";
  tinType: "ssn" | "ein" | null;
  isUsBased: boolean;
  w9Received: boolean;
  annualEarnings: number;
  requires1099: boolean;
}

export interface TaxPreparationStats {
  totalAuthors: number;
  authorsRequiring1099: number;
  totalEarnings: number;
  authorsMissingTin: number;
}

export async function getAnnualEarningsByAuthor(
  tenantId: string,
  year: number
): Promise<AuthorEarnings[]> {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const results = await db
    .select({
      contactId: contacts.id,
      name: contacts.name,
      email: contacts.email,
      tinEncrypted: contacts.tin_encrypted,
      tinType: contacts.tin_type,
      isUsBased: contacts.is_us_based,
      w9Received: contacts.w9_received,
      totalEarnings: sum(statements.net_payable).as("total_earnings"),
    })
    .from(statements)
    .innerJoin(contacts, eq(statements.contact_id, contacts.id))
    .innerJoin(
      contactRoles,
      and(
        eq(contactRoles.contact_id, contacts.id),
        eq(contactRoles.role, "author")
      )
    )
    .where(
      and(
        eq(statements.tenant_id, tenantId), // CRITICAL: tenant_id FIRST
        gte(statements.period_end, yearStart),
        lte(statements.period_end, yearEnd),
        eq(contacts.is_us_based, true),
        eq(contacts.status, "active")
      )
    )
    .groupBy(
      contacts.id,
      contacts.name,
      contacts.email,
      contacts.tin_encrypted,
      contacts.tin_type,
      contacts.is_us_based,
      contacts.w9_received
    );

  return results.map((row) => {
    const earnings = new Decimal(row.totalEarnings || 0).toNumber();
    return {
      contactId: row.contactId,
      name: row.name,
      email: row.email,
      tinStatus: row.tinEncrypted ? "provided" : "missing",
      tinType: row.tinType as "ssn" | "ein" | null,
      isUsBased: row.isUsBased ?? true,
      w9Received: row.w9Received ?? false,
      annualEarnings: earnings,
      requires1099: earnings >= IRS_1099_THRESHOLD,
    };
  });
}

export function calculateStats(authors: AuthorEarnings[]): TaxPreparationStats {
  const requiring1099 = authors.filter((a) => a.requires1099);
  return {
    totalAuthors: authors.length,
    authorsRequiring1099: requiring1099.length,
    totalEarnings: authors.reduce((sum, a) => sum + a.annualEarnings, 0),
    authorsMissingTin: requiring1099.filter((a) => a.tinStatus === "missing").length,
  };
}
```

### Legacy author_id Compatibility

If Task 0 reveals statements with `contact_id IS NULL`:

```typescript
// Alternative: UNION query for migration compatibility
const legacyResults = await db
  .select({ /* same fields */ })
  .from(statements)
  .innerJoin(authors, eq(statements.author_id, authors.id))
  .innerJoin(contacts, eq(authors.contact_id, contacts.id)) // authors.contact_id links to contacts
  .where(
    and(
      eq(statements.tenant_id, tenantId),
      isNull(statements.contact_id), // Only legacy records
      // ... same date/status filters
    )
  );

// Combine: [...modernResults, ...legacyResults]
```

### Permission Check Pattern

```typescript
// src/lib/auth.ts exports this pattern
export async function requirePermission(allowedRoles: UserRole[]): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  if (!user.is_active || !allowedRoles.includes(user.role as UserRole)) {
    throw new Error("UNAUTHORIZED");
  }
}

// Usage in page.tsx:
await requirePermission(["finance", "admin", "owner"]);
```

### CSV Export Pattern

```typescript
// From liability-export-button.tsx - reuse this pattern
const escapeCSV = (value: string | number | null): string => {
  if (value === null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const generateCSV = (data: AuthorEarnings[], year: number): string => {
  const headers = "Name,TIN Status,TIN Type,Annual Earnings,1099 Required,W-9 Status";
  const rows = data.map((a) =>
    [
      escapeCSV(a.name),
      escapeCSV(a.tinStatus === "provided" ? "Provided" : "Missing"),
      escapeCSV(a.tinType?.toUpperCase() || ""),
      escapeCSV(formatCurrency(a.annualEarnings)),
      escapeCSV(a.requires1099 ? "Yes" : "No"),
      escapeCSV(a.w9Received ? "Received" : "Missing"),
    ].join(",")
  );
  return [headers, ...rows].join("\n");
};

// Download trigger
const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
const url = URL.createObjectURL(blob);
const link = document.createElement("a");
link.href = url;
link.download = `1099-preparation-${year}.csv`;
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
URL.revokeObjectURL(url);
```

### Required Test Cases (Task 11)

**Query Tests** (`tests/unit/tax-preparation-queries.test.ts`):
```typescript
describe("getAnnualEarningsByAuthor", () => {
  // Threshold boundary tests
  test("Author with exactly $600 earnings requires 1099", async () => {
    // Setup: author with net_payable = 600
    const result = await getAnnualEarningsByAuthor(tenantId, 2024);
    expect(result[0].requires1099).toBe(true);
  });

  test("Author with $599.99 earnings does NOT require 1099", async () => {
    // Setup: author with net_payable = 599.99
    const result = await getAnnualEarningsByAuthor(tenantId, 2024);
    expect(result[0].requires1099).toBe(false);
  });

  // Aggregation tests
  test("Multiple statements per author summed correctly", async () => {
    // Setup: 3 statements for same author: $200, $300, $150 = $650
    const result = await getAnnualEarningsByAuthor(tenantId, 2024);
    expect(result[0].annualEarnings).toBe(650);
  });

  // Date boundary tests
  test("Statement with period_end Dec 31 2024 included in 2024", async () => {
    // Setup: period_end = 2024-12-31
    const result = await getAnnualEarningsByAuthor(tenantId, 2024);
    expect(result.length).toBe(1);
  });

  test("Statement with period_end Jan 1 2025 NOT in 2024", async () => {
    // Setup: period_end = 2025-01-01
    const result = await getAnnualEarningsByAuthor(tenantId, 2024);
    expect(result.length).toBe(0);
  });

  // Filtering tests
  test("Non-US author excluded", async () => {
    // Setup: author with is_us_based = false
    const result = await getAnnualEarningsByAuthor(tenantId, 2024);
    expect(result.find(a => a.contactId === nonUsAuthorId)).toBeUndefined();
  });

  test("Inactive author excluded", async () => {
    // Setup: contact with status = 'inactive'
    const result = await getAnnualEarningsByAuthor(tenantId, 2024);
    expect(result.find(a => a.contactId === inactiveAuthorId)).toBeUndefined();
  });

  // Tenant isolation test
  test("Only returns data for specified tenant", async () => {
    // Setup: statements in tenant A and tenant B
    const resultA = await getAnnualEarningsByAuthor(tenantAId, 2024);
    const resultB = await getAnnualEarningsByAuthor(tenantBId, 2024);
    expect(resultA).not.toEqual(resultB);
  });

  // TIN status derivation
  test("TIN status 'provided' when tin_encrypted exists", async () => {
    // Setup: contact with tin_encrypted set
    const result = await getAnnualEarningsByAuthor(tenantId, 2024);
    expect(result[0].tinStatus).toBe("provided");
  });

  test("TIN status 'missing' when tin_encrypted is null", async () => {
    // Setup: contact without tin_encrypted
    const result = await getAnnualEarningsByAuthor(tenantId, 2024);
    expect(result[0].tinStatus).toBe("missing");
  });

  // Legacy compatibility (if applicable)
  test("Handles legacy author_id-only statements", async () => {
    // Setup: statement with author_id but contact_id = null
    // Only run if Task 0 found legacy data
  });
});
```

**E2E Tests** (`tests/e2e/tax-preparation.spec.ts`):
```typescript
describe("Tax Preparation Report", () => {
  test("Finance user can access report", async ({ page }) => {
    await loginAs(page, "finance");
    await page.goto("/reports/tax-preparation");
    await expect(page.locator("h1")).toContainText("1099 Preparation");
  });

  test("Editor user cannot access report", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/reports/tax-preparation");
    await expect(page).toHaveURL("/unauthorized");
  });

  test("Admin user can access report", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/reports/tax-preparation");
    await expect(page.locator("h1")).toContainText("1099 Preparation");
  });

  test("Owner user can access report", async ({ page }) => {
    await loginAs(page, "owner");
    await page.goto("/reports/tax-preparation");
    await expect(page.locator("h1")).toContainText("1099 Preparation");
  });

  test("Year filter changes results", async ({ page }) => {
    await loginAs(page, "finance");
    await page.goto("/reports/tax-preparation");
    await page.selectOption("[data-testid=year-filter]", "2023");
    // Verify data updates
  });

  test("CSV export downloads file", async ({ page }) => {
    await loginAs(page, "finance");
    await page.goto("/reports/tax-preparation");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.click("[data-testid=export-csv-button]"),
    ]);
    expect(download.suggestedFilename()).toMatch(/1099-preparation-\d{4}\.csv/);
  });

  test("CSV does NOT contain encrypted TIN", async ({ page }) => {
    // Download CSV and verify contents
    const csv = await downloadCSV(page);
    expect(csv).not.toContain("tin_encrypted");
    expect(csv).toContain("TIN Status"); // Has status column
  });
});
```

### File Locations Summary

| File | Purpose |
|------|---------|
| `src/app/(dashboard)/reports/tax-preparation/page.tsx` | Report page with permission check |
| `src/modules/reports/queries/tax-preparation.ts` | Database queries |
| `src/modules/reports/components/tax-preparation-stats.tsx` | Summary stat cards |
| `src/modules/reports/components/tax-preparation-filters.tsx` | Filter controls |
| `src/modules/reports/components/tax-preparation-table.tsx` | Author earnings table |
| `src/modules/reports/components/tax-preparation-client.tsx` | Client orchestrator |
| `src/modules/reports/schema.ts` | Add filter Zod schema |
| `tests/unit/tax-preparation-queries.test.ts` | Query unit tests |
| `tests/e2e/tax-preparation.spec.ts` | E2E tests |

### Code Reuse Reference Files

| Pattern | Source File | Lines |
|---------|-------------|-------|
| Stat Cards | `src/modules/reports/components/liability-summary-stats.tsx` | 41-143 |
| CSV Export | `src/modules/reports/components/liability-export-button.tsx` | 32-50 |
| CSV Escaping | `src/modules/reports/queries.ts` | 1254-1373 |
| Permission Check | `src/lib/auth.ts` | 119-137 |
| Filter State | `src/modules/reports/components/sales-report-client.tsx` | 48-80 |
| Contact Role Query | `src/modules/contacts/queries.ts` | 118-148 |

### Edge Cases

1. **Empty State:** No authors with earnings - show "No data for {year}" message
2. **$0 Earnings:** Authors with no statements excluded (query returns only earnings > 0)
3. **Mid-Year Status Change:** Use CURRENT `is_us_based` status (not historical)
4. **Future Year:** Disable years > current year in selector
5. **Negative net_payable:** Treat as valid (returns adjustment) - sum includes negatives
6. **Inactive Contact:** Excluded via `status = 'active'` filter

### Dependencies

**Prerequisites (all complete):**
- Story 11.1: Tax info fields on contacts
- Epic 5: Statements module
- Epic 7: Contacts with author role

**Enables:**
- Story 11.3: Generate 1099-MISC Forms

### References

- [Epic 11](docs/epics.md#epic-11-tax--compliance): FR120
- [Story 11.1](docs/sprint-artifacts/11-1-collect-and-validate-tax-identification-information.md): TIN implementation details
- [Statements Schema](src/db/schema/statements.ts): Statement structure
- [Contacts Schema](src/db/schema/contacts.ts): Tax field definitions
- [Reports Queries](src/modules/reports/queries.ts): Query patterns
- [IRS 1099-NEC](https://www.irs.gov/forms-pubs/about-form-1099-nec): $600 threshold

## Dev Agent Record

### Context Reference

Story 11.2 implements FR120: Track annual earnings for 1099 threshold determination.

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

- Build error: `"use server"` files can only export async functions - Fixed by extracting `calculateStats` and types to `tax-preparation-utils.ts`
- Build error: Date type mismatch in gte/lte - Fixed by using `new Date()` instead of string literals
- Build error: Number const export from server action - Fixed by not re-exporting `IRS_1099_THRESHOLD`
- Biome lint: Labels without associated controls - Fixed by using `<span id="">` with `aria-labelledby`

### Completion Notes List

- Task 0: Migration verification confirmed Story 7.3 migrated all statements to use `contact_id` - used simpler contact_id-only query approach
- Task 1-9: All components implemented following existing patterns from liability reports
- Task 10: Navigation integrated with role-based filtering (owner/admin/finance only, not editor)
- Task 11: 11 unit tests passing, E2E tests created for all major acceptance criteria
- Security: TIN data never exposed - only derived status ("provided"/"missing") and type ("SSN"/"EIN")

### File List

**New Files Created:**
- `src/app/(dashboard)/reports/tax-preparation/page.tsx` - Report page with permission check
- `src/modules/reports/queries/tax-preparation.ts` - Database queries (server actions)
- `src/modules/reports/queries/tax-preparation-utils.ts` - Pure utility functions and types
- `src/modules/reports/components/tax-preparation-stats.tsx` - Summary stat cards
- `src/modules/reports/components/tax-preparation-filters.tsx` - Filter controls
- `src/modules/reports/components/tax-preparation-table.tsx` - Author earnings table
- `src/modules/reports/components/tax-preparation-warning.tsx` - Missing TIN alert
- `src/modules/reports/components/tax-preparation-client.tsx` - Client orchestrator with CSV export
- `tests/unit/tax-preparation-queries.test.ts` - Unit tests (11 tests)
- `tests/e2e/tax-preparation.spec.ts` - E2E tests

**Modified Files:**
- `src/modules/reports/schema.ts` - Added `taxPreparationFilterSchema`
- `src/app/(dashboard)/reports/page.tsx` - Added Tax Preparation card with role restriction

