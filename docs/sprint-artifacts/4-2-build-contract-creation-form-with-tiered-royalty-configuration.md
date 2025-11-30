# Story 4.2: Build Contract Creation Form with Tiered Royalty Configuration

Status: done

## Story

As an editor,
I want to create royalty contracts with tiered rates by format,
so that author payment terms are properly documented.

## Acceptance Criteria

1. Contract form displays multi-step wizard modal with 5 steps
   - Step 1: Basic Information (author, title, status, advance)
   - Step 2: Physical Book Royalty Tiers
   - Step 3: Ebook Royalty Tiers
   - Step 4: Audiobook Royalty Tiers (optional, skippable)
   - Step 5: Review & Create summary

2. Step 1 (Basic Information) includes required fields
   - Author (searchable dropdown, required)
   - Title (searchable dropdown, required)
   - Status (dropdown: Active/Suspended/Terminated, default: Active)
   - Advance Amount (currency input, optional, default: $0.00)
   - Advance Paid (currency input, optional, default: $0.00)

3. Steps 2-4 (Tier Configuration) implement dynamic tier builder
   - Tier 1: 0 - [input] units @ [input]% royalty
   - Tier 2: [auto-filled from Tier 1 max+1] - [input] units @ [input]%
   - Tier N: [auto-filled] - Infinity @ [input]%
   - "Add Tier" button (up to 5 tiers per format)
   - Example shown: "0-5,000 @ 10%, 5,001-10,000 @ 12%, 10,001+ @ 15%"

4. Tier validation enforces business rules
   - Tiers cannot overlap
   - Tiers must be sequential (next tier starts at previous max + 1)
   - Royalty rates must be between 0% and 100%
   - At least one tier required per format if format is enabled
   - min_quantity >= 0 (non-negative)

5. Step 5 (Review & Create) displays summary
   - All configured tiers by format in table format
   - Advance information (amount, paid)
   - Author and title confirmation
   - "Create Contract" button

6. Server Action creates contract and tiers atomically
   - Creates contract record with all columns
   - Creates separate contract_tiers rows for each tier/format combination
   - Uses database transaction for atomicity
   - Returns created contract with tiers

7. Form submission feedback implemented
   - Success toast: "✓ Contract created for [Author] - [Title]"
   - Error handling with user-friendly messages
   - Redirects to contract detail view on success

8. Duplicate contract prevention enforced
   - Cannot create duplicate contract (same author + title + tenant)
   - Shows error if duplicate attempted
   - Uses unique constraint from Story 4.1 schema

9. Permission check enforced
   - Only Editor, Admin, or Owner roles can create contracts
   - Unauthorized users see disabled button or no access

10. Contract entry accessible from multiple locations
    - From Author detail view: "Create Contract" action
    - From Title detail view: "Create Contract" action
    - From Royalties module: "New Contract" button

## Tasks / Subtasks

- [x] Task 1: Create royalties module structure (AC: 6, 9)
  - [x] Create `src/modules/royalties/` directory
  - [x] Create `actions.ts` with createContract server action
  - [x] Create `queries.ts` with contract query functions
  - [x] Create `schema.ts` with Zod validation schemas
  - [x] Create `types.ts` with TypeScript interfaces
  - [x] Implement permission checking (Editor/Admin/Owner)

- [x] Task 2: Build wizard modal shell component (AC: 1)
  - [x] Create `components/contract-wizard-modal.tsx`
  - [x] Implement 5-step wizard navigation
  - [x] Add progress indicator per UX spec
  - [x] Implement Back/Next/Cancel button logic
  - [x] Handle modal open/close state

- [x] Task 3: Build Step 1 - Basic Information form (AC: 2)
  - [x] Create `components/contract-step-basic-info.tsx`
  - [x] Implement searchable author dropdown with Combobox
  - [x] Implement searchable title dropdown with Combobox
  - [x] Add status dropdown (Active/Suspended/Terminated)
  - [x] Add currency inputs for advance amount and paid
  - [x] Wire up form state with React Hook Form

- [x] Task 4: Build Steps 2-4 - Tier Configuration component (AC: 3, 4)
  - [x] Create `components/contract-tier-builder.tsx` (reusable)
  - [x] Implement dynamic tier row addition (max 5 tiers)
  - [x] Implement tier row removal
  - [x] Auto-fill min_quantity from previous tier max + 1
  - [x] Add "Infinity" option for last tier max_quantity
  - [x] Implement tier validation (sequential, non-overlapping)
  - [x] Add example text display

- [x] Task 5: Build Step 5 - Review & Create summary (AC: 5)
  - [x] Create `components/contract-step-review.tsx`
  - [x] Display tier tables by format
  - [x] Display advance summary
  - [x] Display author/title confirmation
  - [x] Add "Create Contract" action button

