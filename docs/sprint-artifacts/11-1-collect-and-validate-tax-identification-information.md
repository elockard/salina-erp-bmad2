# Story 11.1: Collect and Validate Tax Identification Information

**Status:** review-ready

## Story

**As an** Editor,
**I want** to collect and validate author tax identification numbers,
**So that** we have accurate information for 1099 reporting.

## Acceptance Criteria

### AC-11.1.1: Tax Information Section in Contact Form

- [x] Contact form includes a "Tax Information" section for contacts with Author role
- [x] Tax section is only visible/editable by Finance and Admin roles
- [x] Tax section displays when editing an existing contact with Author role
- [x] Tax section is collapsible to reduce form complexity
- [x] Section header indicates 1099 reporting purpose

### AC-11.1.2: Tax Identification Number Entry

- [x] Users can enter a Tax Identification Number (TIN)
- [x] Users can specify TIN type: SSN (Social Security Number) or EIN (Employer Identification Number)
- [x] TIN type selection uses radio buttons with clear labels:
  - "SSN - Individual (XXX-XX-XXXX)"
  - "EIN - Business Entity (XX-XXXXXXX)"
- [x] TIN input field masks input as user types
- [x] TIN input auto-formats with appropriate separators

### AC-11.1.3: TIN Format Validation

- [x] SSN format validation: XXX-XX-XXXX pattern (9 digits with dashes)
- [x] EIN format validation: XX-XXXXXXX pattern (9 digits with dash after position 2)
- [x] Real-time validation feedback as user types
- [x] Clear error messages for invalid formats:
  - SSN: "SSN must be in format XXX-XX-XXXX"
  - EIN: "EIN must be in format XX-XXXXXXX"
- [x] Prevent form submission with invalid TIN format

### AC-11.1.4: TIN Encryption and Security

- [x] TIN is encrypted at rest before database storage
- [x] Use AES-256-GCM encryption for TIN values
- [x] Encryption key stored in environment variable (TIN_ENCRYPTION_KEY)
- [x] Only the encrypted value is stored in `tin_encrypted` column
- [x] Last 4 digits stored separately in `tin_last_four` for display
- [x] TIN is never logged in plain text (audit logs capture event without TIN value)

### AC-11.1.5: TIN Display Masking

- [x] Stored TIN displays as masked: `***-**-1234` (SSN) or `**-***1234` (EIN)
- [x] Full TIN is never displayed in the UI after initial entry
- [x] Only last 4 digits visible in masked display
- [x] Edit mode shows masked value with option to "Update TIN" (requires re-entry)

### AC-11.1.6: US-Based Author Indicator

- [x] Checkbox: "This author is US-based (required for 1099 reporting)"
- [x] `is_us_based` field stored as boolean on contacts table
- [x] Defaults to true for new contacts in US tenants
- [x] Non-US authors are excluded from 1099 reporting requirements

### AC-11.1.7: W-9 Form Status Tracking

- [x] Checkbox: "W-9 form received"
- [x] Date field: "W-9 received date" (enabled when checkbox is checked)
- [x] `w9_received` boolean and `w9_received_date` timestamp stored on contacts
- [x] W-9 status displayed in contact detail view

### AC-11.1.8: Missing TIN Warning System

- [x] System flags US-based authors missing TIN when they have earnings
- [x] Warning indicator appears on contact list for flagged authors
- [x] Warning appears in contact detail view header
- [ ] Finance dashboard shows count of authors requiring TIN *(deferred - no Finance dashboard exists yet)*
- [x] Warning message: "Tax ID required for 1099 reporting"

### AC-11.1.9: Audit Trail for Tax Information

- [x] Audit log captures TIN additions (without actual TIN value)
- [x] Audit log captures TIN changes (without actual TIN values)
- [x] Audit log captures W-9 status changes
- [x] Audit log captures `is_us_based` changes
- [x] Audit entries include: timestamp, user_id, action type, contact_id

### AC-11.1.10: Backward Compatibility

- [x] Existing contacts without tax info continue to function
- [x] No migration required for existing tax_id values (will be encrypted on next update)
- [x] Existing tests pass without modification

## Tasks / Subtasks

