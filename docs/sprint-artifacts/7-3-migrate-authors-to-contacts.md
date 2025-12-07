# Story 7.3: Migrate Authors to Contacts

**Status:** code-complete (Tasks 10-11 are deployment/operational phase)

## Story

**As a** system administrator,
**I want** existing author data migrated to the contacts table,
**So that** the unified contact system is populated with existing data.

## Acceptance Criteria

### AC-7.3.1: Data Migration - Core Contact Creation ⏳ (migration script ready, runs in Task 10)
- [ ] Create contact record for each author in the authors table
- [ ] Map author fields to contact fields:
  - `name` → split into `first_name` and `last_name` (by last space, or use full name as last_name if no space)
  - `email` → `email`
  - `phone` → `phone`
  - `address` → `address_line1` (single field mapping)
  - `tax_id` → `tax_id` (copy encrypted value as-is, no decryption needed)
  - `payment_method` → `payment_info` (convert to JSONB structure)
  - `portal_user_id` → `portal_user_id`
  - `is_active` → `status` ('active' or 'inactive')
  - `tenant_id` → `tenant_id`
  - `created_at` → `created_at` (preserve original timestamp)
  - `updated_at` → `updated_at` (preserve original timestamp)
- [ ] Generate new UUID for contact `id` (do NOT reuse author.id)
- [ ] Store mapping of author.id → contact.id for FK updates

### AC-7.3.2: Author Role Assignment ⏳ (migration script ready, runs in Task 10)
- [ ] Create `contact_roles` record for each migrated contact with:
  - `contact_id` = new contact ID
  - `role` = 'author'
  - `role_specific_data` = `{}` (empty - no additional author-specific data from legacy)
  - `assigned_at` = migration timestamp
  - `assigned_by` = NULL (system migration)

### AC-7.3.3: Foreign Key Reference Updates ⏳ (schema updated, migration runs in Task 10)
- [x] Add `contact_id` column to `titles` table (nullable initially)
- [x] Add `contact_id` column to `contracts` table (nullable initially)
- [x] Add `contact_id` column to `statements` table (nullable initially)
- [ ] Update all records to set `contact_id` based on author_id → contact.id mapping (Task 10)
- [ ] Verify all records have contact_id populated (Task 10)
- [ ] Make `contact_id` NOT NULL after population (Task 10 - post-migration)
- [x] Keep `author_id` column (do NOT delete - needed for rollback)

### AC-7.3.4: Data Validation ✅ CODE COMPLETE (tests written, run during Task 10)
- [x] Count of authors before = Count of contacts with author role after (validation script)
- [x] All titles, contracts, statements have valid contact_id references (validation script)
- [x] No orphaned records in any table (validation script)
- [x] Email uniqueness preserved per tenant (schema constraint)
- [x] portal_user_id uniqueness preserved (schema constraint)
- [x] Encrypted tax_id values still decrypt correctly after migration (unit tests)

### AC-7.3.5: Rollback Capability ✅ CODE COMPLETE
- [x] Authors table is preserved (NOT deleted)
- [x] Create rollback migration script (`0012_migrate_authors_to_contacts_rollback.sql`)
- [x] Original author_id columns kept for 30-day rollback window
- [x] Document rollback procedure (in migration file comments)

### AC-7.3.6: Application Updates ✅ CODE COMPLETE
- [x] Update `src/modules/authors/queries.ts` to query contacts with role='author'
- [x] Update `src/modules/authors/actions.ts` to use contacts table
- [x] Update `src/modules/statements/queries.ts` to use contact_id
- [x] Update `src/modules/statements/actions.ts` to use contacts
- [x] Update author portal page to use contacts table
- [x] Update portal analytics components (authorId → contactId)
- [x] Update all UI components that display author data
- [x] Add deprecation warnings to old authors module (via @deprecated JSDoc)

### AC-7.3.7: Index and Performance ✅ CODE COMPLETE (indexes in migration script)
- [x] Add index on `contacts.tenant_id + roles.role` for efficient author queries
- [x] Add index on `titles.contact_id`
- [x] Add index on `contracts.contact_id`
- [x] Add index on `statements.contact_id`

## Tasks / Subtasks

- [x] **Task 0: Pre-Migration Validation** (AC: 7.3.4)
  - [x] Create script to count authors per tenant
  - [x] Create script to verify all author_id FKs are valid
  - [x] Verify encrypted tax_id values can be decrypted
  - [x] Document current state for validation comparison