- [x] Task 6: Implement server action and database integration (AC: 6, 7, 8)
  - [x] Implement `createContract` server action in actions.ts
  - [x] Use database transaction for atomic creation
  - [x] Create contract record with all fields
  - [x] Create contract_tiers records for each tier
  - [x] Handle unique constraint violation (duplicate prevention)
  - [x] Return ActionResult<Contract> with proper error handling

- [x] Task 7: Wire up entry points and navigation (AC: 10, 7)
  - [x] Add "Create Contract" button to author detail view
  - [x] Add "Create Contract" button to title detail view
  - [x] Create `/royalties` route with contracts list
  - [x] Add "New Contract" button to royalties page
  - [ ] Implement redirect to contract detail after creation (deferred to Story 4.3)

- [x] Task 8: Write unit tests (AC: 4, 6, 8, 9)
  - [x] Create `tests/unit/royalties-schema.test.ts`
  - [x] Test tier validation logic (sequential, non-overlapping)
  - [x] Test rate boundary validation (0-100%)
  - [x] Test form schema validation
  - [x] Test permission checking logic
  - [x] Test duplicate detection

## Dev Notes

### Relevant Architecture Patterns and Constraints

**Module Structure (from architecture.md lines 174-182):**
```typescript
src/modules/royalties/                # FR38-52: Contracts & calculations
├── components/
│   ├── contract-form.tsx
│   └── tiered-royalty-config.tsx
├── calculator.ts         # Royalty calculation engine (Story 4.4)
├── actions.ts
├── queries.ts
├── schema.ts
└── types.ts
```

**Server Action Pattern (from architecture.md lines 798-806):**
```typescript
"use server"
export async function createContract(data: unknown): Promise<ActionResult<Contract>> {
  try {
    const validated = contractSchema.parse(data)
    const user = await getCurrentUser()
    if (!["editor", "admin", "owner"].includes(user.role)) {
      return { success: false, error: "Unauthorized" }
    }
    // ... implementation
  } catch (error) {
    // ... error handling
  }
}
```

**Transaction Pattern (from architecture.md lines 927-973):**
```typescript
const result = await db.transaction(async (tx) => {
  // Step 1: Create contract
  const contract = await tx.insert(contracts).values({...}).returning()

  // Step 2: Create tiers
  for (const tier of tiers) {
    await tx.insert(contractTiers).values({
      contract_id: contract[0].id,
      ...tier
    })
  }

  return contract[0]
})
```

**Currency Handling (from architecture.md lines 1317-1357):**
```typescript
import Decimal from "decimal.js"

// Use Decimal.js for financial calculations
const advanceAmount = new Decimal(data.advance_amount)
const advancePaid = new Decimal(data.advance_paid)

// Store as DECIMAL(10,2) in database
// Display with Intl.NumberFormat
formatCurrency(advanceAmount.toNumber()) // "$10,000.00"
```

**Zod Schema Pattern (from existing modules):**
```typescript
import { z } from "zod"

const tierSchema = z.object({
  format: z.enum(["physical", "ebook", "audiobook"]),
  min_quantity: z.number().int().min(0),
  max_quantity: z.number().int().min(1).nullable(),
  rate: z.number().min(0).max(1), // 0.10 = 10%
})

const contractFormSchema = z.object({
  author_id: z.string().uuid(),
  title_id: z.string().uuid(),
  status: z.enum(["active", "suspended", "terminated"]).default("active"),
  advance_amount: z.string().regex(/^\d+\.?\d{0,2}$/),
  advance_paid: z.string().regex(/^\d+\.?\d{0,2}$/),
  tiers: z.array(tierSchema).min(1),
})
```

### Learnings from Previous Story

**From Story 4-1-create-royalty-contract-database-schema-with-tiered-rates (Status: done)**

- **Schema Files Created:**
  - `src/db/schema/contracts.ts` - Contracts and contract_tiers tables with full schema
  - `drizzle/migrations/0008_mute_forge.sql` - Migration applied

- **Schema Exports Available:**
  - `contracts` table with columns: id, tenant_id, author_id, title_id, advance_amount, advance_paid, advance_recouped, status, created_at, updated_at
  - `contractTiers` table with columns: id, contract_id, format, min_quantity, max_quantity, rate, created_at
  - Types: `Contract`, `InsertContract`, `ContractTier`, `InsertContractTier`

- **Indexes Created:**
  - tenant_id, author_id, title_id, status on contracts
  - contract_id on contract_tiers
  - Composite (tenant_id, author_id, title_id) unique constraint

- **CHECK Constraints Active:**
  - advance_amount >= 0, advance_paid >= 0, advance_recouped >= 0
  - min_quantity >= 0
  - max_quantity > min_quantity (when not null)
  - rate >= 0 AND rate <= 1

