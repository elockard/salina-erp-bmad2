# Story 11.3: Generate 1099-MISC Forms

**Status:** ready-for-dev

## Story

**As a** Finance user,
**I want** to generate 1099-MISC forms for qualifying authors,
**So that** I can fulfill IRS reporting requirements.

## Acceptance Criteria

### AC-11.3.1: 1099 Generation Page Access

- [ ] New page accessible at `/reports/tax-preparation/1099-generation`
- [ ] Page accessible only to Finance, Admin, and Owner roles
- [ ] Page has year selector for selecting tax year to generate forms for
- [ ] Disable future years in selector (can only generate for completed/current years)
- [ ] Page title: "1099-MISC Generation"

### AC-11.3.2: Qualifying Authors List

- [ ] Display list of all authors qualifying for 1099 (earnings >= $600 for selected year)
- [ ] Reuse `getAnnualEarningsByAuthor()` and `IRS_1099_THRESHOLD` from Story 11.2
- [ ] List shows: Author name, TIN status, TIN type, Annual earnings, 1099 generated status
- [ ] Authors with missing TIN show warning indicator (AlertTriangle icon)
- [ ] Filter toggle: "Show all" vs "Show pending only" (not yet generated)

### AC-11.3.3: Tenant Payer Information Requirements

- [ ] **CRITICAL:** Tenant must have payer EIN configured before 1099 generation
- [ ] Add payer information fields to tenant schema (see Task 1 for structured address fields)
- [ ] Payer EIN validated using `validateEIN()` from `src/lib/tin-validation.ts`
- [ ] Payer EIN encrypted using `encryptTIN()` from `src/lib/encryption.ts`
- [ ] Validate payer_name is not empty (required for 1099)
- [ ] Validate payer address fields are complete (required for 1099)
- [ ] If payer info missing, show blocking alert with link to tenant settings

### AC-11.3.4: Individual 1099 PDF Generation

- [ ] "Generate 1099" button on each qualifying author row
- [ ] Button disabled for authors with missing TIN (tooltip: "TIN required for 1099")
- [ ] Admin/Owner can click "Generate Anyway" which shows warning dialog:
  - Warning: "This author has no TIN on file. The IRS requires TIN for filing. Generate incomplete form?"
  - If generated without TIN, mark PDF with "INCOMPLETE - TIN REQUIRED" watermark
- [ ] PDF generated using @react-pdf/renderer (same as statements)
- [ ] PDF follows IRS 1099-MISC Copy B format (for recipient)
- [ ] PDF uploaded to S3: `1099/{tenant_id}/{form_1099_id}.pdf`
- [ ] Generation timestamp recorded in database

### AC-11.3.5: 1099-MISC PDF Content (Copy B - For Recipient)

- [ ] **Payer Information (top section):**
  - Payer name (from `payer_name`)
  - Payer street address, city, state, ZIP (structured fields)
  - Payer's TIN (EIN from tenant, displayed as XX-XXXXXXX)
- [ ] **Recipient Information (middle section):**
  - Author name (from contacts.name)
  - Author address (from contacts.address)
- [ ] **Recipient's TIN:**
  - **SECURITY:** Decrypt TIN ONLY during PDF render, immediately discard
  - Display as XXX-XX-XXXX (SSN) or XX-XXXXXXX (EIN)
- [ ] **Box 7 - Nonemployee Compensation:**
  - Total annual earnings (IRS format: no $ sign, include cents, no thousands separator)
- [ ] Tax year displayed prominently
- [ ] Form clearly marked as "Copy B - For Recipient"
- [ ] Include IRS form disclaimer text

**Note:** This story implements Copy B (recipient copy) only. Copy A (IRS filing copy) has different layout requirements and is out of scope for this story - may be added in future if electronic filing is implemented.

### AC-11.3.6: Batch 1099 Generation

- [ ] "Generate All" button to create all pending 1099s
- [ ] Shows confirmation dialog with count: "Generate {n} 1099 forms?"
- [ ] Progress indicator shows: "{x} of {n} generated..."
- [ ] Update progress every 5 authors to avoid excessive re-renders
- [ ] Skips authors with missing TIN by default
- [ ] Summary after completion: "{n} generated, {m} skipped (missing TIN)"
- [ ] Download as ZIP option after batch generation