- [x] **Task 1: Update Drizzle Schema Files** (AC: 7.3.3)
  - [x] Add `contact_id` column to `src/db/schema/titles.ts`
  - [x] Add `contact_id` column to `src/db/schema/contracts.ts`
  - [x] Add `contact_id` column to `src/db/schema/statements.ts`
  - [x] Add contact relations to `src/db/schema/relations.ts`
  - [x] Migration manually written in `0012_migrate_authors_to_contacts.sql`

- [x] **Task 2: Create Migration Script** (AC: 7.3.1, 7.3.2, 7.3.3)
  - [x] Create migration file in `drizzle/migrations/`
  - [x] Write transaction wrapper for atomicity
  - [x] Generate UUIDs upfront for reliable mapping
  - [x] Insert contacts from authors with field mapping
  - [x] Copy encrypted tax_id values directly (no decryption)
  - [x] Insert contact_roles for each contact
  - [x] Update FKs using mapping table
  - [x] Add foreign key constraints on new contact_id columns
  - Note: NOT NULL constraints added in Task 10 after data validation

- [x] **Task 3: Create Rollback Script** (AC: 7.3.5)
  - [x] Create rollback migration file
  - [x] Drop contact_id foreign key constraints
  - [x] Drop contact_id columns
  - [x] Delete contact_roles where role='author' (migrated ones)
  - [x] Delete migrated contacts
  - Note: Rollback tested during Task 10 deployment validation

- [x] **Task 4: Update Authors Module** (AC: 7.3.6)
  - [x] Create `src/modules/authors/queries-legacy.ts` (backup original)
  - [x] Update `getAuthors()` to query contacts with author role
  - [x] Update `getAuthorById()` to query contacts
  - [x] Update `getAuthorWithDecryptedTaxId()` to use contacts
  - [x] Update `createAuthor()` to create contact + author role
  - [x] Update `updateAuthor()` to update contact + role data
  - [x] Update `deactivateAuthor()` to change contact status (soft delete)
  - [x] Preserve backward compatibility for any direct authors table queries

- [x] **Task 5: Update Author Actions** (AC: 7.3.6)
  - [x] Update `src/modules/authors/actions.ts` to use contacts
  - [x] Update `grantPortalAccess()` to work with contacts
  - [x] Update `revokePortalAccess()` to work with contacts
  - [x] Ensure all Server Actions work with new schema
  - [x] Update Zod schemas if needed (existing schemas compatible)

- [x] **Task 6: Update Statements Module** (AC: 7.3.6)
  - [x] Update `src/modules/statements/queries.ts` - author search uses contacts
  - [x] Update `src/modules/statements/actions.ts` - pending royalties/preview uses contacts
  - [x] Update `src/modules/statements/types.ts` - Author type backward compatible
  - [x] Created backup files (queries-legacy.ts, actions-legacy.ts)
  - [x] Portal queries kept using legacy authors (migrated in Task 7)

- [x] **Task 7: Update Portal** (AC: 7.3.6)
  - [x] Update `src/app/(portal)/portal/page.tsx` to query contacts
  - [x] Update `getAuthorPortalDashboardData()` to use contacts for tenant lookup
  - [x] Components pass authorId (now contactId) - no changes needed
  - [x] portal_user_id linkage preserved (contacts.portal_user_id)
  - [x] statements queries use legacy authors for transition compatibility

- [x] **Task 8: Update UI Components** (AC: 7.3.6)
  - [x] Author type provides backward compatibility (name, is_active, etc.)
  - [x] Actions handle mapping to contacts table (splitName, status conversion)
  - [x] Queries return data through contactToAuthor() mapper
  - [x] UI components work without changes - all 1766 tests pass

- [x] **Task 9: Add Indexes** (AC: 7.3.7)
  - [x] `titles_contact_id_idx` - index on titles.contact_id
  - [x] `contracts_contact_id_idx` - index on contracts.contact_id
  - [x] `statements_contact_id_idx` - index on statements.contact_id
  - [x] `contacts_tenant_author_role_idx` - composite index for tenant + author role
  - [x] `contacts_portal_user_id_idx` - index for portal access lookups
  - [x] `contact_roles_author_idx` - partial index for author role lookups
  - [x] Updated rollback script with new indexes

- [ ] **Task 10: Run Migration** (AC: 7.3.1, 7.3.2, 7.3.3) *DEPLOYMENT PHASE*
  - [ ] Run migration on test database
  - [ ] Validate counts match (use scripts/validate-author-migration.ts)
  - [ ] Verify encrypted tax_id still works
  - [ ] Run migration on staging
  - [ ] Full validation on staging
  - [ ] Schedule production migration during low-usage window
  - [ ] Run production migration
  - [ ] Post-migration validation