- [x] **Task 1: Database Schema Updates** (AC: 11.1.2, 11.1.4, 11.1.6, 11.1.7) **[CRITICAL - Blocks all other tasks]**
  - [x] Add migration for new columns on contacts table:
    - `tin_encrypted` TEXT (encrypted TIN value)
    - `tin_type` TEXT ('ssn' | 'ein')
    - `tin_last_four` TEXT (4 characters, for masked display)
    - `is_us_based` BOOLEAN DEFAULT true
    - `w9_received` BOOLEAN DEFAULT false
    - `w9_received_date` TIMESTAMP WITH TIMEZONE
  - [x] Keep existing `tax_id` column for backward compatibility (will deprecate later)
  - [x] Add type definitions in `src/db/schema/contacts.ts`
  - [x] Export `tinTypeValues` and `TinType` types
  - [x] Write schema tests for new columns
  - [x] Generate migration: `npx drizzle-kit generate:pg`

- [x] **Task 2: Encryption Utilities** (AC: 11.1.4)
  - [x] Create `src/lib/encryption.ts` with TIN encryption utilities
  - [x] Implement `encryptTIN(plaintext: string): string` function
  - [x] Implement `decryptTIN(ciphertext: string): string` function (for admin TIN verification if needed)
  - [x] Use AES-256-GCM encryption from Node.js crypto module
  - [x] Encryption key from `process.env.TIN_ENCRYPTION_KEY`
  - [x] Throw meaningful error if encryption key not configured
  - [x] Write unit tests for encryption/decryption
  - [ ] Document key generation process in README *(deferred)*

- [x] **Task 3: TIN Validation Utilities** (AC: 11.1.3)
  - [x] Create `src/lib/tin-validation.ts` with validation functions
  - [x] Implement `validateSSN(value: string): boolean` - validates XXX-XX-XXXX format
  - [x] Implement `validateEIN(value: string): boolean` - validates XX-XXXXXXX format
  - [x] Implement `formatSSN(value: string): string` - auto-format input
  - [x] Implement `formatEIN(value: string): string` - auto-format input
  - [x] Implement `maskTIN(lastFour: string, type: 'ssn' | 'ein'): string` - returns masked display
  - [x] Implement `extractLastFour(tin: string): string` - extracts last 4 digits
  - [x] Write comprehensive unit tests for all functions
  - [x] Handle edge cases: partial input, invalid characters, copy/paste scenarios

- [x] **Task 4: Update Contact Zod Schemas** (AC: 11.1.2, 11.1.3, 11.1.6, 11.1.7)
  - [x] Update `src/modules/contacts/schema.ts` with tax info fields
  - [x] Add `tinTypeEnum` Zod schema: `z.enum(['ssn', 'ein'])`
  - [x] Add `taxInfoSchema` for nested tax information validation
  - [x] Add SSN/EIN format validation using custom refinements
  - [x] Update `createContactSchema` with optional tax fields
  - [x] Update `updateContactSchema` with optional tax fields
  - [x] Export new types: `TaxInfoInput`, `TinTypeInput`
  - [x] Write schema validation tests

- [x] **Task 5: Contact Actions Update** (AC: 11.1.4, 11.1.9)
  - [x] Update `src/modules/contacts/actions.ts` with tax info handling
  - [x] Encrypt TIN before storage in create/update actions
  - [x] Extract and store `tin_last_four` separately
  - [x] Add permission check: only Finance/Admin can modify tax info
  - [x] Add audit logging for tax info changes (without TIN value)
  - [x] Create `updateTaxInfo` server action for isolated tax updates
  - [x] Handle backward compatibility with existing `tax_id` field
  - [x] Write action tests with encryption mocking

- [x] **Task 6: Contact Queries Update** (AC: 11.1.8)
  - [x] Update `src/modules/contacts/queries.ts` with tax status queries
  - [x] Add `getAuthorsWithMissingTIN(tenantId)` query
  - [x] Add `getAuthorTaxStatus(contactId)` query
  - [x] Return masked TIN display in query results (never raw TIN)
  - [x] Include tax fields in contact detail queries
  - [x] Write query tests

- [x] **Task 7: Tax Information Form Component** (AC: 11.1.1, 11.1.2, 11.1.5)
  - [x] Create `src/modules/contacts/components/tax-info-form.tsx` *(renamed from tax-info-section)*
  - [x] TIN type radio button selector (SSN/EIN)
  - [x] TIN input with masking and auto-formatting
  - [x] Masked display for existing TIN (***-**-1234)
  - [x] "Update TIN" button for re-entry flow
  - [x] US-based checkbox
  - [x] W-9 received checkbox with date picker
  - [x] Collapsible section with clear header
  - [x] Write component tests

