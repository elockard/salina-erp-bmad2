# Story 4.1: Create Royalty Contract Database Schema with Tiered Rates

Status: done

## Story

As a platform architect,
I want to establish contract schema supporting tiered royalty rates,
So that complex publishing contracts can be modeled accurately.

## Acceptance Criteria

1. Contracts table exists with columns: id, tenant_id, author_id, title_id, advance_amount, advance_paid, advance_recouped, status, created_at, updated_at
   - UUID primary key with auto-generation
   - Foreign key to tenants with cascade delete
   - Foreign key to authors (restrict delete)
   - Foreign key to titles (restrict delete)
   - Advance fields use DECIMAL(10,2) for currency precision
   - Status field supports: active, terminated, suspended
   - Default status: active

2. Contract_tiers table exists with columns: id, contract_id, format, min_quantity, max_quantity, rate, created_at
   - UUID primary key with auto-generation
   - Foreign key to contracts with cascade delete
   - Format field supports: physical, ebook, audiobook
   - min_quantity as INTEGER (required)
   - max_quantity as INTEGER (nullable for infinity)
   - Rate field uses DECIMAL(5,4) for percentage precision (0.1000 = 10%)

3. Database indexes created for performance
   - tenant_id index on contracts (RLS filtering)
   - author_id index on contracts (author lookups)
   - title_id index on contracts (title lookups)
   - status index on contracts (filtering by status)
   - contract_id index on contract_tiers (join performance)
   - Composite index: tenant_id + author_id on contracts

4. Unique constraint prevents duplicate contracts
   - Composite unique on (tenant_id, author_id, title_id)
   - One contract per author-title combination per tenant

5. CHECK constraints enforce business rules
   - advance_amount >= 0 (non-negative)
   - advance_paid >= 0 (non-negative)
   - advance_recouped >= 0 (non-negative)
   - min_quantity >= 0 (non-negative)
   - max_quantity > min_quantity when max_quantity is not null
   - rate >= 0 AND rate <= 1 (0-100% as decimal)

6. TypeScript types exported
   - Contract type for SELECT operations
   - InsertContract type for INSERT operations
   - ContractTier type for SELECT operations
   - InsertContractTier type for INSERT operations
   - ContractStatus union type: 'active' | 'terminated' | 'suspended'

7. Schema exports added to index.ts
   - Export contracts table from contracts.ts
   - Export contractTiers table from contracts.ts
   - Export Contract and ContractTier types

8. Drizzle relations defined
   - contracts → tenants (many-to-one)
   - contracts → authors (many-to-one)
   - contracts → titles (many-to-one)
   - contracts → contractTiers (one-to-many)
   - contractTiers → contracts (many-to-one)

9. Unit tests verify schema constraints
   - Test valid contract insertion
   - Test foreign key constraints (author, title, tenant)
   - Test unique constraint (duplicate contract prevention)
   - Test CHECK constraints (negative values rejected)
   - Test tier rate boundaries (0-1 range)
   - Test cascade delete behavior

## Tasks / Subtasks

- [x] Task 1: Create contracts schema file (AC: 1, 5, 6)
  - [x] Create `src/db/schema/contracts.ts`
  - [x] Define contracts table with all columns
  - [x] Add foreign keys to tenants, authors, titles
  - [x] Add CHECK constraints for advance fields
  - [x] Add status enum type
  - [x] Export Contract and InsertContract types

- [x] Task 2: Create contract_tiers schema (AC: 2, 5, 6)
  - [x] Add contractTiers table to `src/db/schema/contracts.ts`
  - [x] Define all columns with proper types
  - [x] Add foreign key to contracts with cascade delete
  - [x] Add CHECK constraints for rate and quantity
  - [x] Export ContractTier and InsertContractTier types

- [x] Task 3: Add database indexes (AC: 3, 4)
  - [x] Add tenant_id index
  - [x] Add author_id index
  - [x] Add title_id index
  - [x] Add status index
  - [x] Add contract_id index on contract_tiers
  - [x] Add composite tenant_id + author_id index
  - [x] Add unique constraint on (tenant_id, author_id, title_id)

- [x] Task 4: Update schema index exports (AC: 7)
  - [x] Update `src/db/schema/index.ts`
  - [x] Export contracts and contractTiers tables
  - [x] Export Contract and ContractTier types
  - [x] Export ContractStatus type

- [x] Task 5: Define Drizzle relations (AC: 8)
  - [x] Update `src/db/schema/relations.ts`
  - [x] Add contractsRelations with tenant, author, title, tiers
  - [x] Add contractTiersRelations with contract

- [x] Task 6: Generate and run migration (AC: 1-5)
  - [x] Run `npm run db:generate` to create migration file
  - [x] Review generated SQL for correctness
  - [x] Run `npm run db:push` to apply schema (dev)
  - [x] Verify tables created in database

- [x] Task 7: Write unit tests (AC: 9)
  - [x] Create `tests/unit/contracts-schema.test.ts`
  - [x] Test valid contract creation
  - [x] Test foreign key constraint enforcement
  - [x] Test unique constraint (duplicate prevention)
  - [x] Test CHECK constraint violations
  - [x] Test tier cascade delete behavior
  - [x] Test rate boundary validation

