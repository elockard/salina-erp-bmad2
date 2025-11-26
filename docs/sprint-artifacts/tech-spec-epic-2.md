# Epic Technical Specification: Author & Title Catalog Management

Date: 2025-11-24
Author: BMad
Epic ID: 2
Status: Draft

---

## Overview

Epic 2 delivers the core catalog management capabilities for Salina ERP, enabling publishers to build and maintain their author roster, title catalog, and ISBN inventory. This epic implements 9 stories (2.1-2.9) covering author profile management, title metadata with multi-format support, ISBN pool management with CSV import, and smart ISBN assignment with row-level locking.

The epic builds directly on the multi-tenant infrastructure (Epic 1), leveraging the established RLS patterns, Clerk authentication, RBAC permission system, and Server Actions patterns. All data models follow the tenant-scoped design with automatic tenant isolation.

**FRs Covered:** FR9-23 (15 Functional Requirements)

## Objectives and Scope

### In Scope

- **Author Management (Stories 2.1-2.3):**
  - Author database schema with audit trail (FR9, FR13)
  - Split View interface for CRUD operations (FR9, FR10, FR11)
  - Tax ID storage with encryption (FR10)
  - Author portal access provisioning (FR12)

- **Title Management (Stories 2.4-2.5):**
  - Title database schema with multi-format support (FR14, FR15)
  - Physical, ebook, audiobook format tracking (FR15)
  - Publication status workflow (draft → pending → published → out-of-print)
  - Split View interface for title CRUD (FR14, FR22)

- **ISBN Pool Management (Stories 2.6-2.9):**
  - ISBN pool database schema with status tracking (FR17)
  - CSV import for 100-block ISBN batches (FR16)
  - ISBN-13 validation including checksum (FR21)
  - ISBN pool status view with availability tracking (FR23)
  - Smart ISBN assignment with row-level locking (FR18, FR19, FR20)

### Out of Scope

- Royalty contract creation (Epic 4)
- Sales transaction recording (Epic 3)
- Statement generation (Epic 5)
- ISBN registration with external agencies
- Audiobook ISBN field (deferred to post-MVP)

## System Architecture Alignment

### Components Referenced

| Component | Path | Purpose |
|-----------|------|---------|
| `src/modules/authors/` | Feature module | Author management Server Actions, queries, components |
| `src/modules/titles/` | Feature module | Title management Server Actions, queries, components |
| `src/modules/isbn/` | Feature module | ISBN pool management Server Actions, queries, components |
| `src/db/schema/authors.ts` | Database | Author table schema (Story 2.1 - COMPLETED) |
| `src/db/schema/titles.ts` | Database | Title table schema (Story 2.4) |
| `src/db/schema/isbns.ts` | Database | ISBN pool table schema (Story 2.6) |
| `src/app/(dashboard)/authors/` | Route | Author management pages |
| `src/app/(dashboard)/titles/` | Route | Title management pages |
| `src/app/(dashboard)/isbn-pool/` | Route | ISBN pool pages |
| `src/app/(portal)/portal/` | Route | Author portal (limited access) |

### Architectural Constraints

1. **Multi-Tenant Isolation:** All tables include `tenant_id` column with RLS policies
2. **Permission Enforcement:** All Server Actions check permissions via `requirePermission()`
3. **Server Actions Pattern:** All mutations use "use server" directive with ActionResult<T> responses
4. **Validation Pattern:** Zod schemas for client + server validation
5. **Soft Delete:** Use `is_active` flag instead of physical DELETE
6. **Row Locking:** ISBN assignment uses `FOR UPDATE` to prevent concurrent assignment

## Detailed Design

### Services and Modules

| Module | Responsibilities | Key Actions | Permissions |
|--------|------------------|-------------|-------------|
| `modules/authors/` | Author CRUD, portal access | `createAuthor`, `updateAuthor`, `deactivateAuthor`, `grantPortalAccess` | CREATE_AUTHORS_TITLES |
| `modules/titles/` | Title CRUD, format tracking | `createTitle`, `updateTitle`, `setPublicationStatus` | CREATE_AUTHORS_TITLES |
| `modules/isbn/` | ISBN import, assignment, status | `importISBNs`, `assignISBN`, `getPoolStatus` | MANAGE_SETTINGS (import), CREATE_AUTHORS_TITLES (assign) |