- [x] **Task 8: Update Contact Form** (AC: 11.1.1)
  - [x] Update `src/modules/contacts/components/contact-form.tsx`
  - [x] Conditionally render TaxInfoSection for Author role contacts
  - [x] Pass permission check to hide/show section
  - [x] Integrate tax info with form submission
  - [x] Handle form state for tax fields
  - [x] Write form integration tests

- [x] **Task 9: Contact Detail Tax Display** (AC: 11.1.5, 11.1.8)
  - [x] Update `src/modules/contacts/components/contact-detail.tsx`
  - [x] Add tax information display section
  - [x] Show masked TIN with type
  - [x] Show W-9 status and date
  - [x] Show warning banner for missing TIN (US authors with earnings)
  - [x] Write component tests

- [x] **Task 10: Missing TIN Warning Indicators** (AC: 11.1.8)
  - [x] Update contact list component with warning indicator
  - [x] Add warning icon for authors missing TIN
  - [x] Add tooltip explaining warning
  - [ ] Update Finance dashboard with missing TIN count *(deferred - no Finance dashboard exists)*
  - [x] Write component tests for warning states

- [x] **Task 11: Comprehensive Testing** (AC: all)
  - [x] Unit: TIN validation functions - all formats and edge cases (47 tests)
  - [x] Unit: Encryption functions - encrypt/decrypt roundtrip (15 tests)
  - [x] Unit: Zod schema validation - valid/invalid inputs (31 tests)
  - [x] Integration: Contact create with tax info
  - [x] Integration: Contact update with tax info
  - [x] Integration: Permission checks (Finance vs Editor)
  - [x] Integration: Audit logging verification
  - [x] E2E: Tax info entry flow (Finance user)
  - [x] E2E: Tax info visibility (Editor cannot see)
  - [x] E2E: Missing TIN warning display

## Dev Notes

### CRITICAL: Security Considerations

**TIN is PII (Personally Identifiable Information)** - Handle with care:

1. **Never log raw TIN values** - Audit logs capture events, not data
2. **Encrypt at rest** - AES-256-GCM encryption before database storage
3. **Mask in UI** - Only show last 4 digits (***-**-1234)
4. **Restrict access** - Only Finance/Admin roles can view/edit tax info
5. **Key management** - Encryption key in environment variable, not code

### Database Schema Addition

```typescript
// In src/db/schema/contacts.ts - add to contacts table:

/** TIN type values: SSN for individuals, EIN for business entities */
export const tinTypeValues = ["ssn", "ein"] as const;
export type TinType = (typeof tinTypeValues)[number];

// Add these columns to the contacts table definition:

/** Encrypted TIN value (SSN or EIN) - AES-256-GCM encrypted */
tin_encrypted: text("tin_encrypted"),

/** TIN type: 'ssn' (individual) or 'ein' (business entity) */
tin_type: text("tin_type"),

/** Last 4 digits of TIN for masked display */
tin_last_four: text("tin_last_four"),

/** Whether author is US-based (required for 1099 reporting) */
is_us_based: boolean("is_us_based").default(true),

/** Whether W-9 form has been received */
w9_received: boolean("w9_received").default(false),

/** Date W-9 form was received */
w9_received_date: timestamp("w9_received_date", { withTimezone: true }),
```

### Encryption Implementation

```typescript
// src/lib/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt TIN using AES-256-GCM
 * Returns: base64(IV + encrypted + authTag)
 */
export function encryptTIN(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine IV + encrypted + authTag
  const combined = Buffer.concat([iv, encrypted, authTag]);
  return combined.toString("base64");
}

/**
 * Decrypt TIN using AES-256-GCM
 */
export function decryptTIN(ciphertext: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(ciphertext, "base64");

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(-AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH, -AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString("utf8");
}

function getEncryptionKey(): Buffer {
  const keyHex = process.env.TIN_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error(
      "TIN_ENCRYPTION_KEY environment variable is not set. " +
        "Generate a 32-byte hex key: openssl rand -hex 32"
    );
  }
  return Buffer.from(keyHex, "hex");
}
```

### TIN Validation Implementation

