# Story 8.3: Build Invoice List and Detail Views

Status: done

## Quick Reference

| Pattern | Source File |
|---------|-------------|
| List table (TanStack) | `src/modules/statements/components/statements-list.tsx` |
| Status badge | `src/modules/statements/components/statement-status-badge.tsx` |
| Filters component | `src/modules/statements/components/statements-filters.tsx` |
| Detail modal | `src/modules/statements/components/statement-detail-modal.tsx` |
| Pagination | `src/modules/statements/components/statements-pagination.tsx` |
| Invoice types | `src/modules/invoices/types.ts` |
| Invoice queries | `src/modules/invoices/queries.ts` |
| Invoice actions | `src/modules/invoices/actions.ts` |

## Story

As a **finance user**,
I want **to view and manage invoices**,
So that **I can track billing status**.

## Acceptance Criteria

### AC-8.3.1: Invoice List View
**Given** I am logged in as Finance, Admin, or Owner
**When** I navigate to /invoices
**Then** I see invoice management interface with:
- Table columns: Invoice # | Date | Customer | Amount | Balance | Status | Actions
- Status badges with colors: Draft=gray, Sent=blue, Paid=green, Partially Paid=yellow, Overdue=red, Void=muted
- Data sorted by date (default newest first)

### AC-8.3.2: Invoice List Filters
**Given** the invoice list is displayed
**Then** I can filter by:
- Status dropdown (All, Draft, Sent, Paid, Partially Paid, Overdue, Void)
- Customer selector (searchable combobox)
- Date Range picker (invoice date from/to)
**And** filters apply immediately

### AC-8.3.3: Invoice List Sorting
**Given** the invoice list is displayed
**When** I click column headers
**Then** I can sort by:
- Date (ascending/descending)
- Amount (ascending/descending)
- Customer name (ascending/descending)
- Balance (ascending/descending)

### AC-8.3.4: Invoice List Quick Actions
**Given** the invoice list is displayed
**Then** each row has action dropdown with:
- View (always available)
- Edit (only if status='draft')
- Record Payment (if status='sent' or 'partially_paid')
- Send (if status='draft')
- Void (if not already 'void' or 'paid')

### AC-8.3.5: Invoice Detail View
**Given** I click View on an invoice or navigate to /invoices/[id]
**Then** I see full invoice display with:
- Header: Company info, Invoice #, Invoice Date, Due Date
- Bill-to / Ship-to addresses
- Line items table with columns: Line # | Item Code | Description | Qty | Unit Price | Amount
- Totals section: Subtotal, Tax, Shipping, Grand Total
- Payment history table (if any payments): Date | Amount | Method | Reference | Recorded By
- Status badge and payment terms

### AC-8.3.6: Invoice Detail Actions
**Given** the invoice detail view is displayed
**Then** action buttons are shown:
- Edit (draft only) - navigates to /invoices/[id]/edit
- Send (draft only) - future story 8.6
- Record Payment (sent/partially_paid) - future story 8.4
- Void (not void/paid) - with confirmation dialog
- Print (opens print dialog)
- Download PDF (future story 8.6)

### AC-8.3.7: Edit Invoice (Draft Only)
**Given** I click Edit on a draft invoice
**When** navigating to /invoices/[id]/edit
**Then** I see the same form as create with:
- Pre-populated with existing invoice data
- All line items loaded
- Save Changes button
- Cancel button (returns to detail view)
**And** only draft invoices can be edited

### AC-8.3.8: Invoice Status Workflow
**Given** invoice status transitions are triggered
**Then** the following rules apply:
- Draft -> Sent (on first send action - Story 8.6)
- Sent -> Paid (when balance_due = 0)
- Sent -> Partially Paid (when payment recorded but balance_due > 0)
- Sent -> Overdue (automatic when past due_date - background job)
- Any -> Void (manual action with confirmation, except paid invoices)

**Business Rule Note:** Paid invoices cannot be voided per standard accounting practice. To reverse a paid invoice, issue a credit memo or process a refund (future enhancement). This prevents AR balance inconsistencies.

### AC-8.3.9: Void Invoice Confirmation
**Given** I click Void on an invoice
**Then** a confirmation dialog appears:
- Warning: "This action cannot be undone"
- Shows invoice number and amount
- Optional void reason textarea
- Confirm and Cancel buttons
**When** I confirm
**Then** invoice status changes to 'void'
**And** audit log records the void action with reason

