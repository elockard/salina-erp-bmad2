# Story 8.2: Build Invoice Creation Form

Status: done

## Quick Reference

| Pattern | Source File |
|---------|-------------|
| Form structure | `src/modules/sales/components/sales-form.tsx` |
| Dynamic rows (useFieldArray) | `src/modules/royalties/components/contract-tier-builder.tsx:56` |
| Combobox search | `src/modules/sales/components/title-autocomplete.tsx` |
| Customer query | `getContactsByRole('customer')` from `src/modules/contacts/queries.ts` |
| Type guard | `isCustomerRoleData` from `src/modules/contacts/types.ts` |
| Schemas | `src/modules/invoices/schema.ts` (createInvoiceSchema) |
| Types | `src/modules/invoices/types.ts` (InvoiceAddress, CustomerRoleData) |

## Story

As a **finance user**,
I want **to create invoices with bill-to, ship-to, and line items**,
so that **I can bill customers for products and services**.

## Acceptance Criteria

### AC-8.2.1: Invoice Creation Route
**Given** I am logged in as Finance, Admin, or Owner
**When** I navigate to /invoices/new
**Then** I see a professional invoice creation form

### AC-8.2.2: Header Section
**Given** the invoice creation form is displayed
**Then** the header section includes:
- Customer selector (contacts with Customer role, searchable combobox)
- Auto-populate bill-to address from customer record's CustomerRoleData.billing_address
- Ship-to address (checkbox "Same as bill-to" or enter different address)
- Invoice date (date picker, defaults to today)
- Due date (auto-calculated from payment terms, editable)
- P.O. Number (optional text input)
- Payment terms dropdown (Net 30, Net 60, Due on Receipt, Custom)
- If Custom: show custom terms days input
- Shipping method (optional text input)
- Shipping cost (currency input, default $0.00)

### AC-8.2.3: Line Items Section
**Given** the invoice creation form is displayed
**Then** the line items section includes:
- Grid with columns: Line # | Item Code | Description | Qty | Unit Price | Tax Rate | Amount
- Add row button (+ Add Line Item)
- Delete row button (X icon on each row)
- Item code (optional text input - for future catalog integration)
- Description (required text input)
- Quantity (decimal input, required, positive)
- Unit price (currency input, required, positive)
- Tax rate (percentage input, optional, defaults to invoice-level tax rate)
- Amount (auto-calculated: quantity × unit_price, read-only display)
- Subtotal row (sum of all line amounts)
- Tax row (calculated based on line-level or invoice-level tax rate)
- Shipping row (from header)
- Grand total row (subtotal + tax + shipping)

### AC-8.2.4: Footer Section
**Given** the invoice creation form is displayed
**Then** the footer section includes:
- Notes to customer (textarea, appears on printed invoice)
- Internal notes (textarea, NOT visible on printed invoice)
- Save as Draft button (saves with status='draft')
- Save & Send button (saves with status='sent', generates PDF, emails customer) - future story 8.3

### AC-8.2.5: Validation Rules
**Given** I attempt to submit the form
**Then** validation enforces:
- Customer is required
- At least one line item is required
- All line items must have description and quantity
- Quantity must be positive number
- Unit price must be positive number
- Due date must be on or after invoice date
- If payment_terms='custom', custom_terms_days is required and positive

### AC-8.2.6: Invoice Number Generation
**Given** I save a new invoice
**Then** the system auto-generates invoice number:
- Format: INV-YYYYMMDD-XXXX
- XXXX is a 4-digit sequential number per tenant per day
- Unique per tenant (enforced by database constraint)

### AC-8.2.7: Real-time Calculations
**Given** I am entering line items
**When** I update quantity, unit price, or tax rate
**Then** amounts recalculate in real-time using Decimal.js

### AC-8.2.8: Customer Address Auto-populate
**Given** I select a customer from the dropdown
**When** the customer has billing_address in CustomerRoleData
**Then** the bill-to address fields auto-populate
**And** I can override the values if needed

### AC-8.2.9: Due Date Calculation
**Given** I select payment terms
**When** payment terms is:
- net_30: due_date = invoice_date + 30 days
- net_60: due_date = invoice_date + 60 days
- due_on_receipt: due_date = invoice_date
- custom: due_date = invoice_date + custom_terms_days

### AC-8.2.10: Success Feedback
**Given** I successfully save an invoice
**Then** I see a success toast with invoice number
**And** I am redirected to /invoices (or /invoices/[id] for detail view)

## Tasks / Subtasks

