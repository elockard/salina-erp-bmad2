# Story 3.5: Build Return Request Entry Form

Status: drafted

## Story

As an editor,
I want to record return requests for approval,
so that returns go through proper workflow before affecting financials.

## Acceptance Criteria

1. Return entry page exists at `/returns/new` with "Spacious Guided Flow" layout
   - Page header: "Record Return Request"
   - Subtitle: "Submit return requests for approval before affecting royalties"
   - Form centered with max-width constraint (matching sales form pattern)

2. Title autocomplete search field
   - Debounced search (300ms) returns titles matching search term
   - Shows title name and author in dropdown
   - Displays available formats (physical/ebook based on ISBN availability)
   - Required field with validation

3. Format dropdown filtered by selected title
   - Only shows formats with assigned ISBNs (physical if isbn, ebook if eisbn)
   - Required field, auto-selects if only one format available
   - Disabled until title is selected

4. Quantity Returned field
   - Number input, required
   - Must be positive integer > 0
   - Validation message: "Quantity must be greater than 0"

5. Unit Price field
   - Currency input with $ prefix
   - Required, must be positive decimal
   - Maximum 2 decimal places
   - Should match original sale price (informational, not enforced)

6. Return Date field
   - Date picker, defaults to today's date
   - Cannot be in the future
   - Uses tenant timezone for display

7. Reason dropdown with optional text
   - Dropdown options: "Damaged", "Unsold inventory", "Customer return", "Other"
   - Required field
   - If "Other" selected, text field appears and becomes required
   - Text field placeholder: "Please describe the reason for return"

8. Original Sale Reference field
   - Optional text input
   - Placeholder: "e.g., Invoice #12345"
   - Helps verification but not validated against sales table

9. Real-time return amount calculation
   - Displayed as negative: "Return Amount: -$312.50"
   - Updates on quantity or unit_price change
   - Uses Decimal.js for calculation (no floating-point errors)

10. Submit button with loading state
    - Button text: "Submit Return Request"
    - Loading state: "Submitting..." with spinner
    - Disabled while submitting

11. On successful submit
    - Creates return record with status='pending'
    - Sets created_by_user_id to current user
    - Success toast: "✓ Return request submitted for approval"
    - Redirects to `/returns` (returns history)

12. Permission enforcement
    - Only Editor, Finance, Admin, or Owner can access
    - Uses RECORD_RETURNS permission constant
    - Redirects unauthorized users to dashboard with error

13. Form validation
    - All required fields validated before submit
    - Server-side validation with Zod schema
    - Field-level error messages displayed inline

14. Cancel/back navigation
    - Cancel button returns to `/returns`
    - Breadcrumb navigation: Dashboard > Returns > Record Return

## Tasks / Subtasks

- [ ] Task 1: Create return entry page route (AC: 1, 12, 14)
  - [ ] Create `src/app/(dashboard)/returns/new/page.tsx`
  - [ ] Add permission check using RECORD_RETURNS
  - [ ] Add breadcrumb navigation component
  - [ ] Add page header with title and subtitle
  - [ ] Import and render ReturnsForm component

- [ ] Task 2: Create Zod validation schemas (AC: 4, 5, 6, 7, 8, 13)
  - [ ] Create `src/modules/returns/schema.ts` (if not exists from 3.4)
  - [ ] Define `createReturnSchema` with all field validations
  - [ ] Define `returnReasonValues` const array
  - [ ] Export `CreateReturnInput` type
  - [ ] Add positive quantity validation
  - [ ] Add positive currency validation
  - [ ] Add date validation (not future)

- [ ] Task 3: Create returns types (AC: 2, 11)
  - [ ] Update `src/modules/returns/types.ts`
  - [ ] Add `TitleForReturnsSelect` type (matching sales pattern)
  - [ ] Add `ReturnRecordResult` type for success response

- [ ] Task 4: Create returns queries (AC: 2, 3)
  - [ ] Create `src/modules/returns/queries.ts`
  - [ ] Add `searchTitlesForReturns` function (reuse sales pattern)
  - [ ] Add `getTitleForReturn` function
  - [ ] Add `getTenantTimezone` function (or reuse from sales)