## Dev Notes

### Relevant Architecture Patterns and Constraints

**Contracts Schema (from architecture.md lines 1700-1729):**
```typescript
// contracts (FR38-44)
export const contracts = pgTable("contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenant_id: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  author_id: uuid("author_id")
    .notNull()
    .references(() => authors.id),
  title_id: uuid("title_id")
    .notNull()
    .references(() => titles.id),
  advance_amount: decimal("advance_amount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  advance_paid: decimal("advance_paid", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  advance_recouped: decimal("advance_recouped", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  status: text("status").notNull().default("active"), // active, terminated, suspended
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

**Contract Tiers Schema (from architecture.md lines 1731-1744):**
```typescript
// contract_tiers (FR39-40)
export const contractTiers = pgTable("contract_tiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  contract_id: uuid("contract_id")
    .notNull()
    .references(() => contracts.id, { onDelete: "cascade" }),
  format: text("format").notNull(), // physical, ebook, audiobook
  min_quantity: integer("min_quantity").notNull(),
  max_quantity: integer("max_quantity"), // null = infinity
  rate: decimal("rate", { precision: 5, scale: 4 }).notNull(), // 0.1000 = 10%
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

**Multi-Tenant Pattern (from architecture.md):**
```typescript
// ALL tenant-scoped tables MUST include tenant_id filter
// contracts and contract_tiers are scoped via contracts.tenant_id
// contract_tiers are implicitly tenant-scoped through contract relationship
```

**Decimal.js for Financial Calculations:**
```typescript
// Rate stored as DECIMAL(5,4): 0.1000 = 10%, 0.1500 = 15%
// Advance amounts stored as DECIMAL(10,2) for currency precision
// All calculations in royalty engine will use Decimal.js
```

**Foreign Key Strategy:**
```typescript
// tenants → cascade delete (tenant deletion removes all data)
// authors → restrict delete (cannot delete author with active contracts)
// titles → restrict delete (cannot delete title with active contracts)
// contracts → cascade delete on tiers (contract deletion removes tiers)
```

### Learnings from Previous Story

**From Story 3-7 (Returns History View) - Status: done:**

- Schema patterns established in `src/db/schema/` directory
- Index naming convention: `{table}_{column}_idx`
- Composite index naming: `{table}_{col1}_{col2}_idx`
- CHECK constraint naming: `{table}_{constraint_name}`
- Unit test patterns in `tests/unit/` directory
- Foreign key reference patterns with onDelete behavior

**From Story 3-4 (Returns Database Schema) - Status: done:**

- Detailed schema documentation comments
- Multi-tenant isolation documentation in header
- Related FRs listed in schema file header
- Epic/Story reference in schema file header
- Architecture reference line numbers in comments
- Type exports at bottom of schema file

[Source: docs/sprint-artifacts/3-7-build-returns-history-view-with-status-filtering.md]
[Source: src/db/schema/returns.ts]

### Project Structure Notes

**Files to Create:**
```
src/
├── db/
│   └── schema/
│       └── contracts.ts              # NEW: Contracts and contract_tiers tables

tests/
└── unit/
    └── contracts-schema.test.ts      # NEW: Schema constraint tests
```

**Files to Modify:**
```
src/
├── db/
│   └── schema/
│       ├── index.ts                  # UPDATE: Export contracts
│       └── relations.ts              # UPDATE: Add contract relations
```

**Alignment with Unified Project Structure:**
- Schema files in `src/db/schema/` following existing patterns
- Types exported from schema files (not separate types.ts)
- Relations defined in central `relations.ts` file
- Unit tests in `tests/unit/` directory

### FRs Implemented

- **FR38**: Editors can create royalty contracts linking authors to titles (contracts table with author_id, title_id)
- **FR39**: Users can configure tiered royalty rates by format and sales volume (contract_tiers table with format, quantity range)
- **FR40**: System supports multiple tiers per format (one-to-many relationship contracts → contract_tiers)
- **FR41**: Users can record advance payments made to authors (advance_amount, advance_paid columns)
- **FR42**: System tracks advance amount, amount paid, and amount recouped (advance_recouped column)
- **FR43**: Users can update contract status (status column: active, terminated, suspended)
- **FR44**: System maintains contract history for audit and compliance (created_at, updated_at timestamps)

### Design Decisions

**One Contract per Author-Title Pair:** Unique constraint on (tenant_id, author_id, title_id) enforces business rule that each author can have only one contract per title within a tenant. If contract terms change, the existing contract is updated (not a new one created).

**Tiered Rate Precision:** DECIMAL(5,4) for rate allows precise percentage storage (4 decimal places). Examples: 0.1000 = 10%, 0.1250 = 12.5%, 0.1500 = 15%. This precision supports complex tiered structures.

**Null max_quantity for Unlimited Tiers:** The final tier in a tiered structure has null max_quantity, representing "infinity" or "no upper limit". This allows: 0-5000 @ 10%, 5000-10000 @ 12%, 10000+ @ 15% (where 10000+ has max_quantity = null).

**Cascade Delete on Tiers:** When a contract is deleted, all associated tiers are automatically deleted. This maintains referential integrity without orphaned tier records.

**Restrict Delete on Authors/Titles:** Cannot delete an author or title that has contracts. This prevents accidental data loss and maintains audit trail integrity.

### Testing Strategy

**Unit Tests (tests/unit/contracts-schema.test.ts):**
- Mock Drizzle operations
- Test constraint validation logic
- Test type inference
- Verify default values

**Integration Tests (if needed):**
- Test actual database operations
- Verify foreign key enforcement
- Test cascade delete behavior
- Verify unique constraint

### References

- [Source: docs/epics.md#Story-4.1]
- [Source: docs/prd.md#FR38-FR44]
- [Source: docs/architecture.md#Contracts-Schema]
- [Source: docs/architecture.md#Contract-Tiers-Schema]
- [Source: src/db/schema/returns.ts] - Pattern reference
- [Source: src/db/schema/authors.ts] - Foreign key reference
- [Source: src/db/schema/titles.ts] - Foreign key reference

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/4-1-create-royalty-contract-database-schema-with-tiered-rates.context.xml

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- Created comprehensive contracts schema with both contracts and contract_tiers tables in single file
- All 9 ACs satisfied: tables, indexes, constraints, types, relations, migration, tests
- 54 unit tests covering schema structure, type inference, and constraint verification
- All 619 unit tests pass (no regressions)
- Note: Pre-existing integration test failures in permissions, tenant-settings, users-actions (unrelated to schema changes)

### File List

**Created:**
- src/db/schema/contracts.ts - Contracts and contract_tiers tables with full schema
- tests/unit/contracts-schema.test.ts - 54 unit tests for schema verification
- drizzle/migrations/0008_mute_forge.sql - Migration for contracts tables

**Modified:**
- src/db/schema/index.ts - Added contracts exports
- src/db/schema/relations.ts - Added contractsRelations and contractTiersRelations
- docs/sprint-artifacts/sprint-status.yaml - Updated story status

## Change Log

- 2025-11-29: Story 4.1 drafted by SM Agent (Bob) - 9 ACs, 7 tasks, royalty contract database schema with tiered rates
- 2025-11-29: Validation PASSED by SM Agent (Bob) - 0 critical, 0 major, 1 minor (Change Log added)
- 2025-11-29: Story Context generated by SM Agent (Bob) - ready-for-dev
- 2025-11-29: Implementation COMPLETE by Dev Agent (Amelia) - All 7 tasks completed, 54 unit tests passing, schema applied to database
- 2025-11-29: Senior Developer Review (AI) - APPROVED - All 9 ACs verified, all 7 tasks verified, 0 findings

## Senior Developer Review (AI)

### Reviewer
BMad (AI)

### Date
2025-11-29

### Outcome
**APPROVE** - All acceptance criteria implemented with evidence. All completed tasks verified. No blocking issues.

### Summary
Clean implementation of royalty contracts schema with tiered rates. Schema follows established patterns from returns.ts. All foreign key relationships, indexes, CHECK constraints, and types properly implemented. 54 unit tests provide good coverage.

### Key Findings
None. Implementation is complete and correct.

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| 1 | Contracts table | IMPLEMENTED | `contracts.ts:94-215` |
| 2 | Contract_tiers table | IMPLEMENTED | `contracts.ts:240-307` |
| 3 | Database indexes | IMPLEMENTED | `migration:35-40` |
| 4 | Unique constraint | IMPLEMENTED | `migration:25`, `contracts.ts:191-195` |
| 5 | CHECK constraints | IMPLEMENTED | `migration:9-11,26-28` |
| 6 | TypeScript types | IMPLEMENTED | `contracts.ts:313-331` |
| 7 | Schema exports | IMPLEMENTED | `index.ts:2,27-28` |
| 8 | Drizzle relations | IMPLEMENTED | `relations.ts:175-207` |
| 9 | Unit tests | IMPLEMENTED | `contracts-schema.test.ts` (54 tests) |

**Summary: 9 of 9 ACs implemented**

### Task Completion Validation

| Task | Marked | Verified | Evidence |
|------|--------|----------|----------|
| Task 1 | [x] | ✅ | `contracts.ts:1-332` |
| Task 2 | [x] | ✅ | `contracts.ts:240-307` |
| Task 3 | [x] | ✅ | `contracts.ts:167-214` |
| Task 4 | [x] | ✅ | `index.ts:2,12,27-28` |
| Task 5 | [x] | ✅ | `relations.ts:175-207` |
| Task 6 | [x] | ✅ | `0008_mute_forge.sql` |
| Task 7 | [x] | ✅ | `contracts-schema.test.ts` |

**Summary: 7/7 tasks verified, 0 false completions**

### Test Coverage
- 54 unit tests in `contracts-schema.test.ts`
- All 619 unit tests passing

### Architectural Alignment
✅ Follows multi-tenant pattern, DECIMAL precision, FK strategy, naming conventions

### Security Notes
No concerns. Proper constraints at DB level.

### Action Items

**Advisory Notes:**
- Note: Pre-existing integration test failures are unrelated to this story
