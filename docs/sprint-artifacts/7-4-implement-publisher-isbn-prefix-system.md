# Story 7.4: Implement Publisher ISBN Prefix System

**Status:** completed

## Story

**As an** administrator,
**I want** to register publisher ISBN prefixes and auto-generate ISBN ranges,
**So that** ISBN management reflects real-world publisher prefix allocation.

## Acceptance Criteria

### AC-7.4.1: ISBN Prefix Schema
- [x] Create `isbn_prefixes` table with columns:
  - `id` (UUID, primary key)
  - `tenant_id` (UUID, FK to tenants, NOT NULL)
  - `prefix` (text, NOT NULL) - Publisher prefix (e.g., "978-1-234567")
  - `block_size` (integer, NOT NULL) - 10, 100, 1000, 10000, 100000, 1000000
  - `type` (text, NOT NULL) - "physical" or "ebook" (same enum as isbns.type)
  - `description` (text, optional) - User-friendly name for prefix
  - `total_isbns` (integer, NOT NULL) - Total ISBNs in this block
  - `available_count` (integer, NOT NULL) - Currently unassigned ISBNs
  - `assigned_count` (integer, NOT NULL) - Assigned to titles
  - `generation_status` (text, NOT NULL) - "pending", "generating", "completed", "failed"
  - `generation_error` (text, nullable) - Error message if generation failed
  - `created_at`, `updated_at` (timestamps)
  - `created_by_user_id` (UUID, FK to users)
- [x] Add unique constraint on `(tenant_id, prefix)` - same prefix can't be registered twice per tenant
- [x] Add CHECK constraint on block_size: must be one of 10, 100, 1000, 10000, 100000, 1000000
- [x] Add `prefix_id` column to `isbns` table (UUID, FK to isbn_prefixes, nullable)
- [x] Existing ISBNs without prefix_id are considered "legacy" imports

### AC-7.4.2: Prefix Settings Page
- [x] Create route `/settings/isbn-prefixes`
- [x] Page displays:
  - "Add Prefix" button (opens registration form)
  - Prefix management table (see AC-7.4.4)
  - Empty state when no prefixes registered
- [x] Access restricted to Admin and Owner roles only

### AC-7.4.3: Prefix Registration Form
- [x] Modal or inline form with:
  - **Publisher prefix input**: Text field for ISBN prefix (e.g., "978-1-234567")
    - Validate format: Must start with 978 or 979
    - Validate: 7-12 digits (including GS1 prefix)
    - Show formatted preview with hyphens
  - **Block size selection**: Dropdown with options:
    - 10 ISBNs
    - 100 ISBNs
    - 1,000 ISBNs
    - 10,000 ISBNs
    - 100,000 ISBNs
    - 1,000,000 ISBNs
  - **Type selection**: Physical or Ebook (radio buttons)
  - **Description**: Optional text field for naming the prefix
- [x] On submit:
  - Validate prefix is not already registered for this tenant
  - Create isbn_prefixes record with `generation_status = "pending"`
  - For block_size <= 1000: Generate ISBNs synchronously
  - For block_size > 1000: Queue Inngest job for async generation
  - Show toast with generation status

### AC-7.4.4: Prefix Management Table
- [x] Table columns:
  - Prefix (formatted with hyphens)
  - Block Size (formatted: "10", "100", "1K", "10K", "100K", "1M")
  - Type (Physical/Ebook badge)
  - Total ISBNs
  - Available (count + percentage)
  - Assigned (count)
  - Status badge (generating/completed/failed)
  - Actions (expand, delete if unused)
- [x] Expandable row shows:
  - First 50 ISBNs in the block (paginated if needed)
  - Visual utilization bar (available vs assigned)
  - Generation timestamp and user who created
- [x] Delete action only enabled when all ISBNs in prefix are unassigned