- [ ] Task 5: Create returns Server Actions (AC: 2, 11, 12, 13)
  - [ ] Create `src/modules/returns/actions.ts`
  - [ ] Add `searchTitlesForReturnsAction` (reuse sales pattern)
  - [ ] Add `recordReturn` Server Action
  - [ ] Include permission check (RECORD_RETURNS)
  - [ ] Include Zod validation
  - [ ] Include tenant_id injection
  - [ ] Set status='pending' on insert
  - [ ] Revalidate paths on success

- [ ] Task 6: Create RECORD_RETURNS permission (AC: 12)
  - [ ] Update `src/lib/permissions.ts`
  - [ ] Add RECORD_RETURNS permission constant
  - [ ] Define roles: owner, admin, editor, finance

- [ ] Task 7: Create ReturnsForm component (AC: 2-10, 14)
  - [ ] Create `src/modules/returns/components/returns-form.tsx`
  - [ ] Use React Hook Form with Zod resolver
  - [ ] Implement title autocomplete with debounced search
  - [ ] Implement format dropdown filtered by title
  - [ ] Implement reason dropdown with conditional text field
  - [ ] Implement real-time return amount calculation
  - [ ] Add form submission handling with toast notifications
  - [ ] Add loading/disabled states
  - [ ] Add cancel button

- [ ] Task 8: Create title search combobox (AC: 2, 3)
  - [ ] Create `src/modules/returns/components/title-search-combobox.tsx`
  - [ ] Implement debounced search (300ms)
  - [ ] Display title name and author in dropdown
  - [ ] Show format availability indicators
  - [ ] Handle selection callback

- [ ] Task 9: Add returns navigation (AC: 14)
  - [ ] Update dashboard navigation to include Returns section
  - [ ] Add "Record Return" action button to returns list page
  - [ ] Ensure breadcrumb shows correct path

- [ ] Task 10: Write unit tests (AC: 4, 5, 7, 13)
  - [ ] Create `tests/unit/returns-schema.test.ts`
  - [ ] Test createReturnSchema validation
  - [ ] Test positive quantity validation
  - [ ] Test positive currency validation
  - [ ] Test reason enum validation
  - [ ] Test date validation (not future)

- [ ] Task 11: Write E2E tests (AC: 1-14)
  - [ ] Update `tests/e2e/returns.spec.ts` or create if needed
  - [ ] Test page access with valid permissions
  - [ ] Test redirect for unauthorized users
  - [ ] Test form submission happy path
  - [ ] Test validation error display
  - [ ] Test success redirect and toast

## Dev Notes

### Relevant Architecture Patterns and Constraints

**Returns Entry Form Pattern (following sales form - architecture.md):**
```typescript
// Pattern from src/modules/sales/components/sales-form.tsx
// Use React Hook Form + Zod + shadcn/ui components
// Debounced title search using Server Action
// Format dropdown filtered by title selection
```

**Server Action Pattern (from architecture.md lines 749-807):**
```typescript
"use server";
export async function recordReturn(data: unknown): Promise<ActionResult<ReturnRecordResult>> {
  // 1. Permission check
  await requirePermission(RECORD_RETURNS);

  // 2. Get current user
  const user = await getCurrentUser();

  // 3. Validate with Zod
  const validated = createReturnSchema.parse(data);

  // 4. Get tenant context
  const tenantId = await getCurrentTenantId();

  // 5. Compute total_amount with Decimal.js
  const totalAmount = new Decimal(validated.unit_price)
    .times(validated.quantity)
    .toFixed(2);

  // 6. Insert return with status='pending'
  const [returnRecord] = await db.insert(returns).values({
    tenant_id: tenantId,
    title_id: validated.title_id,
    format: validated.format,
    quantity: validated.quantity,
    unit_price: validated.unit_price,
    total_amount: totalAmount,
    return_date: validated.return_date,
    reason: validated.reason,
    status: 'pending',
    created_by_user_id: user.id,
  }).returning();

  // 7. Revalidate paths
  revalidatePath('/returns');
  revalidatePath('/dashboard');

  return { success: true, data: { ... } };
}
```

**Reason Enum Values:**
```typescript
export const returnReasonValues = [
  "damaged",
  "unsold_inventory",
  "customer_return",
  "other"
] as const;
export type ReturnReason = (typeof returnReasonValues)[number];
```