### AC-11.3.7: 1099 Download and Management

- [ ] "Download" button for each generated 1099 (presigned S3 URL, 15-minute expiry)
- [ ] "Download All as ZIP" button for all generated 1099s in year
- [ ] "Regenerate" button for previously generated 1099s
- [ ] Regenerate shows warning if TIN or amount changed since original generation
- [ ] Regenerate confirmation: "This will replace the existing 1099. Continue?"

### AC-11.3.8: 1099 Generation Tracking

- [ ] **CRITICAL:** ALL queries use tenant_id as FIRST filter condition (per Story 11.2 pattern)
- [ ] Create `form_1099` table to track generated forms (see Task 1 for schema)
- [ ] Unique constraint: (tenant_id, contact_id, tax_year)
- [ ] Query existing records to show "Generated" status in list

### AC-11.3.9: Audit Logging

- [ ] Log 1099 generation events (without TIN values):
  - `1099_generated`: contact_id, tax_year, amount, user_id, timestamp
  - `1099_regenerated`: contact_id, tax_year, amount, user_id, previous_amount
  - `1099_batch_generated`: count, tax_year, user_id, duration_ms
- [ ] Log 1099 downloads: contact_id, tax_year, user_id, download_timestamp
- [ ] Log payer info updates (without EIN value): payer_name changed, address changed

## Tasks / Subtasks

- [ ] **Task 1: Database Schema Updates** (AC: 11.3.3, 11.3.8) **[CRITICAL - Blocks most tasks]**
  - [ ] Add columns to tenants table (structured address for IRS compliance):
    ```typescript
    payer_ein_encrypted: text("payer_ein_encrypted"),
    payer_ein_last_four: text("payer_ein_last_four"),
    payer_name: text("payer_name"),
    payer_address_line1: text("payer_address_line1"),
    payer_address_line2: text("payer_address_line2"),  // optional
    payer_city: text("payer_city"),
    payer_state: text("payer_state"),
    payer_zip: text("payer_zip"),
    ```
  - [ ] Create `form_1099` table:
    ```typescript
    export const form1099 = pgTable("form_1099", {
      id: uuid("id").defaultRandom().primaryKey(),
      tenant_id: uuid("tenant_id").notNull().references(() => tenants.id),
      contact_id: uuid("contact_id").notNull().references(() => contacts.id),
      tax_year: integer("tax_year").notNull(),
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      pdf_s3_key: text("pdf_s3_key"),
      generated_at: timestamp("generated_at", { withTimezone: true }).notNull(),
      generated_by_user_id: uuid("generated_by_user_id").notNull(),
      created_at: timestamp("created_at").defaultNow().notNull(),
      updated_at: timestamp("updated_at").defaultNow().notNull(),
    }, (table) => ({
      uniqueForm: unique().on(table.tenant_id, table.contact_id, table.tax_year),
    }));
    ```
  - [ ] Update `src/db/schema/tenants.ts`, create `src/db/schema/form-1099.ts`
  - [ ] Export from `src/db/schema/index.ts`
  - [ ] Generate migration: `npx drizzle-kit generate`
  - [ ] Write schema tests

- [ ] **Task 2: Tenant Payer Information** (AC: 11.3.3)
  - [ ] Update `src/modules/tenant/schema.ts` with payer info Zod schemas
  - [ ] Validate payer EIN using `validateEIN()` from `src/lib/tin-validation.ts`
  - [ ] Update `src/modules/tenant/actions.ts` with `updatePayerInfo` action
  - [ ] Encrypt payer EIN using `encryptTIN()` from `src/lib/encryption.ts`
  - [ ] Update tenant-settings-form.tsx: Add collapsible "Tax / 1099 Information" section
  - [ ] Required field validation: payer_name, address_line1, city, state, zip
  - [ ] Write component and action tests