### AC-7.4.5: ISBN Generation Algorithm
- [x] Generate full ISBN-13s from prefix:
  1. Take publisher prefix (e.g., "978-1-234567")
  2. Determine remaining digit positions (13 - prefix length - 1 for check digit)
  3. Generate sequential title identifiers (padded with leading zeros)
  4. Calculate ISBN-13 check digit for each using existing algorithm
  5. Insert ISBNs into `isbns` table with `prefix_id` set
- [x] Handle prefix validation:
  - Must start with "978" or "979"
  - Total length with title identifier + check digit must equal 13
  - Example: "978-1-234567" (10 digits) + 2 title digits + 1 check = 13
- [x] Use `validateIsbn13Checksum()` from `src/modules/isbn/utils.ts` for check digit calculation

### AC-7.4.6: Large Block Async Generation (Inngest)
- [x] Create Inngest job `isbn-prefix.generate` for blocks > 1000 ISBNs
- [x] Job behavior:
  - Batch insert ISBNs in chunks of 1000 (prevent timeout)
  - Update `isbn_prefixes.generation_status` to "generating" at start
  - Update `isbn_prefixes.generation_status` to "completed" on success
  - Update `isbn_prefixes.generation_status` to "failed" with error on failure
  - Log progress every 10,000 ISBNs
- [x] Show generation progress in UI (poll or real-time update)
- [x] Handle duplicate ISBNs gracefully (skip if already exists globally)

### AC-7.4.7: ISBN Pool Updates
- [x] Filter ISBN pool table by prefix (new filter option)
- [x] Show "Legacy" badge for ISBNs without prefix_id
- [x] ISBN pool report includes prefix breakdown
- [x] Update ISBN assignment to work with prefix-generated ISBNs (inherent - uses same isbns table)

## Tasks / Subtasks

- [x] **Task 1: Create Database Schema** (AC: 7.4.1)
  - [x] Create `src/db/schema/isbn-prefixes.ts` with table definition
  - [x] Add `prefix_id` column to `src/db/schema/isbns.ts`
  - [x] Update `src/db/schema/relations.ts` with prefix relations
  - [x] Update `src/db/schema/index.ts` to export new schema
  - [x] Generate and run Drizzle migration
  - [x] Add RLS policy for isbn_prefixes table (see Dev Notes)

- [x] **Task 2: Create Module Structure** (AC: 7.4.3, 7.4.5)
  - [x] Create `src/modules/isbn-prefixes/` directory with:
    - `types.ts` - TypeScript types and interfaces
    - `schema.ts` - Zod validation schemas
    - `queries.ts` - Database queries
    - `actions.ts` - Server actions
    - `utils.ts` - ISBN generation utilities
  - [x] Implement `generateIsbnCheckDigit()` function (extract from existing utils)
  - [x] Implement `generateIsbnRange()` function for sync generation
  - [x] Implement `validateIsbnPrefix()` function
  - [x] Implement `getMaxBlockSizeForPrefix()` and `validateBlockSizeForPrefix()` functions

- [x] **Task 3: Create Inngest Job** (AC: 7.4.6)
  - [x] Create `src/inngest/generate-isbn-prefixes.ts`
  - [x] Implement batched ISBN generation (1000 per batch)
  - [x] Handle errors and status updates
  - [x] Add event type to `src/inngest/client.ts` InngestEvents interface
  - [x] Export function in `src/inngest/functions.ts` array
  - [x] Implement progress polling in UI (useEffect with interval)

- [x] **Task 4: Create UI Components** (AC: 7.4.2, 7.4.3, 7.4.4)
  - [x] Create `src/modules/isbn-prefixes/components/` directory
  - [x] Create `isbn-prefix-form.tsx` - Registration form with validation
  - [x] Create `isbn-prefix-table.tsx` - Management table with expand
  - [x] Create `isbn-prefix-detail.tsx` - Expanded row content (inline in table.tsx)
  - [x] Create `isbn-prefix-utilization-bar.tsx` - Visual utilization (using Progress component)
  - [x] Create `isbn-prefix-status-badge.tsx` - Status display