**Currency Calculation (CRITICAL - from architecture.md):**
```typescript
import Decimal from "decimal.js";
// NEVER use JavaScript arithmetic for currency
const totalAmount = new Decimal(unit_price)
  .times(quantity)
  .toFixed(2);
```

### Learnings from Previous Stories

**From Story 3-4 (Create Returns Database Schema) - Status: Drafted:**

- Story 3-4 has not yet been implemented
- Schema patterns to follow from sales.ts:
  - Format enum: physical, ebook, audiobook
  - Status enum: pending, approved, rejected
  - Foreign keys to titles, users
  - CHECK constraints for positive values

**From Story 3-2 (Build Sales Transaction Entry Form) - Status: Done:**

- **Component Pattern**: Follow `src/modules/sales/components/sales-form.tsx`
- **Title Search**: Reuse debounced autocomplete pattern from sales
- **Format Filtering**: Filter formats by ISBN availability
- **Form Structure**: Use React Hook Form + Zod + shadcn/ui
- **Decimal Calculation**: Use Decimal.js for total_amount
- **Toast Pattern**: Use sonner for success/error messages

**Files to Reference:**
- `src/modules/sales/components/sales-form.tsx` - Form component pattern
- `src/modules/sales/actions.ts` - Server Action pattern
- `src/modules/sales/schema.ts` - Zod validation pattern
- `src/modules/sales/queries.ts` - Title search queries
- `src/app/(dashboard)/sales/new/page.tsx` - Page route pattern

[Source: docs/sprint-artifacts/3-2-build-sales-transaction-entry-form.md]

### Project Structure Notes

**New Files for Story 3.5:**
```
src/
├── app/
│   └── (dashboard)/
│       └── returns/
│           └── new/
│               └── page.tsx          # NEW: Return entry page
├── modules/
│   └── returns/
│       ├── actions.ts                # NEW or UPDATE: Server Actions
│       ├── queries.ts                # NEW or UPDATE: Database queries
│       ├── schema.ts                 # UPDATE: Add createReturnSchema
│       ├── types.ts                  # UPDATE: Add form types
│       └── components/
│           ├── returns-form.tsx      # NEW: Return entry form
│           └── title-search-combobox.tsx  # NEW: Title search component

src/lib/permissions.ts                # UPDATE: Add RECORD_RETURNS

tests/
├── unit/
│   └── returns-schema.test.ts        # UPDATE: Add form validation tests
└── e2e/
    └── returns.spec.ts               # UPDATE: Add form E2E tests
```

**Alignment with Unified Project Structure:**
- Page route follows `(dashboard)` group pattern
- Module in `src/modules/returns/` following sales module pattern
- Components in `src/modules/returns/components/`
- Tests in `tests/unit/` and `tests/e2e/`

### FRs Implemented

- **FR30**: Editors can record return transactions with negative quantity
- **FR31**: Users must provide return reason and reference to original sale (optional)
- **FR32**: Return requests are created with "pending" status awaiting approval

### Design Decisions

**Return Amount Display as Negative:** The return amount is displayed as a negative value (e.g., "-$312.50") to clearly indicate it's a deduction from revenue/royalties. The actual `quantity` and `total_amount` stored in the database are positive values - the negative display is purely for UX clarity.

**Reason Enum with "Other":** The reason dropdown includes predefined values plus "Other" which requires a text description. This balances structured data for reporting with flexibility for edge cases. The reason field stores the enum value, with optional `reason_other` text stored separately or in the same field as "other: [text]".

**Original Sale Reference Optional:** Unlike some ERP systems that require linking returns to specific sale records, this system makes it optional. This reflects real-world publishing where returns often arrive without clear sale references (e.g., bulk distributor returns).

**Permission Reuse Pattern:** Uses same permission check pattern as sales (RECORD_RETURNS mirrors RECORD_SALES) allowing same roles to record both transactions.

### References

- [Source: docs/epics.md#Story-3.5]
- [Source: docs/prd.md#FR30-FR32]
- [Source: docs/architecture.md#Returns-Management]
- [Source: docs/architecture.md#Server-Action-Pattern]
- [Source: src/modules/sales/components/sales-form.tsx] - Form component pattern
- [Source: src/modules/sales/actions.ts] - Server Action pattern

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2025-11-25: Story 3.5 drafted by SM Agent (Bob) - 14 ACs, 11 tasks, return request entry form following sales form pattern