### AC-8.3.10: Empty State
**Given** no invoices exist for the tenant
**When** I view the invoices page
**Then** I see an empty state with:
- Message: "No invoices yet"
- Button: "Create Your First Invoice" -> /invoices/new

## Tasks / Subtasks

- [x] **Task 1: Create Invoice Status Badge Component** (AC: 8.3.1)
  - [x] Create `src/modules/invoices/components/invoice-status-badge.tsx`
  - [x] Use pattern from `src/modules/statements/components/statement-status-badge.tsx`
  - [x] Status colors: draft=gray, sent=blue, paid=green, partially_paid=yellow, overdue=red, void=muted
  - [x] Export from `src/modules/invoices/components/index.ts`

- [x] **Task 2: Create Invoice List Table Component** (AC: 8.3.1, 8.3.3, 8.3.4)
  - [x] Create `src/modules/invoices/components/invoice-list-table.tsx`
  - [x] Use TanStack Table pattern from `src/modules/statements/components/statements-list.tsx`
  - [x] Columns: Invoice # | Date | Customer | Amount | Balance | Status | Actions
  - [x] Implement sortable columns (Date, Amount, Customer, Balance)
  - [x] Actions dropdown with View, Edit, Record Payment, Send, Void (conditional)
  - [x] Loading skeleton state
  - [x] Empty state with CTA

- [x] **Task 3: Create Invoice Filters Component** (AC: 8.3.2)
  - [x] Create `src/modules/invoices/components/invoice-filters.tsx`
  - [x] Status dropdown (Select with all status options)
  - [x] Customer combobox (reuse customer-selector pattern)
  - [x] Date range picker (from/to inputs)
  - [x] Clear filters button
  - [x] Call parent callback on filter change

- [x] **Task 4: Create Invoice Detail Component** (AC: 8.3.5, 8.3.6)
  - [x] Create `src/modules/invoices/components/invoice-detail.tsx`
  - [x] Header section: Company name, invoice number, dates
  - [x] Address cards: Bill-to and Ship-to
  - [x] Line items table with all columns
  - [x] Totals section with subtotal, tax, shipping, total, amount paid, balance due
  - [x] Payment history table (uses payments relation)
  - [x] Action buttons (Edit, Send, Record Payment, Void, Print)

- [x] **Task 5: Create Void Confirmation Dialog** (AC: 8.3.9)
  - [x] Create `src/modules/invoices/components/void-invoice-dialog.tsx`
  - [x] Use Dialog component from shadcn/ui
  - [x] Show warning, invoice number, amount
  - [x] Optional void reason textarea
  - [x] Confirm/Cancel buttons
  - [x] Call voidInvoice action on confirm

- [x] **Task 6: Update Invoice List Page** (AC: 8.3.1, 8.3.2, 8.3.10)
  - [x] Update `src/app/(dashboard)/invoices/page.tsx`
  - [x] Replace placeholder with InvoiceListClient component
  - [x] Server component fetches initial data
  - [x] Pass initial invoices and filter options to client

- [x] **Task 7: Create Invoice List Client Component** (AC: ALL)
  - [x] Create `src/modules/invoices/components/invoice-list-client.tsx`
  - [x] Manage filter state with URL search params (useSearchParams)
  - [x] Implement pagination:
    - [x] Page size selector (10, 25, 50 items)
    - [x] Current page state and navigation buttons
    - [x] Display "Showing X-Y of Z invoices" summary
    - [x] Use offset/limit in query: `offset = (page - 1) * pageSize`
    - [x] Pattern: `src/modules/statements/components/statements-pagination.tsx`
  - [x] Wire up table actions (View, Edit, Record Payment, Send, Void)
  - [x] Navigate to detail view on View action
  - [x] Show void confirmation dialog

- [x] **Task 8: Create Invoice Detail Page** (AC: 8.3.5)
  - [x] Create `src/app/(dashboard)/invoices/[id]/page.tsx`
  - [x] Server component: fetch invoice with relations
  - [x] Handle 404 if not found
  - [x] Render InvoiceDetail component

- [x] **Task 9: Create Invoice Edit Page** (AC: 8.3.7)
  - [x] Create `src/app/(dashboard)/invoices/[id]/edit/page.tsx`
  - [x] Server component: fetch invoice, verify draft status
  - [x] Redirect to detail if not draft
  - [x] Render InvoiceForm with pre-populated data
  - [x] Update action saves changes