- [x] **Task 5: Create Settings Page** (AC: 7.4.2)
  - [x] Create `src/app/(dashboard)/settings/isbn-prefixes/page.tsx`
  - [x] Add tab to `settingsNav` array in `src/app/(dashboard)/settings/layout.tsx`
  - [x] Implement permission check (Admin/Owner only)
  - [x] Wire up components with server actions
  - [x] Add optimistic UI updates during async generation

- [x] **Task 6: Update ISBN Pool** (AC: 7.4.7)
  - [x] Add prefix filter to `src/modules/isbn/components/isbn-pool-filters.tsx`
  - [x] Update ISBN pool table to show prefix/legacy badge
  - [x] Update `src/modules/reports/components/isbn-pool-insights.tsx` for prefix breakdown

- [x] **Task 7: Write Tests** (AC: all)
  - [x] Unit tests for ISBN generation algorithm (check digit calculation)
  - [x] Unit tests for prefix validation
  - [x] Integration tests for prefix creation with sync generation
  - [x] Integration tests for prefix creation with async generation (mock Inngest)
  - [x] E2E test for prefix settings page workflow

## Dev Notes

### Functional Requirements Coverage

This story implements:
- **FR88**: Register publisher ISBN prefixes
- **FR89**: Auto-generate ISBN range from prefix
- **FR90**: Organize ISBN pool by prefix (via prefix_id FK)
- **FR91**: View ISBN pool by prefix and block (via prefix filter)
- **FR92**: Validate ISBN prefix format

### Architecture Compliance

**File Locations:**
- Schema: `src/db/schema/isbn-prefixes.ts` (follows existing pattern)
- Module: `src/modules/isbn-prefixes/` (new feature module)
- Page: `src/app/(dashboard)/settings/isbn-prefixes/page.tsx`
- Inngest: `src/inngest/generate-isbn-prefixes.ts`

**Module Structure Pattern (from architecture.md:699-711):**
```
src/modules/isbn-prefixes/
├── components/          # Feature-specific UI components
│   ├── isbn-prefix-form.tsx
│   ├── isbn-prefix-table.tsx
│   ├── isbn-prefix-detail.tsx
│   ├── isbn-prefix-utilization-bar.tsx
│   └── isbn-prefix-status-badge.tsx
├── actions.ts           # Server Actions
├── queries.ts           # Database queries
├── schema.ts            # Zod validation schemas
├── types.ts             # TypeScript types
└── utils.ts             # ISBN generation utilities
```

### ISBN-13 Check Digit Algorithm

**CRITICAL: Reuse existing implementation from `src/modules/isbn/utils.ts:44-62`**

The check digit algorithm is already implemented. To generate ISBNs:

```typescript
// Extract from existing utils.ts or create wrapper
export function calculateIsbn13CheckDigit(first12Digits: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const weight = i % 2 === 0 ? 1 : 3;
    sum += parseInt(first12Digits[i], 10) * weight;
  }
  return (10 - (sum % 10)) % 10;
}

// Generate full ISBN-13 from prefix and title identifier
export function generateIsbn13(prefix: string, titleId: number, totalDigits: number): string {
  const normalizedPrefix = prefix.replace(/[-\s]/g, "");
  const titleIdentifierLength = 12 - normalizedPrefix.length;
  const titleIdentifier = titleId.toString().padStart(titleIdentifierLength, "0");
  const first12 = normalizedPrefix + titleIdentifier;
  const checkDigit = calculateIsbn13CheckDigit(first12);
  return first12 + checkDigit;
}
```

### Prefix Length and Block Size Relationship

| Prefix Length | Title ID Digits | Max Block Size |
|---------------|-----------------|----------------|
| 7 digits (978-X) | 5 | 100,000 |
| 8 digits (978-XX) | 4 | 10,000 |
| 9 digits (978-XXX) | 3 | 1,000 |
| 10 digits (978-X-XXXXXX) | 2 | 100 |
| 11 digits | 1 | 10 |
| 12 digits | 0 | 1 (invalid) |

**Validation Rule:** Block size must not exceed max possible for prefix length.

### Database Schema Definition