```typescript
// src/lib/tin-validation.ts

/** SSN format: XXX-XX-XXXX */
const SSN_PATTERN = /^\d{3}-\d{2}-\d{4}$/;

/** EIN format: XX-XXXXXXX */
const EIN_PATTERN = /^\d{2}-\d{7}$/;

export function validateSSN(value: string): boolean {
  return SSN_PATTERN.test(value);
}

export function validateEIN(value: string): boolean {
  return EIN_PATTERN.test(value);
}

export function validateTIN(value: string, type: "ssn" | "ein"): boolean {
  return type === "ssn" ? validateSSN(value) : validateEIN(value);
}

/** Auto-format SSN input: 123456789 -> 123-45-6789 */
export function formatSSN(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

/** Auto-format EIN input: 123456789 -> 12-3456789 */
export function formatEIN(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

/** Mask TIN for display: 1234 -> ***-**-1234 (SSN) or **-***1234 (EIN) */
export function maskTIN(lastFour: string, type: "ssn" | "ein"): string {
  if (type === "ssn") return `***-**-${lastFour}`;
  return `**-***${lastFour}`;
}

/** Extract last 4 digits from formatted TIN */
export function extractLastFour(tin: string): string {
  const digits = tin.replace(/\D/g, "");
  return digits.slice(-4);
}
```

### File Locations

**Schema:**
- `src/db/schema/contacts.ts` - Add tax-related columns
- `src/db/migrations/` - New migration file

**Utilities:**
- `src/lib/encryption.ts` - TIN encryption/decryption (NEW)
- `src/lib/tin-validation.ts` - TIN format validation (NEW)

**Modules:**
- `src/modules/contacts/schema.ts` - Update Zod schemas
- `src/modules/contacts/actions.ts` - Update create/update actions
- `src/modules/contacts/queries.ts` - Add tax status queries
- `src/modules/contacts/types.ts` - Add tax-related types

**Components:**
- `src/modules/contacts/components/tax-info-section.tsx` - NEW tax info form
- `src/modules/contacts/components/contact-form.tsx` - Integrate tax section
- `src/modules/contacts/components/contact-detail.tsx` - Show tax info
- `src/modules/contacts/components/contact-list.tsx` - Add warning indicators

**Tests:**
- `tests/unit/tin-validation.test.ts` - Validation tests (NEW)
- `tests/unit/tin-encryption.test.ts` - Encryption tests (NEW)
- `tests/unit/contacts-tax-schema.test.ts` - Schema tests (NEW)
- `tests/integration/contact-tax-info.test.ts` - Integration tests (NEW)
- `tests/e2e/contact-tax-info.spec.ts` - E2E tests (NEW)

### Task Dependencies

```
Task 1 (Schema) ─────────┬─────→ Task 4 (Zod Schemas) ───→ Task 5 (Actions)
                         │                                        │
Task 2 (Encryption) ─────┤                                        ↓
                         │                              Task 6 (Queries)
Task 3 (Validation) ─────┴─────→ Task 7 (Tax Form) ───→ Task 8 (Contact Form)
                                        │                        │
                                        ↓                        ↓
                                 Task 9 (Detail) ───→ Task 10 (Warnings)

Task 11 (Testing) [run last, after all other tasks]
```

**Parallelizable:** Tasks 2, 3 can run in parallel. Tasks 7, 8, 9, 10 can be partially parallelized after Tasks 4, 5, 6.

### Role-Based Access Control

**Tax info section visibility/editability:**
- **Owner**: Can view and edit tax info
- **Admin**: Can view and edit tax info
- **Finance**: Can view and edit tax info
- **Editor**: CANNOT view or edit tax info
- **Author (Portal)**: CANNOT view or edit tax info

```typescript
// Permission check in component
const canEditTaxInfo = ["owner", "admin", "finance"].includes(userRole);

// Permission check in server action
export async function updateTaxInfo(contactId: string, taxInfo: TaxInfoInput) {
  const user = await getCurrentUser();
  if (!["owner", "admin", "finance"].includes(user.role)) {
    return { success: false, error: "Only Finance users can update tax information" };
  }
  // ... proceed with update
}
```

### Audit Log Events

Log these events WITHOUT including actual TIN value:

```typescript
// Tax info audit events
type TaxAuditEvent =
  | { action: "tax_info_added"; contact_id: string; tin_type: "ssn" | "ein" }
  | { action: "tax_info_updated"; contact_id: string; tin_type: "ssn" | "ein" }
  | { action: "tax_info_removed"; contact_id: string }
  | { action: "w9_status_changed"; contact_id: string; w9_received: boolean }
  | { action: "us_based_changed"; contact_id: string; is_us_based: boolean };
```

### Environment Variables

Add to `.env.local` and production environment:

```bash
# TIN Encryption Key (32 bytes hex)
# Generate with: openssl rand -hex 32
TIN_ENCRYPTION_KEY=<64-character-hex-string>
```

### Edge Cases

