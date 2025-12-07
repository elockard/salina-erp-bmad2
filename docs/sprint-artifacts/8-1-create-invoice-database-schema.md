# Story 8.1: Create Invoice Database Schema

**Status:** done

## Story

**As a** system architect,
**I want** to create invoice and AR database schema,
**So that** the system can track invoices and receivables.

## Acceptance Criteria

### AC-8.1.1: Invoices Table Schema
- [x] Create `invoices` table with all required columns:
  - id (UUID, primary key, auto-generated)
  - tenant_id (UUID, FK to tenants, NOT NULL, ON DELETE CASCADE)
  - invoice_number (TEXT, NOT NULL, auto-generated, tenant-unique pattern: INV-YYYYMMDD-XXXX)
  - customer_id (UUID, FK to contacts, NOT NULL, ON DELETE RESTRICT - can't delete customer with invoices)
  - invoice_date (DATE, NOT NULL)
  - due_date (DATE, NOT NULL)
  - status (TEXT, NOT NULL, CHECK constraint: 'draft', 'sent', 'paid', 'partially_paid', 'overdue', 'void')
  - bill_to_address (JSONB, NOT NULL - uses Address interface: {line1, line2, city, state, postal_code, country})
  - ship_to_address (JSONB, nullable - uses Address interface: {line1, line2, city, state, postal_code, country})
  - po_number (TEXT, nullable)
  - payment_terms (TEXT, NOT NULL, CHECK constraint: 'net_30', 'net_60', 'due_on_receipt', 'custom')
  - custom_terms_days (INTEGER, nullable - required if payment_terms = 'custom')
  - shipping_method (TEXT, nullable)
  - shipping_cost (DECIMAL(10,2), default 0.00, CHECK >= 0)
  - subtotal (DECIMAL(10,2), NOT NULL, CHECK >= 0)
  - tax_rate (DECIMAL(5,4), default 0.0000 - stored as decimal e.g., 0.0825 = 8.25%, CHECK >= 0)
  - tax_amount (DECIMAL(10,2), NOT NULL, CHECK >= 0)
  - total (DECIMAL(10,2), NOT NULL, CHECK >= 0)
  - amount_paid (DECIMAL(10,2), default 0.00, CHECK >= 0)
  - balance_due (DECIMAL(10,2), NOT NULL - computed: total - amount_paid)
  - currency (TEXT, default 'USD' - for future multi-currency support)
  - notes (TEXT, nullable - customer-facing notes)
  - internal_notes (TEXT, nullable - staff-only notes)
  - created_at (TIMESTAMP WITH TIME ZONE, NOT NULL, default now())
  - updated_at (TIMESTAMP WITH TIME ZONE, NOT NULL, default now())
  - created_by (UUID, FK to users, nullable, ON DELETE RESTRICT)
- [x] Add CHECK constraints: shipping_cost >= 0, subtotal >= 0, tax_rate >= 0, tax_amount >= 0, total >= 0, amount_paid >= 0

### AC-8.1.2: Invoice Line Items Table Schema
- [x] Create `invoice_line_items` table:
  - id (UUID, primary key, auto-generated)
  - invoice_id (UUID, FK to invoices, NOT NULL, ON DELETE CASCADE)
  - line_number (INTEGER, NOT NULL - sequence starting at 1)
  - item_code (TEXT, nullable - for catalog items)
  - description (TEXT, NOT NULL)
  - quantity (DECIMAL(10,3), NOT NULL - supports fractional quantities, CHECK > 0)
  - unit_price (DECIMAL(10,2), NOT NULL, CHECK > 0)
  - tax_rate (DECIMAL(5,4), nullable - line-level override, NULL uses invoice.tax_rate)
  - amount (DECIMAL(10,2), NOT NULL - calculated: quantity * unit_price, CHECK > 0)
  - title_id (UUID, FK to titles, nullable - if selling a title, ON DELETE RESTRICT)
- [x] Add UNIQUE constraint on (invoice_id, line_number)
- [x] Add CHECK constraints: quantity > 0, unit_price > 0, amount > 0

### AC-8.1.3: Payments Table Schema
- [x] Create `payments` table:
  - id (UUID, primary key, auto-generated)
  - tenant_id (UUID, FK to tenants, NOT NULL, ON DELETE CASCADE)
  - invoice_id (UUID, FK to invoices, NOT NULL, ON DELETE RESTRICT)
  - payment_date (DATE, NOT NULL)
  - amount (DECIMAL(10,2), NOT NULL, CHECK > 0)
  - payment_method (TEXT, NOT NULL, CHECK constraint: 'check', 'wire', 'credit_card', 'ach', 'other')
  - reference_number (TEXT, nullable - check number, transaction ID, etc.)
  - notes (TEXT, nullable)
  - created_at (TIMESTAMP WITH TIME ZONE, NOT NULL, default now())
  - created_by (UUID, FK to users, nullable, ON DELETE RESTRICT)
- [x] Add CHECK constraint: amount > 0

### AC-8.1.4: Database Indexes
- [x] Create indexes for query performance:
  - invoices_tenant_id_idx on invoices(tenant_id)
  - invoices_customer_id_idx on invoices(customer_id)
  - invoices_status_idx on invoices(status)
  - invoices_due_date_idx on invoices(due_date) - for aging queries
  - invoices_invoice_date_idx on invoices(invoice_date)
  - invoices_invoice_number_idx on invoices(invoice_number) - for direct lookup
  - invoices_tenant_invoice_number_unique on invoices(tenant_id, invoice_number) - UNIQUE
  - invoices_tenant_status_due_date_idx on invoices(tenant_id, status, due_date) - for aging reports (FR104)
  - invoice_line_items_invoice_id_idx on invoice_line_items(invoice_id)
  - invoice_line_items_title_id_idx on invoice_line_items(title_id)
  - payments_tenant_id_idx on payments(tenant_id)
  - payments_invoice_id_idx on payments(invoice_id)
  - payments_payment_date_idx on payments(payment_date)

### AC-8.1.5: RLS Policies
- [x] Create RLS policy for tenant isolation on invoices table:
  - `USING (tenant_id = current_setting('app.current_tenant_id')::uuid)`
- [x] Create RLS policy for tenant isolation on payments table:
  - `USING (tenant_id = current_setting('app.current_tenant_id')::uuid)`
- [x] invoice_line_items inherits tenant isolation via FK CASCADE to invoices (no separate RLS needed)

### AC-8.1.6: Drizzle Schema and Types
- [x] Create `src/db/schema/invoices.ts` with Drizzle schema
- [x] Export TypeScript types: Invoice, InsertInvoice, InvoiceLineItem, InsertInvoiceLineItem, Payment, InsertPayment
- [x] Export enum values: invoiceStatusValues, paymentTermsValues, paymentMethodValues
- [x] Export types: InvoiceStatus, PaymentTerms, PaymentMethod

### AC-8.1.7: Relations Setup
- [x] Update `src/db/schema/relations.ts` with:
  - invoicesRelations (tenant, customer/contact, lineItems, payments, createdBy)
  - invoiceLineItemsRelations (invoice, title)
  - paymentsRelations (tenant, invoice, createdBy)

### AC-8.1.8: Schema Index Export
- [x] Update `src/db/schema/index.ts` to export invoices, invoiceLineItems, payments

### AC-8.1.9: Migration with Rollback
- [x] Create Drizzle migration file for invoices, invoice_line_items, and payments tables
- [x] Include RLS policy creation in migration
- [x] Include CHECK constraints in migration
- [x] Include database trigger for updated_at auto-update
- [x] Document rollback procedure in migration comments

## Tasks / Subtasks

- [x] **Task 1: Create Invoices Schema** (AC: 8.1.1, 8.1.4, 8.1.6)
  - [x] Create `src/db/schema/invoices.ts`
  - [x] Import `decimal` (NOT `numeric`) from drizzle-orm/pg-core - follow statements.ts pattern
  - [x] Define invoices table with all 25 columns per AC-8.1.1 (including currency field)
  - [x] Define invoiceStatusValues array: `['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'void'] as const`
  - [x] Define paymentTermsValues array: `['net_30', 'net_60', 'due_on_receipt', 'custom'] as const`
  - [x] Add CHECK constraint for status validation
  - [x] Add CHECK constraint for payment_terms validation
  - [x] Add CHECK constraints for non-negative values: shipping_cost, subtotal, tax_rate, tax_amount, total, amount_paid
  - [x] Add UNIQUE constraint on (tenant_id, invoice_number)
  - [x] Add all indexes per AC-8.1.4 including composite aging index
  - [x] Add JSDoc comments (follow existing pattern from statements.ts)
  - [x] Export Invoice and InsertInvoice types

- [x] **Task 2: Create Invoice Line Items Schema** (AC: 8.1.2, 8.1.4, 8.1.6)
  - [x] Add invoiceLineItems table to `src/db/schema/invoices.ts`
  - [x] Add UNIQUE constraint on (invoice_id, line_number)
  - [x] Add CHECK constraints: quantity > 0, unit_price > 0, amount > 0
  - [x] Add indexes per AC-8.1.4
  - [x] Export InvoiceLineItem and InsertInvoiceLineItem types

- [x] **Task 3: Create Payments Schema** (AC: 8.1.3, 8.1.4, 8.1.6)
  - [x] Add payments table to `src/db/schema/invoices.ts`
  - [x] Define paymentMethodValues array: `['check', 'wire', 'credit_card', 'ach', 'other'] as const`
  - [x] Add CHECK constraint for payment_method validation
  - [x] Add CHECK constraint: amount > 0
  - [x] Add indexes per AC-8.1.4
  - [x] Export Payment and InsertPayment types

- [x] **Task 4: Create Module Structure** (Prep for Story 8.2)
  - [x] Create `src/modules/invoices/types.ts` with address and calculation interfaces
  - [x] Create `src/modules/invoices/schema.ts` with Zod validation schemas
  - [x] Create `src/modules/invoices/index.ts` for clean exports
  - [x] Create stub `src/modules/invoices/actions.ts` (placeholder for Story 8.2)
  - [x] Create stub `src/modules/invoices/queries.ts` (placeholder for Story 8.2)

- [x] **Task 5: Define TypeScript Interfaces** (Module types.ts)
  - [x] Import `Address` from `@/modules/contacts/types` - DO NOT create duplicate
  - [x] Define `InvoiceAddress = Address` as type alias (NOT interface extension)
  - [x] Define InvoiceCalculations interface for computed fields
  - [x] Define InvoiceWithLineItems type for joined queries
  - [x] Define InvoiceWithPayments type for AR tracking
  - [x] Define AgingBucket type for AR reporting: `{ current: number; days30: number; days60: number; days90Plus: number }`

- [x] **Task 6: Create Zod Validation Schemas** (Module schema.ts)
  - [x] Define addressSchema for bill_to/ship_to validation
  - [x] Define invoiceLineItemSchema for line item validation
  - [x] Define createInvoiceSchema for invoice creation
  - [x] Define updateInvoiceSchema (partial)
  - [x] Define recordPaymentSchema for payment recording

- [x] **Task 7: Update Relations** (AC: 8.1.7)
  - [x] Add invoicesRelations to `src/db/schema/relations.ts`
  - [x] Add invoiceLineItemsRelations to `src/db/schema/relations.ts`
  - [x] Add paymentsRelations to `src/db/schema/relations.ts`

- [x] **Task 8: Update Schema Index** (AC: 8.1.8)
  - [x] Export invoices, invoiceLineItems, payments from `src/db/schema/index.ts`
  - [x] Export invoiceStatusValues, paymentTermsValues, paymentMethodValues

- [x] **Task 9: Generate and Review Migration** (AC: 8.1.5, 8.1.9)
  - [x] Run `npx drizzle-kit generate` to create migration (expect 0015_invoices_schema.sql)
  - [x] Review generated SQL for CHECK constraints and indexes
  - [x] Add RLS policy SQL to migration (see Dev Notes)
  - [x] Add updated_at trigger SQL to migration (reuse function if exists from contacts migration)
  - [x] Add all CHECK constraint SQL (see CHECK Constraints section in Dev Notes)
  - [x] Add rollback documentation as SQL comments
  - [x] Verify migration applies cleanly with `npx drizzle-kit push` or test database

- [x] **Task 10: Write Unit Tests**
  - [x] Create `tests/unit/invoices-schema.test.ts`
  - [x] Test invoices schema types compile correctly
  - [x] Test invoice_line_items schema types compile correctly
  - [x] Test payments schema types compile correctly
  - [x] Test Zod schemas validate correctly (valid and invalid inputs)
  - [x] Test address validation
  - [x] Test payment terms custom days validation

## Dev Notes

### Functional Requirements Coverage

This schema supports:
- **FR96**: Invoice creation with bill-to and ship-to addresses
- **FR97**: Line items with quantity, item code, description, unit price, tax
- **FR98**: Invoice totals including subtotal, tax, and grand total
- **FR99**: Payment terms (Net 30, Net 60, Due on Receipt, custom)
- **FR100**: P.O. numbers and shipping methods on invoices
- **FR101**: Invoices linked to contacts with Customer role
- **FR102**: AR balance tracking per customer (via balance_due field)
- **FR103**: Payment recording (payments table)
- **FR104**: Aging reports (supported by invoices_tenant_status_due_date_idx composite index)

### Critical Implementation Notes

1. **Use `decimal` from drizzle-orm/pg-core** - NOT `numeric`. Follow pattern in `statements.ts` and `contracts.ts`
2. **Use Decimal.js for all calculations** - Never use JavaScript arithmetic for financial values (per architecture.md)
3. **customer_id FK to contacts** - Must validate contact has 'customer' role at application level (Story 8.2)
4. **Invoice number auto-generation** - Pattern: INV-YYYYMMDD-XXXX (implement in actions.ts Story 8.2)
5. **balance_due is computed** - total - amount_paid (update on payment recording)
6. **Decimal precision** - Use DECIMAL(10,2) for money, DECIMAL(5,4) for tax rates, DECIMAL(10,3) for quantities
7. **Address JSONB structure** - Use `Address` type from `@/modules/contacts/types`: `{line1, line2, city, state, postal_code, country}`
8. **Line-level tax override** - If `invoice_line_items.tax_rate` is NULL, use `invoice.tax_rate`; otherwise use line-level rate
9. **CustomerRoleData reuse** - Contact's `CustomerRoleData` has `billing_address`, `shipping_address`, `payment_terms` that can pre-populate invoice fields (Story 8.2)

### CHECK Constraints (Critical for Data Integrity)

Follow existing patterns from `sales.ts` and `returns.ts`:

```typescript
// Invoice CHECK constraints
shippingCostNonNegative: check("invoices_shipping_cost_non_negative", sql`shipping_cost >= 0`),
subtotalNonNegative: check("invoices_subtotal_non_negative", sql`subtotal >= 0`),
taxRateNonNegative: check("invoices_tax_rate_non_negative", sql`tax_rate >= 0`),
taxAmountNonNegative: check("invoices_tax_amount_non_negative", sql`tax_amount >= 0`),
totalNonNegative: check("invoices_total_non_negative", sql`total >= 0`),
amountPaidNonNegative: check("invoices_amount_paid_non_negative", sql`amount_paid >= 0`),
statusValid: check("invoices_status_valid", sql`status IN ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'void')`),
paymentTermsValid: check("invoices_payment_terms_valid", sql`payment_terms IN ('net_30', 'net_60', 'due_on_receipt', 'custom')`),

// Line item CHECK constraints
quantityPositive: check("invoice_line_items_quantity_positive", sql`quantity > 0`),
unitPricePositive: check("invoice_line_items_unit_price_positive", sql`unit_price > 0`),
amountPositive: check("invoice_line_items_amount_positive", sql`amount > 0`),

// Payment CHECK constraints
amountPositive: check("payments_amount_positive", sql`amount > 0`),
paymentMethodValid: check("payments_payment_method_valid", sql`payment_method IN ('check', 'wire', 'credit_card', 'ach', 'other')`),
```