- [x] **Task 10: Implement Server Actions** (AC: 8.3.8, 8.3.9)
  - [x] Implement `updateInvoice()` in `src/modules/invoices/actions.ts`
  - [x] Implement `voidInvoice()` with confirmation reason
  - [x] Permission checks: Finance, Admin, Owner only
  - [x] Audit logging for updates and voids
  - [x] Validate status transitions

- [x] **Task 11: Implement Queries** (AC: 8.3.1, 8.3.2, 8.3.5)
  - [x] Update `getInvoices()` to support filters and pagination
  - [x] Add `getInvoicesWithCustomer()` for list view (join customer name)
  - [x] Add `getInvoiceWithDetails()` for detail view (line items + payments)
  - [x] Add `getInvoiceEditData()` for edit form

- [x] **Task 12: Unit Tests** (AC: ALL)
  - [x] Test status badge rendering for all statuses
  - [x] Test filter logic
  - [x] Test status transition validation
  - [x] Test void action validation

- [x] **Task 13: Integration Tests** (AC: ALL)
  - [x] Test updateInvoice action
  - [x] Test voidInvoice action
  - [x] Test permission enforcement
  - [x] Test tenant isolation

- [x] **Task 14: E2E Tests** (AC: ALL)
  - [x] Test invoice list view loads
  - [x] Test filters work correctly
  - [x] Test navigation to detail view
  - [x] Test edit flow for draft invoice
  - [x] Test void confirmation flow

## Dev Notes

### Architecture Patterns

**List View Pattern:** Follow `src/modules/statements/components/statements-list.tsx`
- TanStack Table for data grid
- Column definitions with accessors
- Action dropdown per row
- Loading and empty states

**Status Badge Pattern:** Follow `src/modules/statements/components/statement-status-badge.tsx`
```typescript
const statusConfig = {
  draft: { label: "Draft", className: "bg-gray-50 text-gray-600 border-gray-200" },
  sent: { label: "Sent", className: "bg-blue-50 text-blue-700 border-blue-200" },
  paid: { label: "Paid", className: "bg-green-50 text-green-700 border-green-200" },
  partially_paid: { label: "Partially Paid", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  overdue: { label: "Overdue", className: "bg-red-50 text-red-700 border-red-200" },
  void: { label: "Void", className: "bg-gray-100 text-gray-500 border-gray-300" },
};
```

**Detail View Layout:**
```
┌────────────────────────────────────────────────────────────┐
│ [Company Name]                            Invoice #: INV-xxx│
│                                           Date: Dec 6, 2025 │
│                                           Due: Jan 5, 2026  │
│                                           Status: [Badge]   │
├────────────────────────────────────────────────────────────┤
│ Bill To:           │ Ship To:                              │
│ Customer Name      │ Same as billing / Different           │
│ Address Line 1     │ Address Line 1                        │
│ City, State ZIP    │ City, State ZIP                       │
├────────────────────────────────────────────────────────────┤
│ Line Items Table                                            │
│ # | Item Code | Description | Qty | Unit Price | Amount    │
│ 1 | SKU-001   | Widget      | 10  | $25.00     | $250.00   │
│ 2 |           | Service Fee |  1  | $50.00     | $50.00    │
├────────────────────────────────────────────────────────────┤
│                                    Subtotal:      $300.00   │
│                                    Tax (8.25%):    $24.75   │
│                                    Shipping:       $15.00   │
│                                    ─────────────────────────│
│                                    Total:         $339.75   │
│                                    Amount Paid:   $100.00   │
│                                    Balance Due:   $239.75   │
├────────────────────────────────────────────────────────────┤
│ Payment History                                              │
│ Date       | Amount  | Method | Reference | Recorded By     │
│ Dec 6      | $100.00 | Check  | #1234     | Jane Finance    │
├────────────────────────────────────────────────────────────┤
│ [Edit] [Send] [Record Payment] [Void] [Print] [Download]    │
└────────────────────────────────────────────────────────────┘
```

### TL;DR Quick Implementation Checklist

