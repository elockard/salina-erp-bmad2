# Story 7.2: Build Contact Management Interface

**Status:** review

## Story

**As an** editor or admin,
**I want** to manage contacts with multiple roles,
**So that** I can maintain a unified contact database.

## Acceptance Criteria

### AC-7.2.1: Contact List Page and Route
- [ ] Create page at `src/app/(dashboard)/contacts/page.tsx`
- [ ] Route `/contacts` renders split view layout
- [ ] Server Component fetches initial contacts
- [ ] Role-based access: Editor, Admin, Owner can access (author role redirects to portal)
- [ ] Page metadata: title "Contacts | Salina ERP"

### AC-7.2.2: Contact List View (Left Panel)
- [ ] Left panel 320px desktop, 280px tablet, full-width mobile
- [ ] Table displays: Name | Email | Roles (badges) | Status
- [ ] Role badges with icons:
  - 🖊️ Author (purple badge)
  - 🛒 Customer (blue badge)
  - 🏭 Vendor (orange badge)
  - 📦 Distributor (green badge)
- [ ] Filter by role (multi-select dropdown)
- [ ] Search by name, email (case-insensitive, debounced 300ms)
- [ ] Sort by name (A-Z default), created date
- [ ] Active/inactive filter toggle ("Show inactive")
- [ ] Loading state with skeleton loaders
- [ ] Empty state: "No contacts yet" + Create button

### AC-7.2.3: Create Contact Form (Dialog)
- [ ] "Create Contact" button in left panel header opens modal
- [ ] Basic info fields: First name (required), Last name (required), Email, Phone
- [ ] Address fields (collapsible section): Line 1, Line 2, City, State, Postal Code, Country
- [ ] Tax ID (masked input) - only visible to users with VIEW_TAX_ID permission
- [ ] Role assignment (checkbox list with role icons)
- [ ] Role-specific fields shown based on selected roles:
  - Author: Pen name, Bio, Website, Social links
  - Customer: Billing address, Shipping address, Credit limit, Payment terms
  - Vendor: Vendor code, Lead time days, Min order amount
  - Distributor: Territory, Commission rate, Contract terms
- [ ] Payment info section (collapsible):
  - Payment method dropdown: Direct Deposit, Check, Wire Transfer
  - Method-specific fields based on selection
- [ ] Form validation with Zod schema (inline error messages)
- [ ] Save button creates contact + assigns selected roles
- [ ] Success: toast notification, contact appears in list, detail loads
- [ ] Cancel resets form and closes dialog

### AC-7.2.4: Contact Detail View (Right Panel)
- [ ] Right panel is fluid width
- [ ] Header: Full name, email, status badge
- [ ] All fields editable (inline or form mode)
- [ ] Role management section:
  - Current roles with badges
  - Add role button opens role selector
  - Remove role button with confirmation
- [ ] Role-specific sections expand/collapse based on assigned roles
- [ ] Activity history section (placeholder for future):
  - Recent transactions
  - Statements
  - Invoices
- [ ] Related entities section:
  - Titles (if author role) - link to titles filtered by this contact
  - Invoices (if customer role) - placeholder for Epic 8
- [ ] Mobile: slide-in detail with back button

### AC-7.2.5: Permission Enforcement
- [ ] Add `MANAGE_CONTACTS` permission to `src/lib/permissions.ts`
  - Allowed roles: `["owner", "admin", "editor"]`
- [ ] Add `ASSIGN_CUSTOMER_ROLE` permission
  - Allowed roles: `["owner", "admin", "finance"]`
- [ ] Editors: Create/edit contacts, assign author role
- [ ] Finance: Assign customer role, view payment info
- [ ] Admin/Owner: All permissions, can deactivate contacts
- [ ] Server-side permission checks in all actions
- [ ] UI elements hidden/disabled based on permissions

### AC-7.2.6: Validation Rules
- [ ] Email unique per tenant (handle constraint error gracefully)
- [ ] First name and last name required
- [ ] Tax ID format validation (if provided)
- [ ] Payment info validated per method type
- [ ] Role-specific data validated per role type