### Data Models and Contracts

#### Authors Table (Story 2.1 - COMPLETED)

```typescript
// src/db/schema/authors.ts (ALREADY EXISTS)
export const authors = pgTable("authors", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenant_id: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  tax_id: text("tax_id"),  // Encrypted at app level
  payment_method: text("payment_method"),  // 'direct_deposit' | 'check' | 'wire_transfer'
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("authors_tenant_id_idx").on(table.tenant_id),
  emailIdx: index("authors_email_idx").on(table.email),
  isActiveIdx: index("authors_is_active_idx").on(table.is_active),
  tenantActiveIdx: index("authors_tenant_id_is_active_idx").on(table.tenant_id, table.is_active),
}));
```

#### Titles Table (Story 2.4)

```typescript
// src/db/schema/titles.ts
export const titles = pgTable("titles", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenant_id: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  genre: text("genre"),
  word_count: integer("word_count"),
  publication_status: text("publication_status", {
    enum: ["draft", "pending", "published", "out_of_print"]
  }).notNull().default("draft"),
  isbn: text("isbn"),      // Physical book ISBN-13 (nullable until assigned)
  eisbn: text("eisbn"),    // Ebook ISBN-13 (nullable until assigned)
  publication_date: date("publication_date"),
  author_id: uuid("author_id").notNull().references(() => authors.id),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("titles_tenant_id_idx").on(table.tenant_id),
  statusIdx: index("titles_publication_status_idx").on(table.publication_status),
  isbnIdx: index("titles_isbn_idx").on(table.isbn),
  eisbnIdx: index("titles_eisbn_idx").on(table.eisbn),
  authorIdx: index("titles_author_id_idx").on(table.author_id),
}));
```

#### ISBNs Table (Story 2.6)

```typescript
// src/db/schema/isbns.ts
export const isbns = pgTable("isbns", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenant_id: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  isbn_13: text("isbn_13").notNull().unique(),  // Globally unique ISBN-13
  type: text("type", { enum: ["physical", "ebook"] }).notNull(),
  status: text("status", {
    enum: ["available", "assigned", "registered", "retired"]
  }).notNull().default("available"),
  assigned_to_title_id: uuid("assigned_to_title_id").references(() => titles.id),
  assigned_at: timestamp("assigned_at", { withTimezone: true }),
  assigned_by_user_id: uuid("assigned_by_user_id").references(() => users.id),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index("isbns_tenant_id_idx").on(table.tenant_id),
  statusIdx: index("isbns_status_idx").on(table.status),
  typeIdx: index("isbns_type_idx").on(table.type),
  titleIdx: index("isbns_assigned_to_title_id_idx").on(table.assigned_to_title_id),
}));
```

#### Drizzle Relations

```typescript
// src/db/schema/relations.ts
export const authorsRelations = relations(authors, ({ one, many }) => ({
  tenant: one(tenants, { fields: [authors.tenant_id], references: [tenants.id] }),
  titles: many(titles),
  portalUser: one(users, { fields: [authors.portal_user_id], references: [users.id] }),
}));

export const titlesRelations = relations(titles, ({ one, many }) => ({
  tenant: one(tenants, { fields: [titles.tenant_id], references: [tenants.id] }),
  author: one(authors, { fields: [titles.author_id], references: [authors.id] }),
  assignedIsbns: many(isbns),
}));

export const isbnsRelations = relations(isbns, ({ one }) => ({
  tenant: one(tenants, { fields: [isbns.tenant_id], references: [tenants.id] }),
  assignedTitle: one(titles, { fields: [isbns.assigned_to_title_id], references: [titles.id] }),
  assignedByUser: one(users, { fields: [isbns.assigned_by_user_id], references: [users.id] }),
}));
```

### APIs and Interfaces

#### Author Server Actions (Story 2.2)