- [x] **Task 1: Create Invoice Page Route** (AC: 8.2.1)
  - [x] Create `src/app/(dashboard)/invoices/page.tsx` (list placeholder with role check)
  - [x] Create `src/app/(dashboard)/invoices/new/page.tsx` (form host)
  - [x] Add invoices to dashboard navigation in `src/lib/dashboard-nav.ts`:
    - Add "ClipboardList" to `IconName` type (avoid duplicate with Statements' "FileText")
    - Import `ClipboardList` in nav icon resolver component
    - Add nav item: `{ label: "Invoices", href: "/invoices", icon: "ClipboardList", allowedRoles: ["owner", "admin", "finance"] }`
  - [x] Both pages: `await requireRole(['finance', 'admin', 'owner'])`

- [x] **Task 2: Implement Customer Selector Component** (AC: 8.2.2, 8.2.8)
  - [x] Create `src/modules/invoices/components/customer-selector.tsx`
  - [x] Use combobox pattern from `src/modules/sales/components/title-autocomplete.tsx`
  - [x] Call `searchCustomersAction()` (implemented in Task 8) with 300ms debounce
  - [x] Display: "Last, First" format with email
  - [x] On select: return full `ContactWithRoles` for address extraction
  - [x] Use `isCustomerRoleData` type guard when extracting billing address

- [x] **Task 3: Implement Address Form Section** (AC: 8.2.2, 8.2.8)
  - [x] Create `src/modules/invoices/components/address-form.tsx`
  - [x] Reusable for both bill-to and ship-to
  - [x] Fields: line1, line2, city, state, postal_code, country
  - [x] "Same as bill-to" checkbox syncs ship-to with bill-to using `useEffect`:
    ```typescript
    const sameAsBillTo = watch('same_as_bill_to');
    useEffect(() => {
      if (sameAsBillTo) {
        setValue('ship_to_address', getValues('bill_to_address'));
      }
    }, [sameAsBillTo, watch('bill_to_address')]);
    ```

- [x] **Task 4: Implement Line Items Grid Component** (AC: 8.2.3, 8.2.7)
  - [x] Create `src/modules/invoices/components/invoice-line-items.tsx`
  - [x] Use `useFieldArray` pattern from `src/modules/royalties/components/contract-tier-builder.tsx:56`
  - [x] Add row with auto-increment `line_number`:
    ```typescript
    const handleAddLineItem = () => {
      append({
        line_number: fields.length + 1,
        description: '', quantity: '1', unit_price: '0.00', amount: '0.00',
      });
    };
    ```
  - [x] Remove row: resequence remaining `line_number` values
  - [x] Real-time amount calculation per row using Decimal.js
  - [x] Input validation per field

- [x] **Task 5: Implement Invoice Totals Component** (AC: 8.2.3, 8.2.7)
  - [x] Create `src/modules/invoices/components/invoice-totals.tsx`
  - [x] Watch all line items and calculate subtotal
  - [x] Calculate tax based on line-level overrides or invoice tax rate
  - [x] Include shipping cost
  - [x] Display grand total

- [x] **Task 6: Build Main Invoice Form** (AC: 8.2.2-8.2.5, 8.2.9)
  - [x] Create `src/modules/invoices/components/invoice-form.tsx`
  - [x] Integrate all sub-components
  - [x] Implement due date auto-calculation based on payment terms
  - [x] Form validation with Zod schema (extend existing createInvoiceSchema)
  - [x] Handle form state management

- [x] **Task 7: Implement Server Actions** (AC: 8.2.6, 8.2.10)
  - [x] Implement `generateInvoiceNumber()` in actions.ts
  - [x] Implement `createInvoice()` in actions.ts
  - [x] Transaction: Insert invoice, then insert all line items
  - [x] Permission check: requireRole(['finance', 'admin', 'owner'])
  - [x] Audit log: Record invoice creation

- [x] **Task 8: Implement Queries and Search Action** (AC: 8.2.2)
  - [x] Implement `searchCustomersAction()` in `actions.ts` - server action for customer combobox
  - [x] Implement `getCustomersForInvoice()` in `queries.ts` - all customers for initial load
  - [x] Implement `getNextInvoiceNumberPreview()` - for preview
  - [x] Implement `getInvoiceById()` - for redirect after creation

- [x] **Task 9: Unit Tests** (AC: ALL)
  - [x] Test invoice number generation format
  - [x] Test due date calculation for all payment terms
  - [x] Test line item amount calculations
  - [x] Test total calculations with tax and shipping
  - [x] Test validation schema edge cases

- [x] **Task 10: Integration Tests** (AC: ALL)
  - [x] Test createInvoice action with valid data
  - [x] Test createInvoice with invalid customer
  - [x] Test tenant isolation (invoice belongs to correct tenant)
  - [x] Test permission enforcement

- [x] **Task 11: E2E Tests** (AC: ALL)
  - [x] Test full invoice creation flow
  - [x] Test customer selection and address auto-population
  - [x] Test adding/removing line items
  - [x] Test validation error display
  - [x] Test successful save and redirect

## Dev Notes

### Architecture Patterns

**Form Pattern:** Use "Spacious Guided Flow" pattern like `src/modules/sales/components/sales-form.tsx`
- react-hook-form with zodResolver
- Field-by-field validation with FormMessage
- Real-time calculations using useWatch
- Decimal.js for currency precision
- Toast notifications (sonner) for feedback

**Component Structure:**
```
src/modules/invoices/components/
├── customer-selector.tsx      # Combobox for customer search
├── address-form.tsx           # Reusable address input group
├── invoice-line-items.tsx     # Dynamic line items grid
├── invoice-totals.tsx         # Calculated totals display
├── invoice-form.tsx           # Main form orchestrator
└── index.ts                   # Component exports
```

**Server Action Pattern:** Follow existing patterns:
- Permission check first: `await requireRole(['finance', 'admin', 'owner'])`
- Get tenant context: `const tenantId = await getCurrentTenantId()`
- Validate input with Zod schema
- Use transaction for multi-table inserts
- Audit log for compliance
- Return ActionResult with success/error

### Key Technical Decisions

**Invoice Number Generation:** (See story 8.1 Dev Notes for full algorithm)
```typescript
// Format: INV-YYYYMMDD-XXXX (e.g., INV-20251206-0001)
// Key points:
// - Generate within transaction to handle concurrency
// - Query max sequence for tenant + date, increment or start at 0001
// - Retry on unique constraint violation (MAX_RETRIES = 3)
// - Use format() from date-fns for datePrefix

async function generateInvoiceNumber(tx: Transaction, tenantId: string, invoiceDate: Date): Promise<string> {
  const datePrefix = format(invoiceDate, 'yyyyMMdd');
  // Query max, calculate next sequence, return `INV-${datePrefix}-${seq.padStart(4,'0')}`
}
```

**Decimal Precision:**
```typescript
import Decimal from 'decimal.js';

// Calculation pattern:
const quantity = new Decimal(item.quantity);
const unitPrice = new Decimal(item.unit_price);
const lineAmount = quantity.times(unitPrice);
const formatted = lineAmount.toFixed(2); // "123.45"
```
- Store as string in form state (Zod validates with `refine`)
- Convert to Decimal for all calculations
- Format with `.toFixed(2)` for display and server submission

**Form Schema vs Server Schema:**
- Form uses client-side calculation (subtotal, tax, total computed on change)
- Server action recalculates all totals before save (never trust client)
- Use existing `createInvoiceSchema` which includes all fields

**Address Auto-population (with type guard):**
```typescript
import { isCustomerRoleData } from '@/modules/contacts/types';

// When customer selected - use type guard for safe extraction:
const customerRole = contact.roles.find(r => r.role === 'customer');
if (customerRole?.role_specific_data && isCustomerRoleData(customerRole.role_specific_data)) {
  const { billing_address } = customerRole.role_specific_data;
  if (billing_address) {
    form.setValue('bill_to_address', billing_address);
  }
}
```

### Existing Code to Reuse

| Pattern | Source File | What to Reuse |
|---------|-------------|---------------|
| Combobox search | `src/modules/sales/components/title-autocomplete.tsx` | Search pattern, 300ms debounce, loading states |
| Form structure | `src/modules/sales/components/sales-form.tsx` | Form layout, validation, submission |
| Dynamic rows | `src/modules/royalties/components/contract-tier-builder.tsx:56` | `useFieldArray` add/remove pattern |
| Contact queries | `src/modules/contacts/queries.ts` | `getContactsByRole('customer')`, `searchContacts` |
| Type guards | `src/modules/contacts/types.ts` | `isCustomerRoleData()` for address extraction |
| Address type | `src/modules/contacts/types.ts` | `Address`, `CustomerRoleData` interfaces |
| Invoice schema | `src/modules/invoices/schema.ts` | `createInvoiceSchema`, `invoiceLineItemSchema` |
| Invoice types | `src/modules/invoices/types.ts` | `InvoiceAddress`, `LineItemCalculation`, etc. |

### Database Operations

**Create Invoice Transaction:**
```typescript
await db.transaction(async (tx) => {
  // 1. Generate invoice number
  const invoiceNumber = await generateInvoiceNumber(tx, tenantId);

  // 2. Insert invoice record
  const [invoice] = await tx.insert(invoices).values({
    tenant_id: tenantId,
    invoice_number: invoiceNumber,
    customer_id: data.customer_id,
    // ... other fields
    balance_due: data.total, // Initially equals total
    created_by: userId,
  }).returning();

  // 3. Insert line items
  for (let i = 0; i < data.line_items.length; i++) {
    await tx.insert(invoiceLineItems).values({
      invoice_id: invoice.id,
      line_number: i + 1,
      // ... line item fields
    });
  }

  return invoice;
});
```

### Testing Standards

**Unit Tests:** `tests/unit/invoices-*.test.ts`
- Test invoice number generation edge cases
- Test calculation helpers (subtotal, tax, total)
- Test due date calculation for all payment terms
- Test validation schema

**Integration Tests:** `tests/integration/invoices-*.test.tsx`
- Test createInvoice action
- Test permission enforcement
- Test tenant isolation
- Use factory pattern for test data

**E2E Tests:** `tests/e2e/invoices.spec.ts`
- Test full form submission
- Test validation error display
- Test customer search and selection
- Test line item add/remove

### Learnings from Story 8.1

**Schema Patterns Established:**
- Invoice addresses use JSONB columns (`bill_to_address`, `ship_to_address`)
- Address validation happens at application layer, not database
- All monetary values use `DECIMAL(10,2)` for precision
- Tax rates use `DECIMAL(5,4)` to support rates like 8.25% (0.0825)
- RLS policies already created for invoices, invoice_line_items, and payments tables

**Type System:**
- `InvoiceAddress` is aliased to `Address` from contacts module (no duplication)
- `InvoiceCalculations` interface ready for totals computation
- `InvoiceWithLineItems`, `InvoiceWithPayments` composite types defined

**Validation Schemas:**
- `createInvoiceSchema` includes refinements for custom_terms_days and due_date
- `invoiceLineItemSchema` validates quantity/price as positive strings (Decimal.js compatible)
- Line items require `line_number` for ordering

### Security Considerations

**Input Sanitization:**
- Notes and description fields: Store as plain text, no HTML rendering
- Customer-facing notes displayed on PDF - escape any special characters in PDF generation
- Internal notes never exposed to customers or author portal

**Authorization:**
- Customer ID validated against contacts with Customer role at action layer
- Invoice amounts validated to prevent negative values (CHECK constraints in DB)
- Only Finance, Admin, Owner can create/modify invoices

**Data Integrity:**
- Invoice totals recalculated server-side before save (never trust client totals)
- Line item amounts verified: `amount === quantity * unit_price`
- Balance due initialized to total on creation

### Project Structure Notes

**Route Location:** `src/app/(dashboard)/invoices/`
- Follows dashboard route group pattern
- Protected by dashboard layout auth middleware
- Role-based access enforced in page component

**Module Location:** `src/modules/invoices/`
- Already established in Story 8.1
- Add components/ subdirectory
- Extend existing actions.ts and queries.ts

**Navigation:** Update `src/lib/dashboard-nav.ts`
- Add "ClipboardList" to `IconName` type (FileText already used by Statements)
- Add Invoices nav item: `{ label: "Invoices", href: "/invoices", icon: "ClipboardList", allowedRoles: ["owner", "admin", "finance"] }`

### References

- Story requirements: `docs/epics.md` (Epic 8, Story 8.2)
- Schema foundation: `docs/sprint-artifacts/8-1-create-invoice-database-schema.md`
- See "Existing Code to Reuse" table above for all pattern references

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

<!-- To be filled by dev agent -->

### Debug Log References

### Completion Notes List

### File List

**Files to Create:**
- `src/app/(dashboard)/invoices/page.tsx`
- `src/app/(dashboard)/invoices/new/page.tsx`
- `src/modules/invoices/components/customer-selector.tsx`
- `src/modules/invoices/components/address-form.tsx`
- `src/modules/invoices/components/invoice-line-items.tsx`
- `src/modules/invoices/components/invoice-totals.tsx`
- `src/modules/invoices/components/invoice-form.tsx`
- `src/modules/invoices/components/index.ts`
- `tests/unit/invoices-calculations.test.ts`
- `tests/integration/invoices-actions.test.tsx`
- `tests/e2e/invoices.spec.ts`

**Files to Modify:**
- `src/modules/invoices/actions.ts` - Implement server actions
- `src/modules/invoices/queries.ts` - Implement queries
- `src/modules/invoices/index.ts` - Add component exports
- `src/lib/dashboard-nav.ts` - Add invoices navigation