- [ ] **Task 3: 1099 PDF Template** (AC: 11.3.5) **[CRITICAL]**
  - [ ] Create `src/modules/tax-forms/pdf/form-1099-misc.tsx`
  - [ ] Reuse from `statement-pdf.tsx`:
    - StyleSheet structure (page, header, section, footer styles)
    - `formatCurrency()` helper (modify to remove $ sign for IRS)
    - `formatDate()` helper
    - Header/Footer component patterns
  - [ ] DO NOT reuse: CoAuthorSection, LifetimeSection (not applicable to 1099)
  - [ ] Follow IRS 1099-MISC Copy B layout
  - [ ] Include IRS disclaimer text
  - [ ] Write PDF template tests

- [ ] **Task 4: 1099 Generation Service** (AC: 11.3.4, 11.3.6)
  - [ ] Create `src/modules/tax-forms/generator.ts`
  - [ ] **CRITICAL SECURITY:** Create `decryptTINForPDF()` wrapper that:
    - Calls `decryptTIN()` from `src/lib/encryption.ts`
    - Only callable from within PDF generation context
    - Logs decryption event (without TIN value) for audit
  - [ ] Implement `generate1099PDF(tenantId, contactId, year)`
  - [ ] Implement `generateBatch1099s(tenantId, year, options)`
  - [ ] Write service tests

- [ ] **Task 5: 1099 Storage Utilities** (AC: 11.3.4, 11.3.7)
  - [ ] Create `src/modules/tax-forms/storage.ts`
  - [ ] Reuse S3 client initialization from `statements/storage.ts` (lines 27-29)
  - [ ] Copy presigned URL expiry constant (15 minutes)
  - [ ] S3 key pattern: `1099/{tenant_id}/{form_1099_id}.pdf`
  - [ ] Adapt `getStatementPDFBuffer()` pattern for ZIP generation

- [ ] **Task 6: 1099 Database Queries** (AC: 11.3.2, 11.3.8)
  - [ ] Create `src/modules/tax-forms/queries.ts`
  - [ ] **CRITICAL:** tenant_id as FIRST filter in ALL queries
  - [ ] Implement `get1099Status(tenantId, year)`
  - [ ] Implement `get1099Record(tenantId, contactId, year)`
  - [ ] Implement `getPayerInfo(tenantId)`

- [ ] **Task 7: 1099 Server Actions** (AC: 11.3.4, 11.3.6, 11.3.7)
  - [ ] Create `src/modules/tax-forms/actions.ts`
  - [ ] Permission check pattern in ALL actions:
    ```typescript
    await requirePermission(["finance", "admin", "owner"]);
    const tenantId = await getCurrentTenantId();
    ```
  - [ ] Implement `generate1099Action`, `generateBatch1099sAction`
  - [ ] Implement `download1099Action`, `downloadAll1099sAction`

- [ ] **Task 8: 1099 Generation Page UI** (AC: 11.3.1, 11.3.2)
  - [ ] Create route page and client component
  - [ ] Reuse year selector pattern from `tax-preparation-filters.tsx`
  - [ ] Payer info status check (blocking if missing)

- [ ] **Task 9: 1099 Authors Table Component** (AC: 11.3.2, 11.3.4)
  - [ ] Create `src/modules/tax-forms/components/authors-table.tsx`
  - [ ] Status badge: "Generated" (green) / "Pending" (gray)
  - [ ] Warning icon for missing TIN with clear tooltip

- [ ] **Task 10: Batch Generation Dialog** (AC: 11.3.6)
  - [ ] Create `src/modules/tax-forms/components/batch-generate-dialog.tsx`
  - [ ] Progress: "{x} of {n} generated..." (update every 5)
  - [ ] Consider Inngest job for large batches (>50 authors)

- [ ] **Task 11: Navigation Integration**
  - [ ] Add "Generate 1099 Forms" button to `/reports/tax-preparation`
  - [ ] Only show when there are authors requiring 1099

- [ ] **Task 12: Comprehensive Testing** (AC: all)
  - [ ] Unit: 1099 PDF generation, payer EIN validation, amount formatting
  - [ ] Integration: Full generation flow, batch generation, permission checks
  - [ ] E2E: Complete 1099 workflow, payer info setup, downloads

## Dev Notes

### CRITICAL: TIN Decryption Security

**This is the ONLY story where recipient TIN decryption is used in the entire system.**