- [x] **Task 11: Write Tests** (AC: 7.3.4)
  - [x] Created `scripts/validate-author-migration.ts` - pre/post migration validation
  - [x] Created `tests/unit/author-migration-validation.test.ts` - 22 unit tests
  - [x] Updated author tests to work with new types (backward compatible)
  - [x] Tax ID encryption preserved (no re-encryption needed)

## Dev Notes

### Functional Requirements Coverage

This story implements:
- **FR84**: Migrate authors to contacts (data migration preserving relationships)
- **FR86**: Author portal via contact role (portal_user_id on contacts)

### Critical: Tax ID Encryption

The authors table stores `tax_id` encrypted with AES-256-GCM (see `src/lib/encryption.ts`). The migration must:
- Copy encrypted values directly (no decryption/re-encryption)
- The contacts table uses the same encryption approach
- Validate post-migration: call `decryptTaxId()` on migrated values to confirm they work

```typescript
// In validation script - verify encryption still works
import { decryptTaxId } from "@/lib/encryption";

const contact = await db.query.contacts.findFirst({ where: eq(contacts.id, migratedId) });
if (contact?.tax_id) {
  const decrypted = decryptTaxId(contact.tax_id); // Should not throw
  console.log("Encryption validated for contact:", migratedId);
}
```

### Drizzle Schema Updates

Add `contact_id` column to each schema file:

```typescript
// src/db/schema/titles.ts - Add after author_id
import { contacts } from "./contacts";

contact_id: uuid("contact_id").references(() => contacts.id),
```

```typescript
// src/db/schema/contracts.ts - Add after author_id
import { contacts } from "./contacts";

contact_id: uuid("contact_id").references(() => contacts.id, { onDelete: "restrict" }),
```

```typescript
// src/db/schema/statements.ts - Add after author_id
import { contacts } from "./contacts";

contact_id: uuid("contact_id").references(() => contacts.id, { onDelete: "restrict" }),
```

```typescript
// src/db/schema/relations.ts - Add contact relations
export const titlesRelations = relations(titles, ({ one }) => ({
  // ... existing relations
  contact: one(contacts, {
    fields: [titles.contact_id],
    references: [contacts.id],
  }),
}));

export const contractsRelations = relations(contracts, ({ one }) => ({
  // ... existing relations
  contact: one(contacts, {
    fields: [contracts.contact_id],
    references: [contacts.id],
  }),
}));

export const statementsRelations = relations(statements, ({ one }) => ({
  // ... existing relations
  contact: one(contacts, {
    fields: [statements.contact_id],
    references: [contacts.id],
  }),
}));
```

After updating schema files, run:
```bash
pnpm drizzle-kit generate:pg
```

### Migration SQL

