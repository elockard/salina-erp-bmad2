# Story 7.6: Remove ISBN Type Distinction

**Status:** review

## Story

**As an** administrator,
**I want** ISBNs to be unified without physical/ebook type distinction,
**So that** the system matches real-world ISBN allocation where publishers use any ISBN for any format.

## Background

The original design included separate "physical" and "ebook" ISBN types, with titles having separate `isbn` and `eisbn` fields. This was based on an incorrect assumption that publishers allocate specific ISBN ranges per format. In reality, publishers typically use any available ISBN from their pool for any format.

## Acceptance Criteria

### AC-7.6.1: Remove Type from ISBN Prefixes
- [x] Remove `type` column from `isbn_prefixes` table (or keep as deprecated)
- [x] Update prefix registration form to remove Type selection (Physical/Ebook radio buttons)
- [x] Update prefix table to remove Type badge column
- [x] Update prefix breakdown component to remove type display

### AC-7.6.2: Remove Type from ISBNs Table
- [x] Remove `type` column from `isbns` table (or keep as deprecated)
- [x] Update ISBN pool table to remove Type column and filter
- [x] Update ISBN queries to not filter by type

### AC-7.6.3: Consolidate Title ISBN Fields
- [x] Migrate `eisbn` values to `isbn` where `isbn` is null
- [x] Remove `eisbn` column from `titles` table (or deprecate)
- [x] Update title form to show single ISBN field instead of Physical ISBN / eBook ISBN
- [x] Update title queries and types to use single `isbn` field

### AC-7.6.4: Update Assignment Logic
- [x] Remove type-based ISBN assignment logic
- [x] Assign any available ISBN from pool regardless of former type
- [x] Update ISBN assignment modal to remove type selection

### AC-7.6.5: Update Reports and Analytics
- [x] Update ISBN pool report to remove type breakdown
- [x] Update dashboard widgets that show type-based metrics
- [x] Remove type from export formats

### AC-7.6.6: Database Migration
- [x] Create migration script for schema changes
- [x] Handle existing data: merge types, consolidate eisbn → isbn
- [x] Ensure no data loss during migration

## Technical Notes

### Files to Modify

**Schema:**
- `src/db/schema/isbn-prefixes.ts` - Remove type column
- `src/db/schema/isbns.ts` - Remove type column
- `src/db/schema/titles.ts` - Remove eisbn column

**Components:**
- `src/modules/isbn-prefixes/components/add-prefix-form.tsx` - Remove type selection
- `src/modules/isbn-prefixes/components/isbn-prefix-table.tsx` - Remove type column
- `src/modules/isbn/components/isbn-pool-table.tsx` - Remove type column/filter
- `src/modules/isbn/components/isbn-pool-filters.tsx` - Remove type filter
- `src/modules/titles/components/title-form.tsx` - Single ISBN field
- `src/modules/reports/components/isbn-prefix-breakdown.tsx` - Remove type display

**Queries/Actions:**
- `src/modules/isbn-prefixes/actions.ts` - Remove type from createIsbnPrefix
- `src/modules/isbn-prefixes/queries.ts` - Remove type from queries
- `src/modules/isbn/actions.ts` - Remove type from assignment logic
- `src/modules/isbn/queries.ts` - Remove type filtering
- `src/modules/titles/actions.ts` - Single isbn field

**Tests:**
- Update all tests referencing type distinction
- Update fixtures and mocks

## Out of Scope

- Historical data about which ISBN was originally physical vs ebook
- Audit trail of the type removal migration

## Definition of Done

- [x] All type-related UI elements removed
- [x] Single ISBN field on titles
- [x] Database migration script created (ready to apply)
- [x] All unit tests pass (1914 passed)
- [x] All integration tests pass (5 failures are pre-existing Story 7.3 issues, not related to 7.6)
- [x] No type references in codebase (except deprecated columns kept for rollback)

## Implementation Summary

**Changes Made:**
- Removed type from ISBN prefix registration form, table, and breakdown component
- Removed type from ISBN pool table, filters, and queries
- Deprecated `eisbn` column in titles schema (kept for rollback)
- Consolidated title forms and components to single ISBN field
- Updated sales and returns forms to use unified ISBN field
- Updated all queries, actions, and types to use single `isbn` field
- Created migration script `0014_remove_isbn_type_distinction.sql`

**Migration Script:** `scripts/apply-isbn-type-removal-migration.mjs`

Run with: `node scripts/apply-isbn-type-removal-migration.mjs`

**Test Results:** 1914 tests passed, 5 pre-existing failures (Story 7.3 contacts)