```typescript
// src/db/schema/isbn-prefixes.ts
import { check, index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";

export const isbnPrefixBlockSizes = [10, 100, 1000, 10000, 100000, 1000000] as const;
export type IsbnPrefixBlockSize = (typeof isbnPrefixBlockSizes)[number];

export const isbnPrefixGenerationStatusValues = ["pending", "generating", "completed", "failed"] as const;
export type IsbnPrefixGenerationStatus = (typeof isbnPrefixGenerationStatusValues)[number];

export const isbnPrefixes = pgTable(
  "isbn_prefixes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    prefix: text("prefix").notNull(),
    block_size: integer("block_size").notNull(),
    type: text("type", { enum: ["physical", "ebook"] }).notNull(),
    description: text("description"),
    total_isbns: integer("total_isbns").notNull(),
    available_count: integer("available_count").notNull(),
    assigned_count: integer("assigned_count").notNull().default(0),
    generation_status: text("generation_status", {
      enum: isbnPrefixGenerationStatusValues
    }).notNull().default("pending"),
    generation_error: text("generation_error"),
    created_by_user_id: uuid("created_by_user_id").references(() => users.id),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantPrefixUnique: unique("isbn_prefixes_tenant_prefix_unique").on(table.tenant_id, table.prefix),
    tenantIdIdx: index("isbn_prefixes_tenant_id_idx").on(table.tenant_id),
    blockSizeCheck: check("valid_block_size",
      sql`${table.block_size} IN (10, 100, 1000, 10000, 100000, 1000000)`),
  })
);
```

### RLS Policy for Multi-Tenant Isolation

**CRITICAL:** Add to migration file:
```sql
-- Enable RLS on isbn_prefixes
ALTER TABLE isbn_prefixes ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY "tenant_isolation" ON isbn_prefixes
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Grant permissions
GRANT ALL ON isbn_prefixes TO authenticated;
```

### Inngest Job Pattern

Follow existing pattern from `src/inngest/generate-statements-batch.ts`:

```typescript
// src/inngest/generate-isbn-prefixes.ts
import { inngest } from "./client";
import { adminDb } from "@/db";  // Use adminDb for background jobs (no user session)
import { isbnPrefixes } from "@/db/schema/isbn-prefixes";
import { isbns } from "@/db/schema/isbns";
import { generateIsbn13 } from "@/modules/isbn-prefixes/utils";
import { eq } from "drizzle-orm";

export const generateIsbnPrefix = inngest.createFunction(
  { id: "isbn-prefix-generate", name: "Generate ISBNs from Prefix" },
  { event: "isbn-prefix/generate" },
  async ({ event, step }) => {
    const { prefixId, tenantId } = event.data;

    // Step 1: Load prefix record
    const prefix = await step.run("load-prefix", async () => {
      return adminDb.query.isbnPrefixes.findFirst({
        where: eq(isbnPrefixes.id, prefixId),
      });
    });

    if (!prefix) throw new Error("Prefix not found");

    // Step 2: Update status to generating
    await step.run("update-status-generating", async () => {
      await adminDb.update(isbnPrefixes)
        .set({ generation_status: "generating", updated_at: new Date() })
        .where(eq(isbnPrefixes.id, prefixId));
    });

    // Step 3: Generate ISBNs in batches
    const batchSize = 1000;
    const totalBatches = Math.ceil(prefix.block_size / batchSize);

    for (let batch = 0; batch < totalBatches; batch++) {
      await step.run(`generate-batch-${batch}`, async () => {
        const startIdx = batch * batchSize;
        const endIdx = Math.min(startIdx + batchSize, prefix.block_size);
        const isbnRecords = [];

        for (let i = startIdx; i < endIdx; i++) {
          const isbn13 = generateIsbn13(prefix.prefix, i, prefix.block_size);
          isbnRecords.push({
            tenant_id: tenantId,
            isbn_13: isbn13,
            type: prefix.type,
            status: "available",
            prefix_id: prefixId,
          });
        }

        // Batch insert with conflict handling
        await adminDb.insert(isbns)
          .values(isbnRecords)
          .onConflictDoNothing({ target: isbns.isbn_13 });
      });
    }

    // Step 4: Update status to completed
    await step.run("update-status-completed", async () => {
      await adminDb.update(isbnPrefixes)
        .set({
          generation_status: "completed",
          available_count: prefix.block_size,
          updated_at: new Date(),
        })
        .where(eq(isbnPrefixes.id, prefixId));
    });

    return { success: true, generatedCount: prefix.block_size };
  }
);
```