```typescript
// src/modules/authors/actions.ts
"use server"

export async function createAuthor(data: CreateAuthorInput): Promise<ActionResult<Author>>
// Permissions: CREATE_AUTHORS_TITLES (owner, admin, editor)
// Creates author record with tenant_id from session
// Encrypts tax_id before storage (if provided)

export async function updateAuthor(id: string, data: UpdateAuthorInput): Promise<ActionResult<Author>>
// Permissions: CREATE_AUTHORS_TITLES
// Updates author fields, re-encrypts tax_id if changed

export async function deactivateAuthor(id: string): Promise<ActionResult<Author>>
// Permissions: CREATE_AUTHORS_TITLES
// Sets is_active = false (soft delete)

export async function getAuthors(filters?: AuthorFilters): Promise<Author[]>
// Permissions: VIEW_OWN_STATEMENTS (all authenticated users)
// Returns tenant-scoped authors with optional filtering

export async function getAuthorById(id: string): Promise<Author | null>
// Permissions: VIEW_OWN_STATEMENTS
// Returns single author with related titles
```

#### Author Portal Actions (Story 2.3)

```typescript
// src/modules/authors/actions.ts
export async function grantPortalAccess(authorId: string): Promise<ActionResult<User>>
// Permissions: MANAGE_USERS (owner, admin)
// Creates Clerk invitation for author email
// Creates user record with role="author" linked to author
// Sends invitation email via Clerk

export async function revokePortalAccess(authorId: string): Promise<ActionResult<void>>
// Permissions: MANAGE_USERS
// Deactivates user record (is_active = false)
```

#### Title Server Actions (Story 2.5)

```typescript
// src/modules/titles/actions.ts
"use server"

export async function createTitle(data: CreateTitleInput): Promise<ActionResult<Title>>
// Permissions: CREATE_AUTHORS_TITLES
// Creates title with author_id link

export async function updateTitle(id: string, data: UpdateTitleInput): Promise<ActionResult<Title>>
// Permissions: CREATE_AUTHORS_TITLES

export async function setPublicationStatus(id: string, status: PublicationStatus): Promise<ActionResult<Title>>
// Permissions: CREATE_AUTHORS_TITLES

export async function getTitles(filters?: TitleFilters): Promise<Title[]>
// Permissions: VIEW_OWN_STATEMENTS

export async function getTitleById(id: string): Promise<Title | null>
// Permissions: VIEW_OWN_STATEMENTS
// Returns title with author, assigned ISBNs
```

#### ISBN Server Actions (Stories 2.7-2.9)

```typescript
// src/modules/isbn/actions.ts
"use server"

export async function importISBNs(file: File, type: "physical" | "ebook"): Promise<ActionResult<ImportResult>>
// Permissions: MANAGE_SETTINGS (owner, admin)
// Validates CSV file (max 100 rows)
// Validates each ISBN-13 (format + checksum)
// Checks for duplicates (within file and database)
// Transaction: inserts all or none

export async function assignISBN(titleId: string, format: "physical" | "ebook"): Promise<ActionResult<ISBN>>
// Permissions: CREATE_AUTHORS_TITLES
// Uses row-level locking (FOR UPDATE) per architecture.md Pattern 3
// Assigns next available ISBN of specified type
// Updates both isbns and titles tables in transaction

export async function getPoolStatus(): Promise<ISBNPoolStatus>
// Permissions: VIEW_OWN_STATEMENTS
// Returns counts by type and status

export async function getISBNs(filters?: ISBNFilters): Promise<ISBN[]>
// Permissions: VIEW_OWN_STATEMENTS
// Paginated list with filtering
```

### Workflows and Sequencing

#### Author Creation Flow

```
User clicks "Create Author" → Modal opens → User fills form → Client validates (Zod) →
Submit → Server validates → Check permission (CREATE_AUTHORS_TITLES) →
Encrypt tax_id (if provided) → Insert into authors → Return success →
Toast notification → List refreshes → Detail panel loads
```

#### Author Portal Provisioning Flow

```
Admin clicks "Grant Portal Access" → Confirm email valid → Server Action:
1. Check permission (MANAGE_USERS)
2. Validate author has email
3. Create user record (role="author", is_active=false)
4. Call Clerk createInvitation(email)
5. Clerk sends invitation email
6. Author clicks link → Completes registration → Clerk webhook fires
7. Webhook updates user.clerk_user_id, sets is_active=true
8. Author can now login to /portal
```