### AC-7.2.7: Server Actions Implementation
- [ ] Implement `createContact` action in `src/modules/contacts/actions.ts`
- [ ] Implement `updateContact` action
- [ ] Implement `deactivateContact` action (soft delete)
- [ ] Implement `assignContactRole` action
- [ ] Implement `removeContactRole` action
- [ ] Implement `updateContactRoleData` action
- [ ] All actions use tenant context from `getCurrentUser()`
- [ ] All actions validate input with Zod schemas
- [ ] All actions return `{ success: true, data } | { success: false, error }`
- [ ] Audit logging for create/update/delete operations

### AC-7.2.8: Database Queries Implementation
- [ ] Implement `getContacts` query in `src/modules/contacts/queries.ts`
  - Filter by status (active/inactive)
  - Filter by role
  - Search by name/email
  - Include roles relation
  - Order by last_name, first_name
- [ ] Implement `getContactById` query with roles
- [ ] Implement `getContactsByRole` query
- [ ] Implement `searchContacts` query (debounce-friendly)
- [ ] Implement `getContactRoles` query
- [ ] All queries scoped to current tenant

## Tasks / Subtasks

- [x] **Task 0: Add Contact Audit Resource Type** (AC: 7.2.7 prerequisite)
  - [x] Add "contact" to `auditResourceTypeValues` in `src/db/schema/audit-logs.ts`
  - [x] Run `npx drizzle-kit generate` if migration needed (CHECK constraint may require it)
  - [x] This MUST be done before implementing audit logging in actions

- [x] **Task 1: Add Permissions** (AC: 7.2.5)
  - [x] Add `MANAGE_CONTACTS` to `src/lib/permissions.ts`: `["owner", "admin", "editor"]`
  - [x] Add `ASSIGN_CUSTOMER_ROLE` to permissions: `["owner", "admin", "finance"]`
  - [x] Add `VIEW_CONTACTS` permission if needed for read-only access

- [x] **Task 2: Implement Server Actions** (AC: 7.2.7)
  - [x] Replace stub `createContact` with full implementation
    - Validate input with `createContactSchema`
    - Check `MANAGE_CONTACTS` permission
    - Insert contact record
    - Insert contact_roles records for each selected role
    - Return created contact with roles
  - [x] Replace stub `updateContact` with full implementation
    - Validate input with `updateContactSchema`
    - Check permissions
    - Handle email uniqueness constraint error
    - Update contact record
  - [x] Replace stub `deactivateContact`
    - Set status to 'inactive'
    - Only Admin/Owner can deactivate
  - [x] Replace stub `assignContactRole`
    - Validate role assignment permissions (author=editor+, customer=finance+)
    - Insert into contact_roles
    - Handle unique constraint (role already assigned)
  - [x] Replace stub `removeContactRole`
    - Delete from contact_roles
    - Confirm before removing
  - [x] Replace stub `updateContactRoleData`
    - Update role_specific_data JSONB

- [x] **Task 3: Implement Database Queries** (AC: 7.2.8)
  - [x] Implement `getContacts` with filtering, sorting, relations
  - [x] Implement `getContactById` with roles
  - [x] Implement `getContactsByRole`
  - [x] Implement `searchContacts`
  - [x] Implement `getContactRoles`

- [x] **Task 4: Create Contact List Component** (AC: 7.2.2)
  - [x] Create `src/modules/contacts/components/contact-list.tsx`
  - [x] Follow `AuthorList` pattern from `src/modules/authors/components/author-list.tsx`
  - [x] Add role filter dropdown (multi-select)
  - [x] Add role badges with icons
  - [x] Implement search, sort, filter logic

- [x] **Task 5: Create Contact Form Component** (AC: 7.2.3)
  - [x] Create `src/modules/contacts/components/contact-form.tsx`
  - [x] Follow `AuthorForm` pattern
  - [x] Add collapsible address section
  - [x] Add role checkboxes
  - [x] Add dynamic role-specific fields
  - [x] Add payment info section
  - [x] Integrate with Zod schemas

- [x] **Task 6: Create Contact Detail Component** (AC: 7.2.4)
  - [x] Create `src/modules/contacts/components/contact-detail.tsx`
  - [x] Follow `AuthorDetail` pattern
  - [x] Add role management UI
  - [x] Add role-specific expandable sections
  - [x] Add related entities placeholders