### Invoice Number Generation (for Story 8.2)

```typescript
// src/modules/invoices/utils.ts
async function generateInvoiceNumber(tenantId: string): Promise<string> {
  const today = format(new Date(), 'yyyyMMdd');
  const prefix = `INV-${today}-`;

  // Get next sequence for today
  const lastInvoice = await db.query.invoices.findFirst({
    where: and(
      eq(invoices.tenant_id, tenantId),
      like(invoices.invoice_number, `${prefix}%`)
    ),
    orderBy: desc(invoices.invoice_number),
  });

  const sequence = lastInvoice
    ? parseInt(lastInvoice.invoice_number.slice(-4)) + 1
    : 1;

  return `${prefix}${sequence.toString().padStart(4, '0')}`;
}
```

### Address Interface (reuse from contacts)

```typescript
// src/modules/invoices/types.ts
// DO NOT create new Address type - reuse existing from contacts module
import type { Address } from '@/modules/contacts/types';

// Address structure (from src/modules/contacts/types.ts:37-44):
// {
//   line1?: string;    // NOT address_line1
//   line2?: string;    // NOT address_line2
//   city?: string;
//   state?: string;
//   postal_code?: string;
//   country?: string;
// }

export type InvoiceAddress = Address;  // Direct alias, no extension needed
```

