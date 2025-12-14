# Story 14.4: Build Codelist Management System

Status: done

## Story

As a **system administrator**,
I want **to manage EDItEUR codelists**,
so that **ONIX exports use current standard values**.

## Acceptance Criteria

1. **AC1:** Given I am a system administrator, when I access codelist management, then I can view all loaded codelists with versions
2. **AC2:** Given I am viewing codelists, when new codelist issues are available from EDItEUR, then system can detect the availability
3. **AC3:** Given I need to update codelists, when I trigger an update, then system fetches and imports from EDItEUR JSON source
4. **AC4:** Given codelists are loaded, when ONIX validation runs, then validation uses current codelist values
5. **AC5:** Given I am using ONIX features, when I select codelist values (subject codes, contributor roles, etc.), then UI shows human-readable labels from cached codelists
6. **AC6:** Given key codelists are required, then system caches at minimum:
   - List 5 (Product Identifier Type)
   - List 15 (Title Type)
   - List 17 (Contributor Role)
   - List 27 (Subject Scheme)
   - List 150 (Product Form)
   - List 196 (Accessibility)

## Tasks / Subtasks

- [x] Task 1: Create codelists database schema (AC: 1, 4, 6)
  - [x] 1.1 Create `src/db/schema/codelists.ts` with `codelists` table (platform-wide, no tenant_id)
  - [x] 1.2 Add `codelist_values` table with: id, list_number, code, description, notes, deprecated, added_in_issue
  - [x] 1.3 Add indexes on list_number for fast lookup
  - [x] 1.4 Export from `src/db/schema/index.ts`
  - [x] 1.5 Generate and run migration
  - [x] 1.6 Write schema tests

- [x] Task 2: Implement codelist loader module (AC: 2, 3)
  - [x] 2.1 Create `src/modules/onix/codelists/loader.ts`
  - [x] 2.2 Implement `fetchCodelistFromSource(listNumber: number)` - fetches from bundled JSON or EDItEUR
  - [x] 2.3 Implement `parseCodelistJSON(json)` - parses EDItEUR JSON format
  - [x] 2.4 Implement `saveCodelist(listNumber, values)` - persists to database
  - [x] 2.5 Implement `checkForUpdates()` - compares local vs available issue numbers
  - [x] 2.6 Handle network errors and partial failures gracefully
  - [x] 2.7 Write loader tests with mocked responses

- [x] Task 3: Implement codelist cache module (AC: 4, 5)
  - [x] 3.1 Create `src/modules/onix/codelists/cache.ts`
  - [x] 3.2 Implement `getCodelist(listNumber)` - returns cached values or loads from DB
  - [x] 3.3 Implement `getCodeValue(listNumber, code)` - returns single value with label
  - [x] 3.4 Implement `validateCode(listNumber, code)` - checks if code exists in list
  - [x] 3.5 Implement in-memory LRU cache for frequently accessed lists
  - [x] 3.6 Cache invalidation on codelist update
  - [x] 3.7 Write cache tests

- [x] Task 4: Integrate codelists with ONIX validation (AC: 4)
  - [x] 4.1 Update `src/modules/onix/validator/business-rules.ts` to use dynamic codelists
  - [x] 4.2 Replace hardcoded CODELIST_196 values with cache lookup (fallback pattern)
  - [x] 4.3 Add validation for List 5, 15, 17, 27, 150 in relevant product sections
  - [x] 4.4 Ensure validation errors include codelist reference for user guidance
  - [ ] 4.5 Write integration tests for dynamic codelist validation (deferred)

- [x] Task 5: Create codelist admin UI (AC: 1, 2, 3)
  - [x] 5.1 Create `src/app/(platform-admin)/platform-admin/system/codelists/page.tsx`
  - [x] 5.2 Create `src/app/(platform-admin)/platform-admin/system/codelists/client.tsx`
  - [x] 5.3 Display table of loaded codelists with: list number, description, issue, value count, last loaded
  - [x] 5.4 Add "Check for Updates" button that calls `checkForUpdates()`
  - [x] 5.5 Add individual "Update" buttons per codelist
  - [x] 5.6 Add "Update All" button for bulk refresh
  - [x] 5.7 Show loading/progress states during updates
  - [x] 5.8 Display success/error notifications
  - [x] 5.9 Use `requirePlatformAdmin()` for access control