#### ISBN Import Flow

```
Admin navigates to /settings/isbn-import → Selects file + type →
Client parses CSV preview → Submit → Server Action:
1. Check permission (MANAGE_SETTINGS)
2. Parse CSV (server-side validation)
3. Validate each ISBN: 13 digits, valid checksum, not duplicate
4. If errors: return validation report, no changes
5. If valid: transaction INSERT all ISBNs with status="available"
6. Return success with count → Redirect to /isbn-pool
```

#### Smart ISBN Assignment Flow (Per Architecture.md Pattern 3)

```
Editor viewing title → Clicks "Assign ISBN" (Physical or Ebook) → Modal shows:
- Next available ISBN preview
- Available count
- "Assign This ISBN" button

Click "Assign" → Server Action (transaction):
1. Check permission (CREATE_AUTHORS_TITLES)
2. SELECT ... FROM isbns WHERE status='available' AND type=? LIMIT 1 FOR UPDATE
   (Row lock prevents concurrent assignment)
3. UPDATE isbns SET status='assigned', assigned_to_title_id=?, assigned_at=NOW()
4. UPDATE titles SET isbn|eisbn = ? WHERE id=?
5. COMMIT
6. Return assigned ISBN → Toast → Title detail refreshes

Race condition handling:
- If ISBN was assigned by another user during transaction, Drizzle gets next available
- If no ISBNs available, return error: "No Physical ISBNs available. Import ISBN block first."
```

## Non-Functional Requirements

### Performance

| Metric | Target | Context |
|--------|--------|---------|
| Author list load | < 200ms | Paginated (20 per page), indexed queries |
| Title search | < 300ms | Search by title/author/ISBN with indexes |
| ISBN pool query | < 150ms | Status counts aggregated, indexed |
| ISBN assignment | < 500ms | Transaction with row locking |
| CSV import (100 ISBNs) | < 3s | Server-side validation + bulk insert |

### Security

1. **Tax ID Encryption:**
   - App-level encryption using AES-256-GCM
   - Encryption key stored in environment variable (ENCRYPTION_KEY)
   - Decrypted only when displayed to authorized users (Owner, Admin, Finance)
   - Masked display in UI (***-**-1234)

2. **Permission Enforcement:**
   - All Server Actions check permissions before database operations
   - Tax ID visibility restricted to Owner/Admin/Finance roles
   - Author portal users can only access their own data (RLS)

3. **CSV Upload Security:**
   - File size limit: 1MB
   - Mime type validation: text/csv
   - Server-side parsing only (no client execution)
   - Input sanitization for all ISBN values

4. **Row-Level Security:**
   - All tables have RLS policies enforcing tenant_id
   - Author portal users have additional RLS restricting to their author_id

### Reliability/Availability

1. **ISBN Assignment Atomicity:**
   - Transaction ensures ISBN + title updates succeed together or rollback
   - Row locking prevents double-assignment
   - Retry logic with next-available ISBN on conflict

2. **Soft Delete Safety:**
   - Authors/titles marked inactive, never deleted
   - Deactivated authors' titles remain visible
   - Historical data preserved for royalty calculations

3. **Data Validation:**
   - ISBN-13 checksum validated before import
   - Duplicate detection across entire database (not just tenant)
   - Foreign key constraints enforce referential integrity

### Observability

1. **Logging:**
   - Author CRUD operations logged with user ID
   - ISBN import logged with count and user
   - ISBN assignment logged with ISBN, title, user, timestamp
   - Permission denials logged with context

2. **Metrics:**
   - Authors count per tenant (dashboard widget)
   - Titles count per tenant (dashboard widget)
   - ISBN pool utilization (available/assigned/total)
   - Low ISBN warning threshold (< 10 available)