### Inngest Event Type Registration

**CRITICAL:** Add to `src/inngest/client.ts`:
```typescript
export interface InngestEvents {
  // ... existing events
  "isbn-prefix/generate": {
    data: {
      prefixId: string;
      tenantId: string;
    };
  };
}
```

**CRITICAL:** Add to `src/inngest/functions.ts`:
```typescript
import { generateIsbnPrefix } from "./generate-isbn-prefixes";

export const functions = [
  generateStatementPdf,
  generateStatementsBatch,
  generateIsbnPrefix,  // <-- ADD THIS
];
```

### Block Size Validation Utilities

```typescript
// src/modules/isbn-prefixes/utils.ts

/**
 * Calculate maximum block size for a given prefix length
 * Prefix length + title ID digits + check digit = 13
 */
export function getMaxBlockSizeForPrefix(prefix: string): number {
  const normalizedLength = prefix.replace(/[-\s]/g, "").length;
  const titleIdDigits = 12 - normalizedLength;
  return Math.pow(10, titleIdDigits);
}

/**
 * Validate that block size doesn't exceed prefix capacity
 */
export function validateBlockSizeForPrefix(prefix: string, blockSize: number): boolean {
  const maxSize = getMaxBlockSizeForPrefix(prefix);
  return blockSize <= maxSize;
}

// Use in Zod schema with superRefine for cross-field validation
```

### Zod Validation Schema

```typescript
// src/modules/isbn-prefixes/schema.ts
import { z } from "zod";

export const isbnPrefixSchema = z.object({
  prefix: z.string()
    .min(7, "Prefix must be at least 7 digits")
    .max(12, "Prefix cannot exceed 12 digits")
    .refine((val) => {
      const normalized = val.replace(/[-\s]/g, "");
      return /^\d+$/.test(normalized);
    }, "Prefix must contain only digits and hyphens")
    .refine((val) => {
      const normalized = val.replace(/[-\s]/g, "");
      return normalized.startsWith("978") || normalized.startsWith("979");
    }, "Prefix must start with 978 or 979"),
  block_size: z.enum(["10", "100", "1000", "10000", "100000", "1000000"])
    .transform(Number),
  type: z.enum(["physical", "ebook"]),
  description: z.string().max(100).optional(),
});

export type IsbnPrefixInput = z.infer<typeof isbnPrefixSchema>;
```

### UI Component Patterns

**Form Validation (from Story 7.2):**
- Use `useForm` with `zodResolver`
- Use `toast.promise` for async operations
- Disable submit during generation

**Table Pattern (from existing components):**
- Use TanStack Table for prefix management table
- Expandable rows with additional details
- Action buttons with confirmation dialogs

### Permission Pattern

```typescript
// In actions.ts
export async function createIsbnPrefix(data: IsbnPrefixInput) {
  const user = await requirePermission(["admin", "owner"]);
  const tenantId = await getCurrentTenantId();
  // ... rest of implementation
}
```

### Settings Navigation Update

**CRITICAL:** Settings sub-navigation uses `src/app/(dashboard)/settings/layout.tsx`, NOT dashboard-nav.ts:

```typescript
// src/app/(dashboard)/settings/layout.tsx - Update settingsNav array
const settingsNav = [
  { href: "/settings", label: "General", exact: true },
  { href: "/settings/users", label: "Users", exact: false },
  { href: "/settings/isbn-import", label: "ISBN Import", exact: false },
  { href: "/settings/isbn-prefixes", label: "ISBN Prefixes", exact: false },  // ADD THIS
];
```