- [x] **Task 7: Create Split View Container** (AC: 7.2.1)
  - [x] Create `src/modules/contacts/components/contacts-split-view.tsx`
  - [x] Follow `AuthorsSplitView` pattern exactly
  - [x] Wire up list, form, detail components
  - [x] Implement all state management and handlers

- [x] **Task 8: Create Contacts Page** (AC: 7.2.1)
  - [x] Create `src/app/(dashboard)/contacts/page.tsx`
  - [x] Server Component pattern
  - [x] Permission check (redirect author role)
  - [x] Fetch initial contacts server-side
  - [x] Render ContactsSplitView

- [x] **Task 9: Export Components**
  - [x] Create `src/modules/contacts/components/index.ts`
  - [x] Update `src/modules/contacts/index.ts` with component exports

- [x] **Task 10: Write Tests**
  - [x] Create `tests/integration/contact-management.test.tsx` (23 tests passing)

## Dev Notes

### Functional Requirements Coverage

This story implements:
- **FR85**: Contact management interface for multi-role contacts
- **FR86**: Author portal access via contacts (portal_user_id)
- **FR87**: Customer role for invoicing (schema ready, full use in Epic 8)

### Critical Implementation Patterns

#### 1. Follow Existing Author Management Patterns EXACTLY

The author management module is the blueprint. Mirror these files:
- `src/modules/authors/components/authors-split-view.tsx` → `contacts-split-view.tsx`
- `src/modules/authors/components/author-list.tsx` → `contact-list.tsx`
- `src/modules/authors/components/author-form.tsx` → `contact-form.tsx`
- `src/modules/authors/components/author-detail.tsx` → `contact-detail.tsx`
- `src/modules/authors/actions.ts` → already stubbed, implement
- `src/modules/authors/queries.ts` → already stubbed, implement

#### 2. Use Existing Zod Schemas (DO NOT RECREATE)

All validation schemas exist in `src/modules/contacts/schema.ts`:
```typescript
import {
  createContactSchema,
  updateContactSchema,
  assignContactRoleSchema,
  contactRoleSchema,
  paymentInfoSchema,
  authorRoleDataSchema,
  customerRoleDataSchema,
  vendorRoleDataSchema,
  distributorRoleDataSchema,
} from "@/modules/contacts/schema";
```

#### 3. Use Existing Types (DO NOT RECREATE)

All types exist in `src/modules/contacts/types.ts`:
```typescript
import type {
  Contact,
  ContactWithRoles,
  ContactRole,
  ContactFilters,
  PaymentInfo,
  AuthorRoleData,
  CustomerRoleData,
  VendorRoleData,
  DistributorRoleData,
} from "@/modules/contacts/types";
```

#### 4. Role Badge Configuration

```typescript
const ROLE_BADGES = {
  author: { icon: '🖊️', label: 'Author', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  customer: { icon: '🛒', label: 'Customer', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  vendor: { icon: '🏭', label: 'Vendor', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  distributor: { icon: '📦', label: 'Distributor', color: 'bg-green-100 text-green-700 border-green-200' },
} as const;
```

#### 5. Permission Pattern

```typescript
// src/lib/permissions.ts - ADD these
export const MANAGE_CONTACTS: UserRole[] = ["owner", "admin", "editor"];
export const ASSIGN_CUSTOMER_ROLE: UserRole[] = ["owner", "admin", "finance"];

// In actions - use like this:
import { requirePermission } from "@/lib/auth";
import { MANAGE_CONTACTS } from "@/lib/permissions";

export async function createContact(input: CreateContactInput) {
  const user = await requirePermission(MANAGE_CONTACTS);
  // ... implementation
}
```

#### 6. Server Action Return Pattern

```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createContact(
  input: CreateContactInput
): Promise<ActionResult<ContactWithRoles>> {
  try {
    const user = await requirePermission(MANAGE_CONTACTS);
    const validated = createContactSchema.parse(input);
    // ... database operations
    return { success: true, data: contact };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    // Handle unique constraint violation
    if (error.code === '23505') {
      return { success: false, error: 'A contact with this email already exists' };
    }
    return { success: false, error: 'Failed to create contact' };
  }
}
```

#### 7. Audit Logging Pattern