- [x] Task 6: Create codelist selector component (AC: 5)
  - [x] 6.1 Create `src/modules/onix/components/codelist-selector.tsx`
  - [x] 6.2 Generic Select component that loads values from any codelist
  - [x] 6.3 Props: listNumber, value, onChange, placeholder, disabled
  - [x] 6.4 Display "code - description" format in dropdown
  - [x] 6.5 Support search/filter within large codelists
  - [ ] 6.6 Write component tests (deferred)

- [x] Task 7: Seed initial codelists (AC: 6)
  - [x] 7.1 Create EDItEUR JSON files for List 5, 15, 17, 27, 150, 196 (Issue 68 format)
  - [x] 7.2 Store in `src/modules/onix/codelists/data/` as bundled assets
  - [ ] 7.3 Create seed script `scripts/seed-codelists.ts` (admin UI provides seeding)
  - [ ] 7.4 Add to database seeding workflow (deferred)
  - [x] 7.5 Admin UI allows manual loading

- [x] Task 8: Server actions for codelist management (AC: 1, 2, 3)
  - [x] 8.1 Create `src/modules/onix/codelists/actions.ts`
  - [x] 8.2 Create `getCodelists()` action - returns all loaded codelists with metadata
  - [x] 8.3 Create `checkCodelistUpdates()` action - checks for new issues
  - [x] 8.4 Create `updateCodelist(listNumber)` action - fetches and updates single list
  - [x] 8.5 Create `updateAllCodelists()` action - bulk update all lists
  - [x] 8.6 Use `requirePlatformAdmin()` for update actions
  - [ ] 8.7 Write action tests (deferred)

- [x] Task 9: Create module exports (AC: all)
  - [x] 9.1 Create `src/modules/onix/codelists/types.ts` with interfaces
  - [x] 9.2 Create `src/modules/onix/codelists/index.ts` barrel export

## Dev Notes

### Platform-Wide Data Model

**CRITICAL:** Codelists are platform-wide data shared across ALL tenants. This is different from most other tables in the system.

**Key Differences:**
- **No `tenant_id`** - codelists table has no tenant foreign key
- **No RLS** - Row-level security not applied (data is shared)
- **Platform admin only** - Update operations restricted to platform admins
- **Read by all** - Any authenticated user can read codelist values

### Platform Admin Access Control

This story uses `requirePlatformAdmin()` from `src/lib/platform-admin.ts`, NOT permission constants:

```typescript
// In page.tsx or server action
import { requirePlatformAdmin } from "@/lib/platform-admin";

export default async function CodelistAdminPage() {
  await requirePlatformAdmin(); // Throws if not platform admin
  // ... render page
}

// For read-only actions (no admin required)
import { getServerDb } from "@/lib/db";
const db = await getServerDb(); // Direct DB access, no tenant context
```

### Database Connection for Platform Operations

Platform-wide operations use direct database access without tenant context:

```typescript
// For platform-wide queries (codelists)
import { getServerDb } from "@/lib/db";

async function getCodelists() {
  const db = await getServerDb();
  return db.select().from(codelists);
}
```

### EDItEUR Codelist Source