```sql
-- Migration: Migrate Authors to Contacts
-- Run in a transaction for atomicity

BEGIN;

-- Step 1: Generate UUIDs upfront for reliable mapping
-- This avoids fragile JOIN-based matching after INSERT
CREATE TEMP TABLE author_contact_mapping AS
SELECT id as author_id, gen_random_uuid() as contact_id FROM authors;

-- Step 2: Insert contacts from authors using pre-generated UUIDs
INSERT INTO contacts (
  id,
  tenant_id,
  first_name,
  last_name,
  email,
  phone,
  address_line1,
  tax_id,  -- Copy encrypted value directly, no decryption needed
  payment_info,
  status,
  portal_user_id,
  created_at,
  updated_at
)
SELECT
  m.contact_id,
  a.tenant_id,
  -- Name splitting: everything before last space = first, after = last
  COALESCE(NULLIF(trim(substring(a.name from '^(.*) [^ ]+$')), ''), ''),
  COALESCE(substring(a.name from '([^ ]+)$'), a.name),
  a.email,
  a.phone,
  a.address,
  a.tax_id,  -- Encrypted value copied as-is
  CASE a.payment_method
    WHEN 'direct_deposit' THEN '{"method":"direct_deposit"}'::jsonb
    WHEN 'check' THEN '{"method":"check"}'::jsonb
    WHEN 'wire_transfer' THEN '{"method":"wire_transfer"}'::jsonb
    ELSE NULL
  END,
  CASE WHEN a.is_active THEN 'active' ELSE 'inactive' END,
  a.portal_user_id,
  a.created_at,
  a.updated_at
FROM authors a
JOIN author_contact_mapping m ON a.id = m.author_id;

-- Step 3: Create contact_roles for each contact
INSERT INTO contact_roles (id, contact_id, role, role_specific_data, assigned_at)
SELECT gen_random_uuid(), contact_id, 'author', '{}'::jsonb, NOW()
FROM author_contact_mapping;

-- Step 4: Add contact_id columns (if not already added by Drizzle migration)
-- Note: If using Drizzle-generated migration, these may already exist
ALTER TABLE titles ADD COLUMN IF NOT EXISTS contact_id UUID;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contact_id UUID;
ALTER TABLE statements ADD COLUMN IF NOT EXISTS contact_id UUID;

-- Step 5: Populate contact_id from mapping
UPDATE titles t SET contact_id = m.contact_id
FROM author_contact_mapping m WHERE t.author_id = m.author_id;

UPDATE contracts c SET contact_id = m.contact_id
FROM author_contact_mapping m WHERE c.author_id = m.author_id;

UPDATE statements s SET contact_id = m.contact_id
FROM author_contact_mapping m WHERE s.author_id = m.author_id;

-- Step 6: Add constraints (if not already added by Drizzle)
ALTER TABLE titles ADD CONSTRAINT titles_contact_id_fk
  FOREIGN KEY (contact_id) REFERENCES contacts(id);
ALTER TABLE contracts ADD CONSTRAINT contracts_contact_id_fk
  FOREIGN KEY (contact_id) REFERENCES contacts(id);
ALTER TABLE statements ADD CONSTRAINT statements_contact_id_fk
  FOREIGN KEY (contact_id) REFERENCES contacts(id);

-- Step 7: Add indexes
CREATE INDEX IF NOT EXISTS titles_contact_id_idx ON titles(contact_id);
CREATE INDEX IF NOT EXISTS contracts_contact_id_idx ON contracts(contact_id);
CREATE INDEX IF NOT EXISTS statements_contact_id_idx ON statements(contact_id);

-- Step 8: Drop temp table
DROP TABLE author_contact_mapping;

COMMIT;
```

### Name Splitting Logic

```typescript
// Author has single 'name' field, contacts have first_name + last_name
function splitName(name: string): { firstName: string; lastName: string } {
  const trimmed = name.trim();
  const lastSpaceIndex = trimmed.lastIndexOf(' ');

  if (lastSpaceIndex === -1) {
    // Single word name - use as last name
    return { firstName: '', lastName: trimmed };
  }

  return {
    firstName: trimmed.substring(0, lastSpaceIndex).trim(),
    lastName: trimmed.substring(lastSpaceIndex + 1).trim(),
  };
}
```

### Payment Method Conversion

```typescript
// Convert legacy payment_method string to PaymentInfo JSONB
function convertPaymentMethod(method: string | null): PaymentInfo | null {
  if (!method) return null;

  switch (method) {
    case 'direct_deposit':
      return { method: 'direct_deposit' };  // Minimal structure, user completes later
    case 'check':
      return { method: 'check' };
    case 'wire_transfer':
      return { method: 'wire_transfer' };
    default:
      return null;
  }
}
```

**Note**: Legacy `payment_method` only stored method type. Migrated contacts have minimal payment_info that users complete later.

### Updated Author Queries

```typescript
// src/modules/authors/queries.ts (updated)
import { and, asc, eq, ilike, or } from "drizzle-orm";
import { contacts, contactRoles } from "@/db/schema/contacts";
import { getCurrentTenantId, getDb } from "@/lib/auth";
import { decryptTaxId, maskTaxId } from "@/lib/encryption";
import type { ContactWithRoles } from "@/modules/contacts/types";

/**
 * Get all authors (contacts with author role) for current tenant
 * @deprecated Consider using getContacts({ role: 'author' }) from contacts module
 */
export async function getAuthors(filters?: { includeInactive?: boolean; searchQuery?: string }): Promise<ContactWithRoles[]> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const statusCondition = filters?.includeInactive
    ? undefined
    : eq(contacts.status, 'active');

  const results = await db.query.contacts.findMany({
    where: and(
      eq(contacts.tenant_id, tenantId),
      statusCondition,
    ),
    with: {
      roles: true,
    },
    orderBy: [asc(contacts.last_name), asc(contacts.first_name)],
  });

  // Filter to only contacts with author role
  let filtered = results.filter(c => c.roles.some(r => r.role === 'author'));

  // Apply search filter
  if (filters?.searchQuery) {
    const search = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(c =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(search) ||
      c.email?.toLowerCase().includes(search)
    );
  }

  return filtered;
}

/**
 * Get author by ID (contact with author role)
 */
export async function getAuthorById(id: string): Promise<ContactWithRoles | null> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const result = await db.query.contacts.findFirst({
    where: and(
      eq(contacts.tenant_id, tenantId),
      eq(contacts.id, id),
    ),
    with: {
      roles: true,
    },
  });

  // Verify contact has author role
  if (!result || !result.roles.some(r => r.role === 'author')) {
    return null;
  }

  return result;
}

// Helper for display name (backward compatibility)
export function getAuthorDisplayName(contact: ContactWithRoles): string {
  return `${contact.first_name} ${contact.last_name}`.trim() || contact.email || 'Unknown';
}
```