**Note:** `src/lib/dashboard-nav.ts` is for the main sidebar navigation, not settings tabs.

### Audit Logging

Log prefix creation for compliance tracking:

```typescript
// In actions.ts after successful prefix creation
import { logAuditEvent } from "@/lib/audit";

// After creating prefix record
logAuditEvent({
  tenantId,
  userId: user.id,
  actionType: "CREATE",
  resourceType: "setting",  // Use "setting" for configuration changes
  resourceId: newPrefix.id,
  changes: {
    after: {
      prefix: newPrefix.prefix,
      block_size: newPrefix.block_size,
      type: newPrefix.type,
    },
  },
  metadata: {
    feature: "isbn_prefix",
    generation_mode: blockSize > 1000 ? "async" : "sync",
  },
});
```

### Previous Story Learnings (7.1, 7.2, 7.3)

**From Story 7.2 (Contact Management):**
- Use `ActionResult<T>` return type for all server actions
- Use `requirePermission()` pattern for role checks
- Use `getDb()` from `@/lib/auth` (NOT direct db import)
- Use `logAuditEvent()` for tracking important operations

**From Story 7.3 (Author Migration):**
- Keep backward compatibility during transitions
- Use transaction wrappers for multi-step operations
- Batch operations for large data sets

### Testing Strategy

**Unit Tests:**
```typescript
describe("ISBN Generation", () => {
  test("calculates correct check digit", () => {
    expect(calculateIsbn13CheckDigit("978014028003")).toBe(5);
    expect(generateIsbn13("978-1-234567", 0, 100)).toBe("9781234567003");
  });

  test("validates prefix format", () => {
    expect(validateIsbnPrefix("978-1-234567").valid).toBe(true);
    expect(validateIsbnPrefix("123-1-234567").valid).toBe(false);
  });

  test("enforces block size limits", () => {
    // 10-digit prefix can only have 2 title digits = max 100
    expect(validatePrefixBlockSize("978-1-234567", 1000)).toBe(false);
    expect(validatePrefixBlockSize("978-1-234567", 100)).toBe(true);
  });
});
```

**Integration Tests:**
```typescript
describe("ISBN Prefix Creation", () => {
  test("creates prefix and generates ISBNs synchronously for small blocks", async () => {
    const result = await createIsbnPrefix({
      prefix: "978-1-234567",
      block_size: 100,
      type: "physical",
    });
    expect(result.success).toBe(true);

    const isbns = await getIsbnsByPrefix(result.data.id);
    expect(isbns.length).toBe(100);
  });

  test("queues Inngest job for large blocks", async () => {
    const result = await createIsbnPrefix({
      prefix: "978-1-23456",
      block_size: 10000,
      type: "ebook",
    });
    expect(result.success).toBe(true);
    expect(result.data.generation_status).toBe("pending");
    // Verify Inngest job was queued
  });
});
```

### Anti-Patterns to Avoid

1. **DO NOT** create new check digit calculation - reuse from `src/modules/isbn/utils.ts`
2. **DO NOT** generate ISBNs that might already exist globally - use `onConflictDoNothing`
3. **DO NOT** allow block sizes larger than prefix supports
4. **DO NOT** skip permission checks on any action
5. **DO NOT** run large generations synchronously - use Inngest for > 1000 ISBNs
6. **DO NOT** delete prefix if any ISBNs are assigned
7. **DO NOT** allow duplicate prefixes per tenant

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| ISBN collision | Use `onConflictDoNothing` + global unique constraint |
| Large generation timeout | Batch processing via Inngest |
| Invalid check digits | Comprehensive unit tests |
| Wrong block sizes | Validate against prefix length |
| Orphaned ISBNs | FK constraint on prefix_id |

### References