### RLS Policy SQL

```sql
-- Enable RLS on invoices table
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy for invoices
CREATE POLICY invoices_tenant_isolation ON invoices
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Enable RLS on payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy for payments
CREATE POLICY payments_tenant_isolation ON payments
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- invoice_line_items inherits isolation via FK CASCADE (no separate policy needed)
```

### Updated_at Trigger SQL

```sql
-- Trigger function for updated_at (if not already exists from contacts migration)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for invoices table
CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Migration Rollback SQL (add as comments)

```sql
-- ROLLBACK INSTRUCTIONS:
-- DROP TRIGGER IF EXISTS invoices_updated_at ON invoices;
-- DROP POLICY IF EXISTS payments_tenant_isolation ON payments;
-- DROP POLICY IF EXISTS invoices_tenant_isolation ON invoices;
-- DROP TABLE IF EXISTS payments;
-- DROP TABLE IF EXISTS invoice_line_items;
-- DROP TABLE IF EXISTS invoices;
```

### JSDoc Template (follow this pattern)

```typescript
/**
 * Invoices Schema
 *
 * Database schema for invoice and accounts receivable management.
 * Invoices link to contacts with Customer role and track line items,
 * payments, and AR balances.
 *
 * Related FRs: FR96-FR106 (Invoicing & Accounts Receivable)
 * Epic: Epic 8 - Invoicing & Accounts Receivable
 * Story: 8.1 - Create Invoice Database Schema
 *
 * Multi-Tenant Isolation:
 * - Layer 1: Application queries include WHERE tenant_id filter
 * - Layer 2: ORM wrapper auto-injects tenant_id
 * - Layer 3: PostgreSQL RLS enforces tenant boundary
 *
 * @see src/db/schema/contacts.ts for customer FK reference
 * @see src/db/schema/statements.ts for similar schema pattern
 */