### Updated Portal Page

```typescript
// src/app/(portal)/portal/page.tsx - Key changes

import { contacts, contactRoles } from "@/db/schema/contacts";

export default async function PortalPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "author") {
    redirect("/sign-in");
  }

  const db = await getDb();

  // Query contacts table instead of authors
  const contact = await db.query.contacts.findFirst({
    where: and(
      eq(contacts.portal_user_id, user.id),
      eq(contacts.status, 'active'),
    ),
    with: {
      roles: true,
    },
  });

  // Verify contact has author role
  if (!contact || !contact.roles.some(r => r.role === 'author')) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-semibold text-destructive">Access Error</h1>
        <p className="mt-2 text-muted-foreground">
          Your portal account is not properly linked. Please contact support.
        </p>
      </div>
    );
  }

  // Display name now uses first_name + last_name
  const displayName = `${contact.first_name} ${contact.last_name}`.trim();

  // ... rest of component using contact.id instead of author.id
}
```

### Verification Queries

```sql
-- Pre-migration counts
SELECT tenant_id, COUNT(*) as author_count FROM authors GROUP BY tenant_id;

-- Post-migration validation
SELECT c.tenant_id,
       COUNT(DISTINCT c.id) as contact_count,
       COUNT(DISTINCT cr.id) as role_count
FROM contacts c
JOIN contact_roles cr ON cr.contact_id = c.id AND cr.role = 'author'
GROUP BY c.tenant_id;

-- Verify FK updates (should all return 0)
SELECT 'titles' as table_name, COUNT(*) as unlinked
FROM titles WHERE contact_id IS NULL AND author_id IS NOT NULL
UNION ALL
SELECT 'contracts', COUNT(*) FROM contracts WHERE contact_id IS NULL AND author_id IS NOT NULL
UNION ALL
SELECT 'statements', COUNT(*) FROM statements WHERE contact_id IS NULL AND author_id IS NOT NULL;

-- Verify encryption still works (run in app, not SQL)
-- See "Critical: Tax ID Encryption" section above
```

### Previous Story Learnings (7.1, 7.2)

From Story 7.1:
- Contacts schema uses `first_name` + `last_name` (not single `name`)
- `payment_info` is JSONB with discriminated union (method-based)
- `status` is text with CHECK constraint ('active'/'inactive')
- Email unique per tenant (composite constraint allows NULL)
- portal_user_id must be unique across all contacts

From Story 7.2:
- Contact module structure at `src/modules/contacts/`
- All actions use `requirePermission()` pattern
- Return type: `ActionResult<T>` pattern
- Use existing Zod schemas from `schema.ts`
- Use existing types from `types.ts`
- Audit logging with `logAuditEvent()`
- Use `getDb()` from `@/lib/auth` (not direct db import)

### Testing Strategy

```typescript
describe('Author to Contact Migration', () => {
  test('preserves author count per tenant', async () => {
    const authorCountBefore = await countAuthorsByTenant();
    await runMigration();
    const contactCountAfter = await countContactsWithAuthorRole();
    expect(contactCountAfter).toEqual(authorCountBefore);
  });

  test('preserves encrypted tax_id correctly', async () => {
    const authors = await getAllAuthors();
    await runMigration();
    for (const author of authors) {
      if (author.tax_id) {
        const contact = await getContactByMapping(author.id);
        // Verify encrypted value transferred
        expect(contact.tax_id).toBe(author.tax_id);
        // Verify decryption still works
        const decrypted = decryptTaxId(contact.tax_id);
        expect(decrypted).toBeTruthy();
      }
    }
  });

  test('updates all FK references', async () => {
    await runMigration();
    const orphanedTitles = await countTitlesWithoutContactId();
    const orphanedContracts = await countContractsWithoutContactId();
    const orphanedStatements = await countStatementsWithoutContactId();
    expect(orphanedTitles).toBe(0);
    expect(orphanedContracts).toBe(0);
    expect(orphanedStatements).toBe(0);
  });

  test('rollback restores original state', async () => {
    const authorCountBefore = await countAuthorsByTenant();
    await runMigration();
    await runRollback();
    const authorCountAfter = await countAuthorsByTenant();
    expect(authorCountAfter).toEqual(authorCountBefore);
  });
});
```