1. **Existing contacts**: May have old `tax_id` field populated - leave as-is, encrypt on next update
2. **TIN re-entry**: User must re-enter full TIN when updating (no decryption for edit)
3. **Partial TIN entry**: Validate only when all digits entered
4. **Copy/paste**: Handle pasted values with/without formatting
5. **Leading zeros**: SSN/EIN can start with 0, preserve as string
6. **Non-US authors**: `is_us_based=false` skips TIN requirement
7. **Missing W-9 date**: If `w9_received=true` but date missing, set to current date

### Prerequisites

**Required:**
- Epic 7 complete (Contacts module exists) - ✅ DONE

**Dependencies:**
- Story 11.2 depends on this story for TIN status tracking
- Story 11.3 depends on this story for 1099 generation

### References

- [Epic 11 in epics.md](docs/epics.md#epic-11-tax--compliance): FR119-124
- [Contacts Schema](src/db/schema/contacts.ts): Current contacts table definition
- [Contacts Module](src/modules/contacts/): Actions, queries, components
- [Architecture - Data Protection](docs/architecture.md#data-protection): Security patterns
- [IRS 1099-MISC Instructions](https://www.irs.gov/forms-pubs/about-form-1099-misc): Official form requirements

## Dev Agent Record

### Context Reference

Story 11.1 implements FR119: System collects and validates tax identification (TIN/SSN) for US-based authors. Key focus areas:

1. **Database**: Add encrypted TIN storage with type and last-four columns
2. **Security**: AES-256-GCM encryption for TIN at rest
3. **Validation**: SSN (XXX-XX-XXXX) and EIN (XX-XXXXXXX) format validation
4. **UI**: Tax info section in contact form (Finance/Admin only)
5. **Display**: Masked TIN display (***-**-1234)
6. **Audit**: Log tax info changes without TIN values
7. **Warnings**: Flag US authors missing TIN

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

**Code Review 2024-12-10:**
1. All core functionality implemented and tested (108 unit/integration tests passing)
2. **Deferred Items:**
   - Finance dashboard TIN count - No Finance dashboard exists yet
   - README documentation for TIN_ENCRYPTION_KEY setup
3. **Issues Fixed:**
   - ~~Permission check uses MANAGE_CONTACTS which includes Editor role~~ - FIXED: Changed to VIEW_TAX_ID (owner, admin, finance)
   - E2E tests added: `tests/e2e/contact-tax-info.spec.ts`
4. Story status updated from incomplete tracking to accurate completion status
5. Permission check fixed in `updateContactTaxInfo`, `updateContactTaxInfoPartial`, `clearContactTaxInfo` to use `VIEW_TAX_ID` permission

### File List

**New Files:**
- `src/lib/tin-validation.ts` - TIN format validation and formatting utilities
- `src/modules/contacts/components/tax-info-form.tsx` - Tax information form component
- `src/modules/contacts/components/tax-info-display.tsx` - Tax information read-only display
- `tests/unit/tin-validation.test.ts` - TIN validation unit tests (47 tests)
- `tests/unit/tin-encryption.test.ts` - TIN encryption unit tests (15 tests)
- `tests/unit/contacts-tax-schema.test.ts` - Tax schema validation tests (31 tests)
- `tests/integration/tax-info-actions.test.ts` - Tax info integration tests (15 tests)
- `tests/e2e/contact-tax-info.spec.ts` - E2E tests for tax info flow (NEW)

**Modified Files:**
- `src/db/schema/contacts.ts` - Added tax-related columns (tin_encrypted, tin_type, tin_last_four, is_us_based, w9_received, w9_received_date)
- `src/lib/encryption.ts` - Added encryptTIN/decryptTIN functions
- `src/modules/contacts/schema.ts` - Added taxInfoSchema, tinTypeEnum, updateTaxInfoSchema
- `src/modules/contacts/actions.ts` - Added updateContactTaxInfo, updateContactTaxInfoPartial, clearContactTaxInfo
- `src/modules/contacts/queries.ts` - Added getAuthorsWithMissingTIN, getAuthorTaxStatus
- `src/modules/contacts/types.ts` - Added TaxInfo type exports
- `src/modules/contacts/index.ts` - Exported new functions
- `src/modules/contacts/components/index.ts` - Exported TaxInfoForm, TaxInfoDisplay
- `src/modules/contacts/components/contact-form.tsx` - Integrated TaxInfoForm component
- `src/modules/contacts/components/contact-detail.tsx` - Integrated TaxInfoDisplay component
- `src/modules/contacts/components/contact-list.tsx` - Added missing TIN warning indicators