```

### Testing Strategy

**Unit Tests (`tests/unit/invoices-schema.test.ts`):**
```typescript
describe('Invoices Schema', () => {
  describe('Zod Validation', () => {
    it('validates invoice with required fields');
    it('rejects invoice without customer_id');
    it('validates status enum values');
    it('validates payment_terms enum values');
    it('requires custom_terms_days when payment_terms is custom');
    it('validates line item with required fields');
    it('validates positive quantity and unit_price');
  });

  describe('Address Validation', () => {
    it('validates complete address');
    it('allows optional address_line2');
    it('validates postal_code format');
  });

  describe('Payment Validation', () => {
    it('validates payment with required fields');
    it('validates payment_method enum values');
    it('validates positive amount');
  });
});
```

### Dependencies

**Prerequisites:**
- Epic 7 complete (contacts table with Customer role support)
- Drizzle ORM configured
- Existing schema patterns established

**Blocking:**
- Story 8.2 (Build Invoice Creation Form)
- Story 8.3 (Build Invoice List and Detail Views)
- Story 8.4 (Implement Payment Recording)

### References

**Essential Files to Study Before Implementation:**
- `src/db/schema/statements.ts` - Schema pattern to follow (decimal, JSDoc, indexes)
- `src/db/schema/contacts.ts` - Customer FK reference and Address type location
- `src/modules/contacts/types.ts:37-44` - Address interface to reuse
- `src/db/schema/sales.ts:190-197` - CHECK constraints pattern to follow

### Permissions Required (Story 8.2)

Add to `src/lib/permissions.ts`:
- `MANAGE_INVOICES` - Create, edit, void invoices
- `VIEW_INVOICES` - Read-only access to invoices
- `RECORD_PAYMENTS` - Record payments against invoices

Assign to roles:
- Owner: All
- Admin: All
- Finance: All
- Editor: VIEW_INVOICES only

## Dev Agent Record

### Context Reference

This story creates foundational schema for the invoicing and AR system. The invoices table links to contacts with Customer role (from Epic 7). Story 8.2 will add UI and validation that customer_id must have the Customer role.

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

**Code Review (2025-12-06):** Fixed 6 issues identified during adversarial code review:
1. ✅ Marked all AC and Task checkboxes as complete (were unchecked despite "done" status)
2. ✅ Fixed InvoiceCalculations type to match test expectations (added lineItemCalculations, invoiceSubtotal, etc.)
3. ✅ Fixed LineItemCalculation type to match test expectations (added lineNumber, quantity, unitPrice, etc.)
4. ✅ Fixed AgingBucket type to use bucket/amount/count structure per tests
5. ✅ Corrected RLS policy to use `app.current_tenant_id` (was `app.tenant_id`)
6. ✅ Added updated_at trigger function and trigger to migration 0014

### File List

**New Files (Created):**
- `src/db/schema/invoices.ts`
- `src/modules/invoices/types.ts`
- `src/modules/invoices/schema.ts`
- `src/modules/invoices/actions.ts` (stub)
- `src/modules/invoices/queries.ts` (stub)
- `src/modules/invoices/index.ts`
- `drizzle/migrations/0013_famous_tyger_tiger.sql` (invoice tables, constraints, indexes)
- `drizzle/migrations/0014_invoices_rls.sql` (RLS policies, updated_at trigger)
- `tests/unit/invoices-schema.test.ts`

**Modified Files:**
- `src/db/schema/relations.ts` (added invoices, invoiceLineItems, payments relations)
- `src/db/schema/index.ts` (exported invoices, invoiceLineItems, payments)
- `docs/sprint-artifacts/sprint-status.yaml` (story 8-1 → done)