### Anti-Patterns to Avoid

1. **DO NOT** delete the authors table - preserve for rollback
2. **DO NOT** reuse author.id as contact.id - generate new UUIDs
3. **DO NOT** run migration without transaction wrapper
4. **DO NOT** modify portal_user_id during migration - preserve linkage
5. **DO NOT** skip validation counts before and after
6. **DO NOT** run production migration during business hours
7. **DO NOT** forget to update the portal authentication flow
8. **DO NOT** remove author_id columns from other tables (keep for rollback)
9. **DO NOT** create duplicate emails per tenant during migration
10. **DO NOT** decrypt/re-encrypt tax_id - copy encrypted value directly
11. **DO NOT** use `import { db }` - use `getDb()` from `@/lib/auth`

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Data loss during migration | Transaction wrapper, preserve authors table |
| Portal access broken | Test portal flow on staging before production |
| Performance impact | Schedule during low-usage window, add indexes |
| Rollback needed | Keep author_id columns, test rollback script |
| Duplicate emails | Handle email conflicts with tenant-scoped uniqueness |
| Encryption failure | Copy encrypted values directly, validate post-migration |

### References

- [Story 7.1](docs/sprint-artifacts/7-1-create-unified-contact-database-schema.md): Contact schema
- [Story 7.2](docs/sprint-artifacts/7-2-build-contact-management-interface.md): Contact management
- [Authors Schema](src/db/schema/authors.ts): Source schema
- [Contacts Schema](src/db/schema/contacts.ts): Target schema
- [Contact Types](src/modules/contacts/types.ts): TypeScript interfaces
- [Encryption](src/lib/encryption.ts): Tax ID encryption utilities
- [Architecture](docs/architecture.md): Multi-tenant patterns
- [Epic 7](docs/epics.md#epic-7-contact--isbn-foundation): Story context

## Dev Agent Record

### Context Reference

Story 7.3 migrates all existing author data to the unified contacts system. This is a critical data migration that requires transaction safety, validation, and rollback capability. The migration preserves all relationships (titles, contracts, statements) and encrypted tax_id values while enabling the multi-role contact system.

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

**Files Created:**
- `drizzle/migrations/0012_migrate_authors_to_contacts.sql`
- `drizzle/migrations/0012_migrate_authors_to_contacts_rollback.sql`
- `scripts/validate-author-migration.ts`
- `tests/unit/author-migration-validation.test.ts`
- `src/modules/authors/queries-legacy.ts` (backup)
- `src/modules/authors/actions-legacy.ts` (backup)
- `src/modules/statements/queries-legacy.ts` (backup)
- `src/modules/statements/actions-legacy.ts` (backup)

**Files to Modify:**
- `src/db/schema/titles.ts` - Add contact_id column
- `src/db/schema/contracts.ts` - Add contact_id column
- `src/db/schema/statements.ts` - Add contact_id column
- `src/db/schema/relations.ts` - Add contact relations
- `src/modules/authors/queries.ts` - Query contacts table
- `src/modules/authors/actions.ts` - Use contacts table
- `src/modules/authors/types.ts` - Update types for contacts
- `src/modules/authors/schema.ts` - Update Zod schemas if needed
- `src/modules/statements/queries.ts` - Update author_id → contact_id
- `src/modules/statements/actions.ts` - Update author lookups
- `src/modules/statements/types.ts` - Update authorId types
- `src/modules/statements/components/statement-step-authors.tsx` - Update author references
- `src/modules/statements/components/statement-step-preview.tsx` - Update author references
- `src/modules/statements/components/statement-wizard-modal.tsx` - Update author references
- `src/app/(portal)/portal/page.tsx` - Query contacts table
- `src/app/(portal)/portal/components/author-earnings-timeline.tsx` - Update props
- `src/app/(portal)/portal/components/author-best-titles.tsx` - Update props
- `src/app/(portal)/portal/components/author-advance-progress.tsx` - Update props
- `src/app/(portal)/portal/components/author-next-statement.tsx` - Update props