```typescript
import { logAuditEvent } from "@/lib/audit";

// In createContact action - fire and forget (don't await):
logAuditEvent({
  tenantId: user.tenant_id,
  userId: user.id,
  actionType: "CREATE",
  resourceType: "contact",
  resourceId: contact.id,
  changes: { after: contact },
});

// In updateContact action:
logAuditEvent({
  tenantId: user.tenant_id,
  userId: user.id,
  actionType: "UPDATE",
  resourceType: "contact",
  resourceId: contact.id,
  changes: { before: oldContact, after: updatedContact },
});

// In deactivateContact action:
logAuditEvent({
  tenantId: user.tenant_id,
  userId: user.id,
  actionType: "DELETE",
  resourceType: "contact",
  resourceId: contact.id,
  changes: { before: contact },
});
```

#### 8. Display Name Helper

```typescript
// Use throughout components for consistent name display
const getDisplayName = (contact: Contact) =>
  `${contact.first_name} ${contact.last_name}`.trim();

// In list sorting
contacts.sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b)));
```

#### 9. Query Pattern with Relations

```typescript
import { db } from "@/db";
import { contacts, contactRoles } from "@/db/schema";
import { eq, and, or, ilike } from "drizzle-orm";

export async function getContacts(
  filters?: ContactFilters
): Promise<ContactWithRoles[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const results = await db.query.contacts.findMany({
    where: and(
      eq(contacts.tenant_id, user.tenant_id),
      filters?.includeInactive ? undefined : eq(contacts.status, 'active'),
      filters?.searchQuery ? or(
        ilike(contacts.first_name, `%${filters.searchQuery}%`),
        ilike(contacts.last_name, `%${filters.searchQuery}%`),
        ilike(contacts.email, `%${filters.searchQuery}%`),
      ) : undefined,
    ),
    with: {
      roles: true,
    },
    orderBy: [contacts.last_name, contacts.first_name],
  });

  // Filter by role if specified
  if (filters?.role) {
    return results.filter(c => c.roles.some(r => r.role === filters.role));
  }
  return results;
}
```

### File Structure

Create these files:
```
src/
├── app/(dashboard)/contacts/
│   └── page.tsx                    # Server Component page
├── modules/contacts/
│   ├── components/
│   │   ├── index.ts               # Component exports
│   │   ├── contacts-split-view.tsx # Main container
│   │   ├── contact-list.tsx        # Left panel list
│   │   ├── contact-form.tsx        # Create/edit dialog
│   │   └── contact-detail.tsx      # Right panel detail
│   ├── actions.ts                  # UPDATE existing stubs
│   ├── queries.ts                  # UPDATE existing stubs
│   ├── types.ts                    # EXISTS - DO NOT MODIFY
│   ├── schema.ts                   # EXISTS - DO NOT MODIFY
│   └── index.ts                    # UPDATE with component exports
├── lib/
│   └── permissions.ts              # ADD MANAGE_CONTACTS
tests/
├── unit/
│   ├── contacts-actions.test.ts
│   └── contacts-queries.test.ts
├── integration/
│   └── contacts-management.test.tsx
└── e2e/
    └── contacts.spec.ts
```

### UI Components to Use

From `@/components/ui/`:
- `Button`, `Input`, `Textarea`, `Select`, `Checkbox`
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`
- `Form`, `FormField`, `FormItem`, `FormLabel`, `FormMessage`
- `Badge`
- `Skeleton`
- `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger`

### Database Schema Reference

Tables created in Story 7.1 (src/db/schema/contacts.ts):
- `contacts` - 20 columns including tenant_id, first_name, last_name, email, status, payment_info (JSONB)
- `contact_roles` - contact_id, role, role_specific_data (JSONB)

Relations in `src/db/schema/relations.ts`:
- `contactsRelations` - tenant, roles, portalUser, createdBy
- `contactRolesRelations` - contact, assignedBy

### Previous Story Learnings (7.1)

From Story 7.1 completion notes:
- Migration file `0010_contacts_schema.sql` is ready
- Module structure exists at `src/modules/contacts/`
- Type guards implemented for role-specific data
- PaymentInfo uses discriminated union - validate with `paymentInfoSchema`
- Email unique constraint allows multiple NULL values (intentional)
- Security warning: `routing_number` in PaymentInfo must be encrypted at app level

### Testing Strategy

**Unit Tests (`tests/unit/contacts-*.test.ts`):**
- Test each action with valid/invalid inputs
- Test permission enforcement (mock requirePermission)
- Test unique constraint handling (mock db error)
- Test Zod validation rejection

**Integration Tests (`tests/integration/contacts-management.test.tsx`):**
- Test full CRUD flow with test database
- Test role assignment/removal
- Test search and filter functionality
- Test tenant isolation
- Follow pattern from `tests/integration/permissions.test.ts`

**E2E Tests (`tests/e2e/contacts.spec.ts`):**
```typescript
// Follow existing E2E patterns from tests/e2e/
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/auth';