- **Relations Defined:**
  - `contractsRelations`: tenant, author, title, tiers
  - `contractTiersRelations`: contract

- **Key Implementation Detail:** Rate stored as DECIMAL(5,4) where 0.1000 = 10%

[Source: docs/sprint-artifacts/4-1-create-royalty-contract-database-schema-with-tiered-rates.md#Dev-Agent-Record]

### Project Structure Notes

**Files to Create:**
```
src/
└── modules/
    └── royalties/
        ├── components/
        │   ├── contract-wizard-modal.tsx       # Main wizard modal
        │   ├── contract-step-basic-info.tsx    # Step 1 form
        │   ├── contract-tier-builder.tsx       # Steps 2-4 tier config
        │   └── contract-step-review.tsx        # Step 5 summary
        ├── actions.ts                          # Server actions
        ├── queries.ts                          # Query functions
        ├── schema.ts                           # Zod validation
        └── types.ts                            # TypeScript types

src/
└── app/
    └── (dashboard)/
        └── royalties/
            └── page.tsx                        # Contracts list page

tests/
└── unit/
    └── contract-form.test.ts                   # Form validation tests
```

**Files to Modify:**
```
src/modules/authors/components/author-detail.tsx  # Add "Create Contract" button
src/modules/titles/components/title-detail.tsx    # Add "Create Contract" button
src/lib/dashboard-nav.ts                          # Add Royalties navigation item
```

**Alignment with Unified Project Structure:**
- Module in `src/modules/royalties/` following existing patterns
- Components in `components/` subdirectory
- Server Actions in `actions.ts` with "use server" directive
- Zod schemas in `schema.ts` for client and server validation
- Types in `types.ts` matching database schema types

### FRs Implemented

- **FR38**: Editors can create royalty contracts linking authors to titles (contract creation form)
- **FR39**: Users can configure tiered royalty rates by format and sales volume (tier builder UI)
- **FR40**: System supports multiple tiers per format (dynamic tier addition)

### Design Decisions

**Multi-Step Wizard Pattern:** Using a wizard modal rather than single form reduces cognitive load for complex tier configuration. Each step focuses on one aspect (basic info, then each format's tiers), matching UX spec "Wizard-Guided Modal" pattern.

**Reusable Tier Builder:** The `contract-tier-builder.tsx` component is used for all three format steps (physical, ebook, audiobook), reducing code duplication and ensuring consistent behavior.

**Auto-Fill Next Tier Minimum:** When user enters max quantity for a tier, the next tier's min_quantity auto-fills to max + 1, preventing gaps or overlaps and reducing user errors.

**Decimal Rate Storage:** Rates entered as percentages (10%) are converted to decimals (0.10) for storage, matching the DECIMAL(5,4) schema from Story 4.1.

**Optional Audiobook Step:** Step 4 can be skipped if title has no audiobook format, allowing flexibility without forcing empty tier configuration.

### Testing Strategy

**Unit Tests (tests/unit/contract-form.test.ts):**
- Tier validation: sequential, non-overlapping ranges
- Rate validation: 0-100% converted to 0-1 decimal
- Required field validation
- Currency input parsing
- Permission checking

**Integration Tests (future):**
- Full wizard flow E2E test
- Contract creation with database verification
- Duplicate prevention behavior
- Entry point navigation

### UI/UX Notes

**Wizard Progress Indicator:**
```
[1. Basic Info] → [2. Physical] → [3. Ebook] → [4. Audiobook] → [5. Review]
     ●              ○               ○             ○              ○
```

**Tier Builder Example Display:**
```
"Example: 0-5,000 units @ 10%, 5,001-10,000 units @ 12%, 10,001+ units @ 15%"
```

**Currency Input Format:**
- Display with $ symbol and comma separators
- Accept input as plain numbers
- Format on blur: "10000" → "$10,000.00"

### References

- [Source: docs/epics.md#Story-4.2]
- [Source: docs/prd.md#FR38-FR40]
- [Source: docs/architecture.md#modules/royalties]
- [Source: docs/architecture.md#Transaction-Pattern]
- [Source: docs/ux-design-specification.md#Wizard-Guided-Modal]
- [Source: src/db/schema/contracts.ts] - Schema from Story 4.1
- [Source: docs/sprint-artifacts/4-1-create-royalty-contract-database-schema-with-tiered-rates.md] - Previous story

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/4-2-build-contract-creation-form-with-tiered-royalty-configuration.context.xml

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- All 8 tasks completed successfully
- 53 unit tests passing for schema validation
- All 3 entry points implemented (author detail, title detail, royalties page)
- AC 7 partial: redirect to contract detail deferred to Story 4.3 (view doesn't exist yet)
- Permission check uses new MANAGE_CONTRACTS constant in permissions.ts

### File List

**Created:**
- `src/modules/royalties/types.ts` - TypeScript interfaces
- `src/modules/royalties/schema.ts` - Zod validation schemas (184 lines)
- `src/modules/royalties/queries.ts` - Query functions for search/fetch
- `src/modules/royalties/actions.ts` - Server actions with createContract (231 lines)
- `src/modules/royalties/index.ts` - Module exports
- `src/modules/royalties/components/contract-wizard-modal.tsx` - 5-step wizard (443 lines)
- `src/modules/royalties/components/contract-step-basic-info.tsx` - Step 1 form (405 lines)
- `src/modules/royalties/components/contract-tier-builder.tsx` - Tier config (376 lines)
- `src/modules/royalties/components/contract-step-review.tsx` - Review summary (263 lines)
- `src/modules/royalties/components/index.ts` - Component exports
- `src/app/(dashboard)/royalties/page.tsx` - Contracts list page (299 lines)
- `src/components/ui/alert.tsx` - Alert component (missing shadcn)
- `tests/unit/royalties-schema.test.ts` - 53 unit tests

**Modified:**
- `src/lib/permissions.ts` - Added MANAGE_CONTRACTS permission
- `src/lib/dashboard-nav.ts` - Enabled Royalties nav item
- `src/modules/authors/components/author-detail.tsx` - Added Create Contract button
- `src/modules/titles/components/title-detail.tsx` - Added Create Contract button

## Change Log

- 2025-11-29: Story 4.2 drafted by SM Agent (Bob) - 10 ACs, 8 tasks, contract creation form with tiered royalty configuration
- 2025-11-29: Story 4.2 implementation completed by Dev Agent - All tasks done, 53 unit tests passing
- 2025-11-29: Senior Developer Review appended - APPROVED with notes

---

## Senior Developer Review (AI)

### Review Metadata
- **Reviewer:** BMad
- **Date:** 2025-11-29
- **Outcome:** APPROVE with Notes

### Summary

Story 4.2 implementation is substantially complete with all major functionality working. The code is well-structured, follows existing patterns, and includes comprehensive validation. AC 7 redirect to contract detail is appropriately deferred to Story 4.3 when that view will be implemented.

### Key Findings

**MEDIUM Severity:**
- Process Issue: Task checkboxes were not updated during development (now corrected)

**LOW Severity:**
- AC 7 partial: Redirect to contract detail deferred to Story 4.3
- Contract table row click shows toast instead of navigation (expected - Story 4.3)

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| AC 1 | 5-step wizard modal | IMPLEMENTED | `contract-wizard-modal.tsx:44-50, :334-373` |
| AC 2 | Step 1 Basic Info fields | IMPLEMENTED | `contract-step-basic-info.tsx:156-402` |
| AC 3 | Dynamic tier builder | IMPLEMENTED | `contract-tier-builder.tsx:65-85, :93-103, :31` |
| AC 4 | Tier validation rules | IMPLEMENTED | `schema.ts:107-141` |
| AC 5 | Review & Create summary | IMPLEMENTED | `contract-step-review.tsx:46-263` |
| AC 6 | Atomic server action | IMPLEMENTED | `actions.ts:146-173` |
| AC 7 | Form submission feedback | PARTIAL | Toast implemented, redirect deferred to 4.3 |
| AC 8 | Duplicate prevention | IMPLEMENTED | `actions.ts:121-131, :214-223` |
| AC 9 | Permission check | IMPLEMENTED | `actions.ts:105`, `permissions.ts:57` |
| AC 10 | Entry points | IMPLEMENTED | All 3 locations |

**Summary:** 9 of 10 ACs fully implemented, 1 partial (AC 7 - redirect deferred)

### Task Completion Validation

| Task | Verified As | Evidence |
|------|-------------|----------|
| Task 1 | DONE | `src/modules/royalties/` with all files |
| Task 2 | DONE | `contract-wizard-modal.tsx` - 443 lines |
| Task 3 | DONE | `contract-step-basic-info.tsx` - 405 lines |
| Task 4 | DONE | `contract-tier-builder.tsx` - 376 lines |
| Task 5 | DONE | `contract-step-review.tsx` - 263 lines |
| Task 6 | DONE | `actions.ts:100-231` with transaction |
| Task 7 | DONE | All 3 entry points implemented |
| Task 8 | DONE | 53 tests passing |

### Test Coverage

- **53 unit tests** in `royalties-schema.test.ts`
- Covers: tier validation, rate boundaries, sequential tiers, schema validation
- All tests passing

### Architectural Alignment

- Modular monolith pattern followed
- Server Actions with permission check at entry
- Transaction for atomic operations
- Zod validation on both client and server

### Action Items

**Advisory Notes:**
- Note: AC 7 redirect to contract detail will be implemented in Story 4.3
- Note: Consider E2E tests for full wizard flow in future