- [Source: docs/epics.md - Story 7.4](docs/epics.md#story-74-implement-publisher-isbn-prefix-system)
- [Source: docs/architecture.md - ISBN Management](docs/architecture.md#pattern-3-isbn-pool-management)
- [Source: src/modules/isbn/utils.ts](src/modules/isbn/utils.ts) - ISBN-13 checksum algorithm
- [Source: src/db/schema/isbns.ts](src/db/schema/isbns.ts) - ISBN table schema
- [Source: Story 7.1](docs/sprint-artifacts/7-1-create-unified-contact-database-schema.md) - Schema patterns
- [Source: Story 7.2](docs/sprint-artifacts/7-2-build-contact-management-interface.md) - Module patterns
- [Source: Story 7.3](docs/sprint-artifacts/7-3-migrate-authors-to-contacts.md) - Migration patterns

## Dev Agent Record

### Context Reference

Story 7.4 implements publisher ISBN prefix system allowing administrators to register ISBN prefixes and auto-generate ISBN ranges. This enhances ISBN management by organizing the ISBN pool by publisher prefix and supporting large block sizes (up to 1M ISBNs) via async Inngest jobs.

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Code review performed on 2025-12-06
- All issues identified and fixed in same session

### Completion Notes List

1. **Code Review Findings (2025-12-06)**:
   - CRIT-1: Story status was "ready-for-dev" but implementation existed → Fixed
   - CRIT-2: Task 6 (ISBN Pool Updates) was not implemented → Implemented prefix filter, Legacy badge, prefix breakdown component
   - CRIT-3: E2E test was missing → Created `tests/e2e/isbn-prefixes.spec.ts`
   - MED-1: CHECK constraint missing at DB level → Added `drizzle/migrations/0013_isbn_prefix_block_size_check.sql`

2. **All 88 unit tests passing** (isbn-prefixes-schema, isbn-prefixes-queries, isbn-prefixes-actions, isbn-prefixes-utils)

3. **Code Review Round 2 (2025-12-06)**:
   - CRIT-1: Database migration NOT applied - `relation "isbn_prefixes" does not exist` at runtime
     → Applied migration via `scripts/apply-isbn-prefixes-migration.mjs`
     → Applied RLS policy and CHECK constraint directly to database
   - MED-1: E2E test had misleading TODO comment about auth → Clarified that auth is handled by Playwright setup project
   - All code verified working after migration applied

### File List

**Files to Create:**
- `src/db/schema/isbn-prefixes.ts`
- `src/modules/isbn-prefixes/types.ts`
- `src/modules/isbn-prefixes/schema.ts`
- `src/modules/isbn-prefixes/queries.ts`
- `src/modules/isbn-prefixes/actions.ts`
- `src/modules/isbn-prefixes/utils.ts`
- `src/modules/isbn-prefixes/components/isbn-prefix-form.tsx`
- `src/modules/isbn-prefixes/components/isbn-prefix-table.tsx`
- `src/modules/isbn-prefixes/components/isbn-prefix-detail.tsx`
- `src/modules/isbn-prefixes/components/isbn-prefix-utilization-bar.tsx`
- `src/modules/isbn-prefixes/components/isbn-prefix-status-badge.tsx`
- `src/app/(dashboard)/settings/isbn-prefixes/page.tsx`
- `src/inngest/generate-isbn-prefixes.ts`
- `tests/unit/isbn-prefix-generation.test.ts`
- `tests/integration/isbn-prefix-creation.test.tsx`
- `tests/e2e/isbn-prefixes.spec.ts`
- `scripts/apply-isbn-prefixes-migration.mjs` - One-time migration script (run manually)

**Files to Modify:**
- `src/db/schema/isbns.ts` - Add prefix_id column
- `src/db/schema/relations.ts` - Add prefix relations
- `src/db/schema/index.ts` - Export new schema
- `src/inngest/client.ts` - Add event type to InngestEvents interface
- `src/inngest/functions.ts` - Add generateIsbnPrefix to functions array
- `src/app/(dashboard)/settings/layout.tsx` - Add ISBN Prefixes to settingsNav
- `src/modules/isbn/components/isbn-pool-filters.tsx` - Add prefix filter
- `src/modules/reports/components/isbn-pool-insights.tsx` - Add prefix breakdown