test.describe('Contacts Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, 'editor');
  });

  test('displays contact list', async ({ page }) => {
    await page.goto('/contacts');
    await expect(page.getByRole('heading', { name: 'Contacts' })).toBeVisible();
  });

  test('creates new contact', async ({ page }) => {
    await page.goto('/contacts');
    await page.getByRole('button', { name: 'Create Contact' }).click();
    // ... fill form
  });

  test('filters by role', async ({ page }) => {
    await page.goto('/contacts');
    await page.getByRole('combobox', { name: 'Role filter' }).click();
    await page.getByRole('option', { name: 'Author' }).click();
    // ... verify filter applied
  });
});
```

### Navigation Integration

Add Contacts to the dashboard sidebar navigation. Update the navigation config (check existing patterns):

```typescript
// Look for sidebar navigation in:
// - src/components/layout/sidebar.tsx
// - src/components/layout/nav-items.ts
// - or similar navigation config

// Add entry like:
{
  title: "Contacts",
  href: "/contacts",
  icon: Users, // from lucide-react
  roles: ["owner", "admin", "editor", "finance"], // roles that can see this nav item
}
```

### Anti-Patterns to Avoid

1. **DO NOT** create new Zod schemas - use existing from `schema.ts`
2. **DO NOT** create new TypeScript interfaces - use existing from `types.ts`
3. **DO NOT** modify the database schema - that was Story 7.1
4. **DO NOT** implement author migration - that's Story 7.3
5. **DO NOT** reinvent the split view pattern - copy from authors module
6. **DO NOT** skip permission checks - always use `requirePermission()`
7. **DO NOT** forget audit logging - use existing audit utilities
8. **DO NOT** store unencrypted payment info - follow security patterns
9. **DO NOT** forget to add Contacts to sidebar navigation

### References

- [Story 7.1](docs/sprint-artifacts/7-1-create-unified-contact-database-schema.md): Schema and types
- [Author Management](src/modules/authors/): Pattern reference
- [Permissions](src/lib/permissions.ts): RBAC pattern
- [PRD FR85-87](docs/prd.md): Requirements
- [Epic 7](docs/epics.md): Story context

## Dev Agent Record

### Context Reference

Story 7.2 builds the complete contact management interface on top of the schema created in Story 7.1. The contacts module structure exists with placeholder functions that need implementation.

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

**Files to Create:**
- `src/app/(dashboard)/contacts/page.tsx`
- `src/modules/contacts/components/index.ts`
- `src/modules/contacts/components/contacts-split-view.tsx`
- `src/modules/contacts/components/contact-list.tsx`
- `src/modules/contacts/components/contact-form.tsx`
- `src/modules/contacts/components/contact-detail.tsx`
- `tests/unit/contacts-actions.test.ts`
- `tests/unit/contacts-queries.test.ts`
- `tests/integration/contacts-management.test.tsx`
- `tests/e2e/contacts.spec.ts`

**Files to Modify:**
- `src/db/schema/audit-logs.ts` (add "contact" to auditResourceTypeValues - Task 0)
- `src/lib/permissions.ts` (add MANAGE_CONTACTS, ASSIGN_CUSTOMER_ROLE)
- `src/modules/contacts/actions.ts` (replace stubs with implementations)
- `src/modules/contacts/queries.ts` (replace stubs with implementations)
- `src/modules/contacts/index.ts` (add component exports)
- Sidebar navigation file (add Contacts nav item)