## Dependencies and Integrations

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@clerk/nextjs` | ^6.35.4 | Author portal authentication |
| `drizzle-orm` | ^0.44.7 | Database queries and relations |
| `zod` | ^3.25.0 | Schema validation |
| `react-hook-form` | ^7.60.0 | Form state management |
| `@hookform/resolvers` | ^5.1.0 | Zod integration |
| `papaparse` | ^5.5.0 | CSV parsing for ISBN import |

### Integration Points

1. **Clerk (Story 2.3):**
   - `clerkClient.invitations.createInvitation()` for author portal access
   - Webhook handles `user.created` to complete provisioning

2. **Epic 1 Infrastructure:**
   - `requirePermission()` from `src/lib/permissions.ts`
   - `getCurrentTenantId()` from `src/lib/auth.ts`
   - `getDb()` for RLS-authenticated database connection

3. **shadcn/ui Components:**
   - DataTable for author/title/ISBN lists
   - Sheet/Dialog for forms
   - Badge for status indicators
   - Form components for input handling

## Acceptance Criteria (Authoritative)

### Story 2.1: Author Schema (COMPLETED)
- AC2.1.1: Authors table created with all required fields
- AC2.1.2: RLS policy enabled for tenant isolation
- AC2.1.3: Indexes created on tenant_id, email, is_active
- AC2.1.4: Migration generated and applied

### Story 2.2: Author Split View
- AC2.2.1: Split View renders with left panel (320px) and right panel
- AC2.2.2: Left panel shows searchable author list with name, email, badge
- AC2.2.3: Right panel shows selected author details
- AC2.2.4: "Create Author" button opens modal form
- AC2.2.5: Form validates with Zod schema (name required)
- AC2.2.6: Tax ID masked in display, visible only to Owner/Admin/Finance
- AC2.2.7: Inline editing works for all fields
- AC2.2.8: Permission check enforces CREATE_AUTHORS_TITLES

### Story 2.3: Author Portal Access
- AC2.3.1: "Grant Portal Access" button visible for authors with email
- AC2.3.2: Server Action creates user with role="author"
- AC2.3.3: Clerk invitation email sent
- AC2.3.4: Author can login after accepting invitation
- AC2.3.5: Author portal shows only "My Statements" (limited access)
- AC2.3.6: RLS enforces author can only query own data

### Story 2.4: Title Schema
- AC2.4.1: Titles table created with all required fields
- AC2.4.2: Publication status enum enforced
- AC2.4.3: ISBN/eISBN fields nullable, globally unique
- AC2.4.4: RLS policy enabled
- AC2.4.5: Drizzle relations defined for author, isbns

### Story 2.5: Title Split View
- AC2.5.1: Split View renders with searchable title list
- AC2.5.2: Filter by publication status
- AC2.5.3: Right panel shows title details with author link
- AC2.5.4: Formats section shows ISBN status + "Assign ISBN" button
- AC2.5.5: "Create Title" modal with author dropdown
- AC2.5.6: Permission check enforces CREATE_AUTHORS_TITLES

### Story 2.6: ISBN Schema
- AC2.6.1: ISBNs table created with all required fields
- AC2.6.2: Status and type enums enforced
- AC2.6.3: isbn_13 globally unique constraint
- AC2.6.4: Foreign keys to titles and users
- AC2.6.5: RLS policy enabled

### Story 2.7: ISBN Import
- AC2.7.1: Import page at /settings/isbn-import
- AC2.7.2: File upload accepts CSV (max 100 rows, 1MB)
- AC2.7.3: Each ISBN validated: 13 digits, valid checksum
- AC2.7.4: Duplicates detected (within file and database)
- AC2.7.5: Validation errors displayed inline
- AC2.7.6: Transaction ensures all-or-nothing import
- AC2.7.7: Permission check enforces MANAGE_SETTINGS

### Story 2.8: ISBN Pool View
- AC2.8.1: Dashboard widget shows available/total by type
- AC2.8.2: Warning badge if available < 10
- AC2.8.3: Full /isbn-pool page shows stats cards
- AC2.8.4: Table with ISBN, type, status, assigned title
- AC2.8.5: Filters: type, status, search
- AC2.8.6: Pagination (20 per page)

### Story 2.9: ISBN Assignment
- AC2.9.1: Modal shows next available ISBN preview
- AC2.9.2: "Assign This ISBN" uses row locking
- AC2.9.3: Transaction updates isbns and titles atomically
- AC2.9.4: Race condition handled gracefully
- AC2.9.5: Error message if no ISBNs available
- AC2.9.6: Audit trail: assignment logged
- AC2.9.7: Permission check enforces CREATE_AUTHORS_TITLES

## Traceability Mapping

| AC | Spec Section | Component(s) | Test Idea |
|----|--------------|--------------|-----------|
| AC2.1.1-4 | Data Models > Authors | src/db/schema/authors.ts | Migration test, schema validation |
| AC2.2.1-8 | Workflows > Author Creation | modules/authors/components/*.tsx | E2E: create author, edit, search |
| AC2.3.1-6 | Workflows > Portal Provisioning | modules/authors/actions.ts | Integration: Clerk invitation, portal login |
| AC2.4.1-5 | Data Models > Titles | src/db/schema/titles.ts | Migration test, relation queries |
| AC2.5.1-6 | Workflows > Title Management | modules/titles/components/*.tsx | E2E: create title, assign author |
| AC2.6.1-5 | Data Models > ISBNs | src/db/schema/isbns.ts | Migration test, unique constraint |
| AC2.7.1-7 | Workflows > ISBN Import | modules/isbn/actions.ts | Unit: checksum validation, E2E: import flow |
| AC2.8.1-6 | APIs > getPoolStatus | modules/isbn/components/*.tsx | E2E: pool view, filters |
| AC2.9.1-7 | Workflows > ISBN Assignment | modules/isbn/actions.ts | Integration: row locking, concurrent test |

## Risks, Assumptions, Open Questions

### Risks

1. **[RISK] Tax ID Encryption Key Management**
   - Risk: Encryption key leaked or lost
   - Mitigation: Store in secure environment variable, implement key rotation plan
   - Status: Deferred to Story 2.2 implementation

2. **[RISK] ISBN-13 Checksum Implementation**
   - Risk: Invalid checksum algorithm allows bad ISBNs
   - Mitigation: Unit test checksum algorithm against known valid/invalid ISBNs
   - Reference: ISBN-13 checksum formula in Story 2.7

3. **[RISK] Row Locking Performance Under Load**
   - Risk: High concurrency causes lock contention
   - Mitigation: Transaction kept minimal (< 100ms), SKIP LOCKED as fallback
   - Status: Monitor in production

### Assumptions

1. **[ASSUMPTION] Author Email for Portal**
   - Assumption: Authors must have email to receive portal invitation
   - Validation: Clerk requires email for invitation

2. **[ASSUMPTION] ISBN Global Uniqueness**
   - Assumption: ISBNs are globally unique across all tenants
   - Validation: ISBNs are industry standard, never reused

3. **[ASSUMPTION] Audiobook Format Deferred**
   - Assumption: Audiobook ISBN tracking is post-MVP
   - Validation: Per PRD scope, not in Epic 2

### Open Questions

1. **[QUESTION] Tax ID Format Validation**
   - Question: Should we validate SSN/EIN format or accept free text?
   - Recommendation: Accept free text, international authors may have different formats

2. **[QUESTION] ISBN Retirement Workflow**
   - Question: When/how should ISBNs be marked "retired"?
   - Recommendation: Defer to post-MVP, requires business process definition

## Test Strategy Summary

### Unit Tests

- **ISBN Validation:** Test checksum algorithm with valid/invalid ISBNs
- **Permission Checks:** Test each Server Action with all role combinations
- **Encryption:** Test tax ID encrypt/decrypt round-trip

### Integration Tests

- **Author CRUD:** Test create, read, update, deactivate with database
- **Title-Author Relations:** Test title creation with author link
- **ISBN Assignment:** Test row locking with concurrent simulated requests
- **Portal Provisioning:** Test Clerk invitation API integration

### E2E Tests (Playwright)

- **Author Split View:** Navigate, search, create, edit author
- **Title Split View:** Navigate, filter by status, create with author
- **ISBN Import:** Upload valid CSV, verify pool updated
- **ISBN Assignment:** Assign ISBN to title, verify title updated
- **Author Portal:** Login as author, view statements only

### Test Data Seeding

- Seed tenant with 5 authors, 10 titles, 50 ISBNs for E2E tests
- Seed roles: owner, admin, editor, finance, author for permission tests