```typescript
// Create wrapper in generator.ts - ONLY place decryption is allowed
function decryptTINForPDF(encryptedTIN: string, contactId: string): string {
  // Log decryption event (without TIN value)
  console.log(`[1099] Decrypting TIN for contact ${contactId} - PDF generation`);

  const plainTIN = decryptTIN(encryptedTIN);
  // TIN is used ONLY in PDF render, then garbage collected
  return plainTIN;
}

// NEVER:
// - Log the decrypted TIN value
// - Store decrypted TIN in any variable that persists
// - Pass decrypted TIN to any function other than PDF template
// - Use decryptTIN() anywhere else in this story
```

### CRITICAL: Multi-Tenant Isolation

**ALL queries MUST have tenant_id as FIRST filter condition:**

```typescript
// CORRECT - tenant_id FIRST
.where(
  and(
    eq(form_1099.tenant_id, tenantId),  // FIRST - prevents cross-tenant leaks
    eq(form_1099.tax_year, year),
  )
)

// WRONG - tenant_id not first (security risk)
.where(
  and(
    eq(form_1099.tax_year, year),
    eq(form_1099.tenant_id, tenantId),  // Too late!
  )
)
```

### IRS 1099-MISC Format

**Copy B (Recipient) - This Story:**
- Recipient keeps for their records
- Shows payer info, recipient info, Box 7 amount
- Simpler layout than Copy A

**Copy A (IRS) - Future Story:**
- Different layout, scannable format
- Required for electronic filing
- Out of scope for Story 11.3

**Amount Formatting (IRS spec):**
```typescript
// CORRECT: No $ sign, include cents, no commas
formatIRSAmount(1234.56) → "1234.56"

// WRONG:
formatCurrency(1234.56) → "$1,234.56"  // Don't use this
```

### File Locations

**New Module:** `src/modules/tax-forms/`
- `pdf/form-1099-misc.tsx` - PDF template
- `generator.ts`, `storage.ts`, `queries.ts`, `actions.ts` - Services
- `components/` - UI components

**Modified:** `src/db/schema/tenants.ts`, `src/modules/tenant/`

**Route:** `src/app/(dashboard)/reports/tax-preparation/1099-generation/page.tsx`

### Code Reuse Reference

| What | Where |
|------|-------|
| PDF structure | `statements/pdf/statement-pdf.tsx` (StyleSheet, helpers) |
| S3 operations | `statements/storage.ts` (upload, presigned URL) |
| Encryption | `lib/encryption.ts` (encryptTIN, decryptTIN) |
| EIN validation | `lib/tin-validation.ts` (validateEIN) |
| Earnings query | `reports/queries/tax-preparation.ts` |
| Year selector | `reports/components/tax-preparation-filters.tsx` |
| Permission check | `lib/auth.ts` (requirePermission) |

### Edge Cases

1. **Author deleted after earning**: Still show in 1099 list (use soft delete/inactive status)
2. **TIN changed after generation**: Show warning on regenerate, uses NEW TIN
3. **Earnings recalculated**: Show warning on regenerate with old vs new amount
4. **Already downloaded**: Track download count, warn if regenerating already-accessed form
5. **Concurrent generation**: Use DB transaction to prevent duplicate form_1099 records
6. **S3 failures**: Retry logic, don't mark as generated until S3 succeeds
7. **Large batches (>50)**: Consider Inngest job to avoid timeout

### Dependencies

**Prerequisites (complete):**
- Story 11.1: TIN collection/encryption on contacts
- Story 11.2: Annual earnings calculation (`getAnnualEarningsByAuthor`)
- Epic 5: PDF generation infrastructure

**Implements:** FR121-124

### References

- [Story 11.1](docs/sprint-artifacts/11-1-collect-and-validate-tax-identification-information.md): TIN implementation
- [Story 11.2](docs/sprint-artifacts/11-2-track-annual-earnings-for-1099-threshold.md): Earnings tracking
- [IRS Form 1099-MISC](https://www.irs.gov/forms-pubs/about-form-1099-misc): Official requirements

## Dev Agent Record

### Context Reference

Story 11.3 implements FR121-124: Generate IRS 1099-MISC forms for authors earning $600+ annually.

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