1. **Status Badge:** Copy `statement-status-badge.tsx`, update statusConfig for 6 invoice statuses (draft/sent/paid/partially_paid/overdue/void)
2. **List Table:** Copy `statements-list.tsx`, update columns (Invoice#, Date, Customer, Amount, Balance, Status, Actions) and conditional actions
3. **Filters:** 3 filters - status Select, customer Combobox (reuse customer-selector), date range DatePicker inputs
4. **Detail Page:** Full page component with header, address cards, line items table, totals, payment history
5. **Void Dialog:** shadcn Dialog with warning text, reason textarea, calls voidInvoice action
6. **Edit Page:** Reuse InvoiceForm with pre-populated data, redirect if not draft
7. **Actions:** Add `updateInvoice()` and `voidInvoice()` to existing actions.ts with revalidation

### Key Technical Decisions

**UpdateInvoiceInput Type Definition:**
```typescript
// Add to src/modules/invoices/types.ts
export interface UpdateInvoiceInput {
  customerId: string;
  invoiceDate: Date;
  dueDate: Date;
  paymentTerms: PaymentTermsType;
  customTermsDays?: number;
  billToAddress: InvoiceAddress;
  shipToAddress?: InvoiceAddress | null;
  poNumber?: string;
  shippingMethod?: string;
  shippingCost: string;
  taxRate: string;
  lineItems: Array<{
    lineNumber: number;
    itemCode?: string;
    description: string;
    quantity: string;
    unitPrice: string;
    taxRate?: string;
    amount: string;
    titleId?: string;
  }>;
  notes?: string;
  internalNotes?: string;
}
```

**Invoice List Query with Customer:**
```typescript
// In queries.ts
export async function getInvoicesWithCustomer(options?: InvoiceFilters): Promise<InvoiceWithCustomer[]> {
  const tenantId = await getCurrentTenantId();
  const db = await getDb();

  const conditions = [eq(invoices.tenant_id, tenantId)];

  if (options?.status) conditions.push(eq(invoices.status, options.status));
  if (options?.customerId) conditions.push(eq(invoices.customer_id, options.customerId));
  if (options?.startDate) conditions.push(gte(invoices.invoice_date, options.startDate));
  if (options?.endDate) conditions.push(lte(invoices.invoice_date, options.endDate));

  return db.query.invoices.findMany({
    where: and(...conditions),
    with: {
      customer: {
        columns: { id: true, first_name: true, last_name: true, email: true }
      }
    },
    orderBy: [desc(invoices.invoice_date)],
    limit: options?.limit || 50,
    offset: options?.offset || 0,
  });
}
```

**Void Invoice Action:**
```typescript
// In actions.ts
import { revalidatePath } from 'next/cache';

export async function voidInvoice(
  invoiceId: string,
  reason?: string
): Promise<ActionResult<{ invoice: Invoice }>> {
  await requirePermission(["finance", "admin", "owner"]);
  const tenantId = await getCurrentTenantId();
  const user = await getCurrentUser();

  const db = await getDb();

  // Fetch invoice to validate
  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, invoiceId), eq(invoices.tenant_id, tenantId)),
  });

  if (!invoice) return { success: false, error: "Invoice not found" };
  if (invoice.status === "paid") return { success: false, error: "Cannot void a paid invoice" };
  if (invoice.status === "void") return { success: false, error: "Invoice is already void" };

  const [updated] = await db.update(invoices)
    .set({
      status: "void",
      internal_notes: invoice.internal_notes
        ? `${invoice.internal_notes}\n\nVOIDED: ${reason || "No reason provided"}`
        : `VOIDED: ${reason || "No reason provided"}`
    })
    .where(eq(invoices.id, invoiceId))
    .returning();

  logAuditEvent({
    tenantId,
    userId: user.id,
    actionType: "UPDATE",
    resourceType: "invoice",
    resourceId: invoiceId,
    changes: { before: { status: invoice.status }, after: { status: "void" } },
    metadata: { reason, source: "void_invoice_action" },
  });

  // Revalidate cache to refresh list and detail views
  revalidatePath('/invoices');
  revalidatePath(`/invoices/${invoiceId}`);

  return { success: true, data: { invoice: updated } };
}
```

**Update Invoice Action (Draft Only):**
```typescript
export async function updateInvoice(
  invoiceId: string,
  input: UpdateInvoiceInput
): Promise<ActionResult<{ invoice: Invoice }>> {
  await requirePermission(["finance", "admin", "owner"]);
  const tenantId = await getCurrentTenantId();

  // Verify invoice exists and is draft
  const existing = await getInvoiceById(invoiceId);
  if (!existing) return { success: false, error: "Invoice not found" };
  if (existing.status !== "draft") {
    return { success: false, error: "Only draft invoices can be edited" };
  }

  // Transaction: Update invoice, delete old line items, insert new
  return adminDb.transaction(async (tx) => {
    // Delete existing line items
    await tx.delete(invoiceLineItems).where(eq(invoiceLineItems.invoice_id, invoiceId));

    // Calculate new totals
    const subtotal = calculateSubtotal(input.lineItems);
    const taxAmount = subtotal.times(new Decimal(input.taxRate));
    const total = subtotal.plus(taxAmount).plus(new Decimal(input.shippingCost));

    // Update invoice
    const [updated] = await tx.update(invoices)
      .set({
        customer_id: input.customerId,
        // ... all other fields
        subtotal: subtotal.toFixed(2),
        tax_amount: taxAmount.toFixed(2),
        total: total.toFixed(2),
        balance_due: total.toFixed(2), // Reset balance on edit
      })
      .where(eq(invoices.id, invoiceId))
      .returning();

    // Insert new line items
    for (const item of input.lineItems) {
      await tx.insert(invoiceLineItems).values({ invoice_id: invoiceId, ...item });
    }

    // Revalidate cache
    revalidatePath('/invoices');
    revalidatePath(`/invoices/${invoiceId}`);

    return { success: true, data: { invoice: updated } };
  });
}
```

### Existing Code to Reuse

| Pattern | Source File | What to Reuse |
|---------|-------------|---------------|
| TanStack Table list | `src/modules/statements/components/statements-list.tsx` | Column defs, sorting, actions dropdown |
| Status badge | `src/modules/statements/components/statement-status-badge.tsx` | Badge styling pattern |
| Filters | `src/modules/statements/components/statements-filters.tsx` | Filter component structure |
| Detail modal | `src/modules/statements/components/statement-detail-modal.tsx` | Detail layout pattern |
| Customer selector | `src/modules/invoices/components/customer-selector.tsx` | Already built in 8.2 |
| Invoice types | `src/modules/invoices/types.ts` | InvoiceWithCustomer, InvoiceWithDetails |
| Permission check | `src/lib/auth.ts` | requirePermission, hasPermission |
| Audit logging | `src/lib/audit.ts` | logAuditEvent |
| Dialog | `@/components/ui/dialog` | shadcn Dialog for confirmations |

### Database Operations

**Queries to Add:**
1. `getInvoicesWithCustomer()` - List view with customer name join
2. `getInvoiceWithDetails()` - Detail view with line items and payments
3. `countInvoices()` - For pagination

**Actions to Add:**
1. `updateInvoice()` - Edit draft invoice
2. `voidInvoice()` - Void invoice with reason

**Relations Already Defined:**
- `invoices` -> `contacts` (customer_id)
- `invoices` -> `invoiceLineItems` (one-to-many)
- `invoices` -> `payments` (one-to-many)

### Print-Friendly Styling

The invoice detail view must support clean printing:

```typescript
// In invoice-detail.tsx, apply print-specific Tailwind classes:

// Hide action buttons when printing
<div className="print:hidden flex gap-2">
  <Button>Edit</Button>
  <Button>Void</Button>
  ...
</div>

// Full width layout for print
<div className="max-w-4xl mx-auto print:max-w-none print:mx-0">

// Page breaks between major sections
<div className="print:break-before-page">
  {/* Payment History section */}
</div>

// Ensure borders print
<table className="border print:border-black">

// Hide navigation/header chrome
<header className="print:hidden">
```

**Print Button Implementation:**
```typescript
const handlePrint = () => {
  window.print();
};

// Add print-specific CSS in globals.css if needed:
// @media print {
//   @page { margin: 1in; }
//   body { -webkit-print-color-adjust: exact; }
// }
```

### Testing Standards

**Unit Tests:** `tests/unit/invoice-list.test.ts`
- Test status badge renders correct color for each status
- Test filter state management
- Test action button visibility based on status
- Test void validation (cannot void paid invoices)

**Integration Tests:** `tests/integration/invoice-management.test.tsx`
- Test updateInvoice action with valid data
- Test updateInvoice rejects non-draft invoices
- Test voidInvoice action
- Test permission enforcement (Finance/Admin/Owner only)
- Test tenant isolation

**E2E Tests:** `tests/e2e/invoice-management.spec.ts`
- Test full list view renders with invoices
- Test filters apply correctly
- Test click invoice navigates to detail
- Test edit draft invoice flow
- Test void invoice confirmation flow
- Test role-based access (author cannot access)

### Learnings from Story 8.2

**Form Components Built:**
- `customer-selector.tsx` - Reuse for filters
- `address-form.tsx` - Display in detail view (read-only)
- `invoice-line-items.tsx` - Reuse for detail and edit
- `invoice-totals.tsx` - Reuse for detail view

**Invoice Form Pattern:**
- Uses react-hook-form with zodResolver
- Decimal.js for currency calculations
- useFieldArray for line items
- Customer address auto-population

**Actions Already Implemented:**
- `createInvoice()` - Full implementation
- `generateInvoiceNumber()` - Number generation
- `searchCustomersAction()` - Customer search

### Security Considerations

**Authorization:**
- All list and detail queries scoped to tenant
- Permission check: VIEW_INVOICES for list, MANAGE_INVOICES for edit/void
- Only draft invoices can be edited
- Paid invoices cannot be voided

**Data Integrity:**
- Void action records reason and timestamp
- Audit log captures all status changes
- Edit recalculates all totals server-side

**Input Validation:**
- Invoice ID validated as UUID
- Status transitions validated server-side
- Void reason sanitized (plain text only)

### Project Structure Notes

**Route Structure:**
```
src/app/(dashboard)/invoices/
├── page.tsx                    # List view (update)
├── new/
│   └── page.tsx                # Create form (exists)
└── [id]/
    ├── page.tsx                # Detail view (create)
    └── edit/
        └── page.tsx            # Edit form (create)
```

**Component Structure:**
```
src/modules/invoices/components/
├── index.ts                     # Export all (update)
├── customer-selector.tsx        # (exists)
├── address-form.tsx             # (exists)
├── invoice-line-items.tsx       # (exists)
├── invoice-totals.tsx           # (exists)
├── invoice-form.tsx             # (exists)
├── invoice-status-badge.tsx     # (create)
├── invoice-list-table.tsx       # (create)
├── invoice-list-client.tsx      # (create)
├── invoice-filters.tsx          # (create)
├── invoice-detail.tsx           # (create)
└── void-invoice-dialog.tsx      # (create)
```

### References

- [Source: docs/epics.md#Epic-8, Story 8.3]
- [Source: docs/sprint-artifacts/8-1-create-invoice-database-schema.md]
- [Source: docs/sprint-artifacts/8-2-build-invoice-creation-form.md]
- [Source: src/modules/statements/components/statements-list.tsx] - TanStack Table pattern
- [Source: src/modules/statements/components/statement-status-badge.tsx] - Status badge pattern

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

<!-- To be filled by dev agent -->

### Debug Log References

### Completion Notes List

### File List

**Files to Create:**
- `src/app/(dashboard)/invoices/[id]/page.tsx`
- `src/app/(dashboard)/invoices/[id]/invoice-detail-client.tsx`
- `src/app/(dashboard)/invoices/[id]/edit/page.tsx`
- `src/app/(dashboard)/invoices/[id]/edit/invoice-edit-form.tsx`
- `src/modules/invoices/components/invoice-status-badge.tsx`
- `src/modules/invoices/components/invoice-list-table.tsx`
- `src/modules/invoices/components/invoice-list-client.tsx`
- `src/modules/invoices/components/invoice-filters.tsx`
- `src/modules/invoices/components/invoice-detail.tsx`
- `src/modules/invoices/components/void-invoice-dialog.tsx`
- `tests/unit/invoice-list-table.test.tsx`
- `tests/unit/invoice-status-badge.test.tsx`
- `tests/integration/invoice-actions.test.ts`
- `tests/e2e/invoice-list.spec.ts`

**Files to Modify:**
- `src/app/(dashboard)/invoices/page.tsx` - Replace placeholder with list
- `src/modules/invoices/actions.ts` - Add updateInvoice, voidInvoice
- `src/modules/invoices/queries.ts` - Add list/detail queries
- `src/modules/invoices/types.ts` - Add UpdateInvoiceInput if needed
- `src/modules/invoices/components/index.ts` - Export new components