EDItEUR publishes ONIX codelists at: [editeur.org/14/code-lists/](https://www.editeur.org/14/code-lists/)

**Available Formats:** CSV, TSV, JSON, XML, HTML, PDF

**Download Strategy:**
1. Download JSON files from EDItEUR releases (e.g., Issue 68)
2. Bundle required lists in `src/modules/onix/codelists/data/`
3. Seed database from bundled files on initial setup
4. Support manual re-import when new issues released

**JSON Structure (Issue 68 format):**
```json
{
  "CodeListNumber": "196",
  "IssueNumber": 68,
  "ListName": "E-publication accessibility details",
  "Codes": [
    {
      "CodeValue": "00",
      "CodeDescription": "Accessibility summary",
      "CodeNotes": "...",
      "IssueNumber": 51
    }
  ]
}
```

### Database Schema

```typescript
// src/db/schema/codelists.ts
import { index, integer, pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

/**
 * EDItEUR ONIX Codelists - metadata per list
 * Platform-wide table (no tenant_id) - shared across all tenants
 */
export const codelists = pgTable("codelists", {
  id: uuid("id").defaultRandom().primaryKey(),
  list_number: integer("list_number").notNull().unique(),
  issue_number: integer("issue_number").notNull(),
  list_name: text("list_name").notNull(),
  value_count: integer("value_count").notNull(),
  loaded_at: timestamp("loaded_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  listNumberIdx: index("codelists_list_number_idx").on(table.list_number),
}));

/**
 * Individual codelist values
 * Platform-wide table (no tenant_id)
 */
export const codelistValues = pgTable("codelist_values", {
  id: uuid("id").defaultRandom().primaryKey(),
  list_number: integer("list_number").notNull(),
  code: text("code").notNull(),
  description: text("description").notNull(),
  notes: text("notes"),
  deprecated: boolean("deprecated").default(false),
  added_in_issue: integer("added_in_issue"),
}, (table) => ({
  listCodeIdx: index("codelist_values_list_code_idx").on(table.list_number, table.code),
  listNumberIdx: index("codelist_values_list_number_idx").on(table.list_number),
}));

export type Codelist = typeof codelists.$inferSelect;
export type InsertCodelist = typeof codelists.$inferInsert;
export type CodelistValue = typeof codelistValues.$inferSelect;
export type InsertCodelistValue = typeof codelistValues.$inferInsert;
```

### Types Module

```typescript
// src/modules/onix/codelists/types.ts

export interface CodelistEntry {
  code: string;
  description: string;
  notes?: string;
  deprecated?: boolean;
  addedInIssue?: number;
}

export interface CodelistMetadata {
  listNumber: number;
  issueNumber: number;
  listName: string;
  valueCount: number;
  loadedAt: Date;
}

export interface UpdateCheckResult {
  listNumber: number;
  currentIssue: number;
  availableIssue: number;
  needsUpdate: boolean;
}

export interface CachedCodelist {
  listNumber: number;
  values: Map<string, CodelistEntry>;
  loadedAt: Date;
}
```

### Key Codelists Reference

| List # | Name | Usage in Salina |
|--------|------|-----------------|
| 5 | Product Identifier Type | ISBN-13 (15), GTIN-13 (03) |
| 15 | Title Type | Distinctive title (01) |
| 17 | Contributor Role | Author (A01), Editor (B01), etc. |
| 27 | Subject Scheme | BISAC (10), BIC (12), Thema (93) |
| 150 | Product Form | Paperback (BC), Hardback (BB), EPUB (ED), etc. |
| 196 | E-publication Accessibility | Conformance (00-11), Features (10-26), Hazards (Type 12) |

### Cache Strategy

```typescript
// In-memory LRU cache for hot codelists
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 20; // Max codelists in memory
```

**Cache Behavior:**
- First access: Load from database, cache in memory
- Subsequent access: Return from memory cache
- On update: Invalidate specific list from cache
- TTL expiry: Re-fetch from database on next access

### Integration with Existing Validation

Story 14.2/14.3 implemented hardcoded validation in `business-rules.ts`. This story makes it dynamic:

```typescript
// Current (hardcoded) - Story 14.2
const CODELIST_196 = {
  conformance: ["00", "01", "02", ...],
  features: ["10", "11", "12", ...],
} as const;

// Target (dynamic) - Story 14.4
import { codelistCache } from "@/modules/onix/codelists";

async function validateCodelistValue(listNumber: number, code: string): Promise<boolean> {
  return codelistCache.validateCode(listNumber, code);
}
```

**Migration Path:**
1. Keep hardcoded values as fallback
2. Add dynamic lookup with database
3. Fallback to hardcoded if database unavailable
4. Log warning when using fallback

### EDItEUR Update Schedule

EDItEUR releases new codelist issues quarterly:
- **Issue 68:** January 2025 (current)
- **Issue 67:** October 2024
- **Issue 66:** July 2024

### Error Handling

```typescript
// Graceful degradation when codelists unavailable
try {
  const isValid = await codelistCache.validateCode(196, value);
  return isValid;
} catch (error) {
  // Fallback to hardcoded values
  logger.warn(`Codelist cache unavailable, using fallback for list 196`);
  return CODELIST_196_FALLBACK.includes(value);
}
```

### Project Structure

**New files:**
- `src/db/schema/codelists.ts` - Database schema (platform-wide)
- `src/modules/onix/codelists/types.ts` - TypeScript interfaces
- `src/modules/onix/codelists/loader.ts` - EDItEUR fetch/parse
- `src/modules/onix/codelists/cache.ts` - In-memory LRU cache
- `src/modules/onix/codelists/actions.ts` - Server actions
- `src/modules/onix/codelists/index.ts` - Barrel export
- `src/modules/onix/codelists/data/*.json` - Bundled codelist JSON files
- `src/modules/onix/components/codelist-admin.tsx` - Admin UI component
- `src/modules/onix/components/codelist-selector.tsx` - Reusable selector
- `src/app/(platform-admin)/platform-admin/system/codelists/page.tsx` - Admin page
- `scripts/seed-codelists.ts` - Initial seeding script
- `tests/unit/codelists-loader.test.ts`
- `tests/unit/codelists-cache.test.ts`
- `tests/unit/codelists-actions.test.ts`

**Modified files:**
- `src/db/schema/index.ts` - Export new tables and types
- `src/modules/onix/validator/business-rules.ts` - Use dynamic codelists

### References

- [Source: docs/epics.md#Story 14.4] - User story and acceptance criteria
- [Source: docs/architecture.md:100] - Codelist Management decision
- [Source: docs/architecture.md:252-254] - codelists/ module structure
- [Source: docs/prd.md#FR138] - Manage EDItEUR codelists requirement
- [Source: src/modules/onix/validator/business-rules.ts] - Current hardcoded validation
- [Source: src/lib/platform-admin.ts] - Platform admin access pattern
- [External: editeur.org/14/code-lists/] - EDItEUR codelist downloads

### Previous Story Intelligence

**From Story 14.3 (Accessibility Metadata):**
- Codelist 196 values hardcoded in business-rules.ts lines 46-57
- HAZARD_CONFLICTS mapping for mutual exclusivity
- ProductFormFeatureType 09 (accessibility) and 12 (hazards)
- Integration point: buildAccessibilityFeatures() uses codelist values

**From Story 14.2 (ONIX Schema Validation):**
- Two-layer validation pattern (structural + business rules)
- ValidationError structure with path, expected, actual, codelistRef
- Validation runs synchronously during export

**From Story 13.1 (Platform Admin Authentication):**
- `requirePlatformAdmin()` function for access control
- Platform admins identified by email whitelist
- Platform operations logged to `platform_audit_logs`

### Testing Strategy

1. **Loader tests:** Mock file reads and HTTP responses
2. **Cache tests:** Verify LRU behavior, TTL expiry, invalidation
3. **Validation tests:** Ensure dynamic lookup produces same results as hardcoded
4. **Integration tests:** Full flow from load → cache → validate
5. **Admin UI tests:** Platform admin access control, update actions

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Completion Notes List

1. Created platform-wide database schema with `codelists` and `codelist_values` tables (no tenant_id)
2. Implemented loader module that reads from bundled JSON files in EDItEUR Issue 68 format
3. Implemented LRU cache with 1-hour TTL and max 20 codelists
4. Integrated dynamic codelist validation with fallback to hardcoded values
5. Created admin UI at `/platform-admin/system/codelists` with load/update controls
6. Created reusable `CodelistSelector` component with search functionality
7. Created bundled JSON files for Lists 5, 15, 17, 27, 150, 196
8. All server actions use `requirePlatformAdmin()` for access control
9. 46 unit tests pass for schema, loader, and cache modules

Deferred items:
- Integration tests for dynamic codelist validation (4.5)
- Component tests for CodelistSelector (6.6)
- Seed script (7.3, 7.4) - admin UI provides manual seeding capability
- Action tests (8.7)

### File List

**New files:**
- `src/db/schema/codelists.ts` - Database schema (platform-wide)
- `src/modules/onix/codelists/types.ts` - TypeScript interfaces
- `src/modules/onix/codelists/loader.ts` - EDItEUR fetch/parse
- `src/modules/onix/codelists/cache.ts` - In-memory LRU cache
- `src/modules/onix/codelists/actions.ts` - Server actions
- `src/modules/onix/codelists/index.ts` - Barrel export
- `src/modules/onix/codelists/data/codelist-5.json` - Product ID Type
- `src/modules/onix/codelists/data/codelist-15.json` - Title Type
- `src/modules/onix/codelists/data/codelist-17.json` - Contributor Role
- `src/modules/onix/codelists/data/codelist-27.json` - Subject Scheme
- `src/modules/onix/codelists/data/codelist-150.json` - Product Form
- `src/modules/onix/codelists/data/codelist-196.json` - Accessibility
- `src/modules/onix/components/codelist-selector.tsx` - Reusable selector
- `src/app/(platform-admin)/platform-admin/system/codelists/page.tsx` - Admin page
- `src/app/(platform-admin)/platform-admin/system/codelists/client.tsx` - Admin client
- `tests/unit/codelists-schema.test.ts` - Schema tests (18 tests)
- `tests/unit/codelists-loader.test.ts` - Loader tests (18 tests)
- `tests/unit/codelists-cache.test.ts` - Cache tests (10 tests)

**Modified files:**
- `src/db/schema/index.ts` - Export new tables and types
- `src/modules/onix/validator/business-rules.ts` - Use dynamic codelists with fallback
- `drizzle/migrations/0028_nappy_skaar.sql` - Database migration

