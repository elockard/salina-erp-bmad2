# Story 20.1: Build Onboarding Wizard

## Story

**As a** new tenant administrator,
**I want** a guided onboarding experience,
**So that** I can set up my account quickly.

## Status

Complete

## Epic Reference

[Epic 20: UX Enhancements](../epics.md#epic-20-ux-enhancements)

## FRs Implemented

- **FR176:** New tenant can complete guided onboarding wizard with essential setup steps
- **FR181:** System displays onboarding progress indicator until essential setup is complete

## Business Value

- Reduces time-to-value for new customers from hours to minutes
- Increases activation rate by guiding users through critical first steps
- Reduces support inquiries from confused new users
- Creates positive first impression and professional onboarding experience

## Dependencies

- **Prerequisites:** Epic 1 (Foundation) - Complete
- **Depends On:**
  - User authentication (Clerk) - Complete
  - Tenant registration - Complete (Story 1.4)
  - Welcome page - Complete (Story 1.8)
  - Contact management - Complete (Epic 7)
  - Title management - Complete (Epic 2)
  - ISBN management - Complete (Epic 7)

---

## UX Design Reference

This story implements the **Wizard-Guided Modal** pattern from the UX Design Specification:
- Multi-step wizard with progress indicator (UX Spec Section 4.2)
- Step indicator showing completed/current/upcoming states
- Modal overlay maintains context while guiding user through flow
- Color scheme: Editorial Navy (`#1E3A5F`) for primary actions

**Related UX Patterns:**
- Progress bars for long-running operations (UX Spec line 1087)
- Toast notifications for success/error feedback
- Form validation with inline error messages

---

## Acceptance Criteria

### AC 20.1.1: New Tenant Wizard Trigger

**Given** I am a newly registered tenant owner
**When** I first log in after registration
**Then** I am automatically redirected to the onboarding wizard

**And** the wizard displays:
- Welcome message with tenant name
- Progress indicator showing 0% complete
- "Let's Get Started" call-to-action

**And** existing tenants with completed onboarding see dashboard normally

---

### AC 20.1.2: Multi-Step Wizard Flow

**Given** I am viewing the onboarding wizard
**When** I progress through the steps
**Then** I see the following steps in order:

| Step | Name | Description | Required |
|------|------|-------------|----------|
| 1 | Company Profile | Configure company details and branding | Yes |
| 2 | Invite Team | Invite first team member (optional) | No |
| 3 | Add Contact | Create first author/contact | No |
| 4 | Create Title | Add first title to catalog | No |
| 5 | Configure ISBN | Set up ISBN prefix or import ISBNs | No |

**And** each step shows:
- Step number and title
- Brief description of what this step accomplishes
- Form fields or action buttons
- Skip option (for non-required steps)
- Back/Next navigation

---

### AC 20.1.3: Step 1 - Company Profile Setup

**Given** I am on Step 1 (Company Profile)
**When** I fill out the form
**Then** I can configure:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Company Name | Text | Yes (pre-filled) | From registration |
| Fiscal Year Start | Month Selector | No | Default: January |
| Default Currency | Dropdown | No | Default: USD |
| Statement Frequency | Radio | No | Quarterly/Annual |
| Timezone | Dropdown | No | Default: America/New_York |

**And** clicking "Save & Continue" updates tenant settings and advances to Step 2

**Note:** Logo upload deferred to future enhancement; users can add via Settings page later.

---

### AC 20.1.4: Step 2 - Invite Team Member

**Given** I am on Step 2 (Invite Team)
**When** I choose to invite a team member
**Then** I can enter:

| Field | Type | Required |
|-------|------|----------|
| Email | Email | Yes |
| Name | Text | No |
| Role | Dropdown | Yes |

**And** available roles are: Admin, Editor, Finance
**And** clicking "Send Invite" sends invitation email via Clerk
**And** I can skip this step to continue without inviting

---

### AC 20.1.5: Step 3 - Add First Contact

**Given** I am on Step 3 (Add Contact)
**When** I choose to add a contact
**Then** I see a simplified contact form with:

| Field | Type | Required |
|-------|------|----------|
| Name | Text | Yes |
| Email | Email | No |
| Role | Multi-select | Yes |

**And** available roles include: Author, Customer, Vendor
**And** default role is "Author" (pre-selected)
**And** clicking "Create Contact" creates the contact
**And** success message shows with contact name
**And** I can skip this step

---

### AC 20.1.6: Step 4 - Create First Title

**Given** I am on Step 4 (Create Title)
**When** I choose to add a title
**Then** I see a simplified title form with:

| Field | Type | Required |
|-------|------|----------|
| Title | Text | Yes |
| Subtitle | Text | No |
| Format | Dropdown | Yes |
| Publication Date | Date | No |
| Author | Dropdown | No |

**And** Author dropdown shows contacts created in Step 3 (if any)
**And** Format defaults to "Paperback"
**And** clicking "Create Title" creates the title
**And** I can skip this step

---

### AC 20.1.7: Step 5 - Configure ISBN

**Given** I am on Step 5 (Configure ISBN)
**When** I view the ISBN configuration options
**Then** I see two options:

1. **Add ISBN Prefix**
   - Publisher prefix input (e.g., "978-1-12345")
   - Block size selector (100, 1000, 10000)
   - "Generate Pool" button

2. **Import ISBNs**
   - "I already have ISBNs" link
   - Redirects to ISBN import page

**And** I can skip this step
**And** skipping marks onboarding as complete

---

### AC 20.1.8: Progress Indicator

**Given** I am anywhere in the onboarding wizard
**When** I view the progress indicator
**Then** I see:

- Visual progress bar showing percentage complete
- Step indicators (circles) showing:
  - Completed steps (green checkmark)
  - Current step (highlighted)
  - Upcoming steps (gray)
- Current step label

**And** completing required steps increases progress
**And** skipping optional steps does not reduce final percentage
**And** 100% means all required steps completed

---

### AC 20.1.9: Skip and Return Later

**Given** I am in the onboarding wizard
**When** I click "Skip" on any optional step
**Then** I advance to the next step
**And** skipped step is marked as skipped (not incomplete)

**When** I click "Finish Later" or close the wizard
**Then** my progress is saved
**And** I am redirected to dashboard
**And** dashboard shows onboarding progress widget

**When** I return to the wizard later
**Then** I resume from where I left off
**And** completed steps show green checkmarks
**And** I can revisit completed steps to edit

---

### AC 20.1.10: Onboarding Completion

**Given** I complete Step 5 or click "Finish" on any step
**When** onboarding is marked complete
**Then** I see a completion screen with:

- Celebration animation/icon
- "You're all set!" message
- Quick stats (what was created)
- "Go to Dashboard" button

**And** onboarding_status in database is set to 'completed'
**And** future logins go directly to dashboard
**And** onboarding wizard is no longer shown automatically

---

### AC 20.1.11: Dashboard Onboarding Widget

**Given** I have incomplete onboarding
**When** I view the dashboard
**Then** I see an onboarding progress widget showing:

- Progress bar with percentage
- "Continue Setup" button
- List of remaining steps
- Option to dismiss permanently

**And** clicking "Continue Setup" opens the wizard at the current step
**And** dismissing permanently marks onboarding as dismissed (not completed)

---

### AC 20.1.12: Persistence Across Sessions

**Given** I am in the middle of onboarding
**When** I log out and log back in
**Then** my onboarding progress is preserved
**And** I resume from my last step
**And** all previously entered data is saved

---

## Technical Notes

### Database Schema

Create new `onboarding_progress` table using Drizzle ORM pattern:

```typescript
// src/db/schema/onboarding.ts
import {
  integer,
  jsonb,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

/**
 * Onboarding status enum values
 */
export const onboardingStatusEnum = ["not_started", "in_progress", "completed", "dismissed"] as const;
export type OnboardingStatus = (typeof onboardingStatusEnum)[number];

/**
 * Onboarding progress table
 * Tracks tenant onboarding wizard state
 * Story 20.1: Build Onboarding Wizard
 */
export const onboardingProgress = pgTable(
  "onboarding_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull().default("not_started"),
    current_step: integer("current_step").notNull().default(1),
    // {"1": true, "2": "skipped", "3": false}
    steps_completed: jsonb("steps_completed").notNull().default({}),
    // Temporary data for incomplete steps
    step_data: jsonb("step_data").notNull().default({}),
    started_at: timestamp("started_at", { withTimezone: true }),
    completed_at: timestamp("completed_at", { withTimezone: true }),
    dismissed_at: timestamp("dismissed_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqTenant: unique("onboarding_progress_tenant_unique").on(table.tenant_id),
  })
);

// Add to src/db/schema/relations.ts:
// onboardingProgress: one(onboardingProgress, {
//   fields: [tenants.id],
//   references: [onboardingProgress.tenant_id],
// }),
```

**RLS Policy:** Add via migration using `sql` template tag or raw SQL in migration file.

### File Structure

```
src/
├── app/(onboarding)/
│   ├── onboarding/
│   │   └── page.tsx                    # Main wizard page
│   └── welcome/
│       └── page.tsx                    # Updated to check onboarding status
├── modules/onboarding/
│   ├── components/
│   │   ├── onboarding-wizard.tsx       # Main wizard component
│   │   ├── onboarding-progress.tsx     # Progress indicator
│   │   ├── step-company-profile.tsx    # Step 1
│   │   ├── step-invite-team.tsx        # Step 2
│   │   ├── step-add-contact.tsx        # Step 3
│   │   ├── step-create-title.tsx       # Step 4
│   │   ├── step-configure-isbn.tsx     # Step 5
│   │   ├── onboarding-completion.tsx   # Completion screen
│   │   └── dashboard-widget.tsx        # Dashboard progress widget
│   ├── actions.ts                      # Server actions
│   ├── queries.ts                      # Data fetching
│   ├── schema.ts                       # Zod validation
│   └── types.ts                        # TypeScript types
├── db/schema/
│   └── onboarding.ts                   # Drizzle schema
```

### Existing Code to Reuse

**CRITICAL:** Do NOT reinvent these existing patterns. Import and extend them.

#### UI Components (Already Exist)

```typescript
// Progress bar - USE THIS, don't create new one
import { Progress } from "@/components/ui/progress";
// Usage: <Progress value={33} className="h-2" />

// All shadcn/ui components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
```

#### Step 1 - Company Profile (Reuse Tenant Settings)

```typescript
// Reuse existing tenant settings pattern
import { updateTenantSettings, getTenantSettings } from "@/modules/tenant/actions";
import { updateTenantSettingsFormSchema, type UpdateTenantSettingsFormInput } from "@/modules/tenant/schema";

// Reference existing form: src/modules/tenant/components/tenant-settings-form.tsx
// Contains: timezone, fiscal_year_start, default_currency, statement_frequency
```

#### Step 2 - Invite Team (Reuse User Invitation)

```typescript
// Reuse existing invitation pattern
import { inviteUser } from "@/modules/users/actions";
import { inviteUserSchema, type InviteUserInput } from "@/modules/users/schema";

// Reference existing dialog: src/modules/users/components/invite-user-dialog.tsx
// Uses Clerk invitations API internally
```

#### Step 3 - Add Contact (Reuse Contact Creation)

```typescript
// Reuse existing contact pattern
import { createContact } from "@/modules/contacts/actions";
import { createContactFormSchema, type CreateContactFormInput } from "@/modules/contacts/schema";

// Reference existing form: src/modules/contacts/components/contact-form.tsx
// Handles roles, tax info, status
```

#### Step 4 - Create Title (Reuse Title Creation)

```typescript
// Reuse existing title pattern
import { createTitle } from "@/modules/titles/actions";
import { createTitleFormSchema, type CreateTitleFormInput } from "@/modules/titles/schema";

// Reference existing form: src/modules/titles/components/title-form.tsx
// Handles format, publication status, BISAC codes
```

#### Step 5 - Configure ISBN (Reuse ISBN Prefix Creation)

```typescript
// Reuse existing ISBN prefix pattern
import { createIsbnPrefix } from "@/modules/isbn-prefixes/actions";
import { createIsbnPrefixSchema, type CreateIsbnPrefixInput } from "@/modules/isbn-prefixes/schema";

// Reference existing form: src/modules/isbn-prefixes/components/isbn-prefix-form.tsx
// Handles prefix validation, block size selection
```

#### Logo Upload

Logo upload is **out of scope for MVP**. Defer to future enhancement:
- S3 presigned URL pattern exists but is used for PDF statements, not file uploads
- Focus on core onboarding flow; logo can be added via Settings later

---

### Implementation Patterns

Follow existing wizard pattern from `src/modules/statements/components/statement-wizard-modal.tsx`:
- Multi-step form with progress indicator
- Step validation before advancing
- FormProvider for shared form state
- Server Actions for persistence

### Key Components

1. **OnboardingWizard** - Main orchestrator component
   - Manages step navigation
   - Handles form state across steps
   - Persists progress to database

2. **OnboardingProgress** - Visual progress indicator
   - Reusable for wizard and dashboard widget
   - Shows step completion status
   - Calculates percentage complete

3. **Step Components** - Individual step forms
   - Each step is self-contained
   - Validates on "Next" click
   - Calls server actions on completion

### Integration Points

- **Welcome Page:** Update to check onboarding status, redirect to wizard if incomplete
- **Dashboard Layout:** Add onboarding widget for incomplete users
- **Clerk:** Use existing invitation API for team member invites
- **Tenant Settings:** Reuse existing tenant settings form/actions

---

## Scope

### In Scope
- Multi-step onboarding wizard UI
- Progress tracking and persistence
- 5-step flow (Company, Team, Contact, Title, ISBN)
- Dashboard progress widget
- Skip/resume functionality
- Completion celebration screen

### Out of Scope
- **Logo upload** - Deferred; users can add via Settings page later
- Email notifications for onboarding reminders (future story)
- Admin analytics on onboarding completion rates (future story)
- A/B testing different onboarding flows (future)
- Video tutorials within wizard (future)
- Primary color/branding customization (future enhancement)

---

## Tasks

### Database & Schema
- [x] Create `src/db/schema/onboarding.ts` with Drizzle schema
- [x] Add to `src/db/schema/index.ts` exports
- [x] Add to `src/db/schema/relations.ts` (tenant relation)
- [x] Generate and run migration
- [x] Test: Verify RLS policy works correctly

### Module Structure
- [x] Create `src/modules/onboarding/` directory structure
- [x] Create `types.ts` with OnboardingProgress, OnboardingStep types
- [x] Create `schema.ts` with Zod validation schemas
- [x] Create `queries.ts` with getOnboardingProgress query
- [x] Create `actions.ts` with:
  - [x] `updateOnboardingStep` - Save step data
  - [x] `skipOnboardingStep` - Mark step as skipped
  - [x] `completeOnboarding` - Mark as complete
  - [x] `dismissOnboarding` - Mark as dismissed

### Step Components
- [x] Create `step-company-profile.tsx`
  - [x] Reuse patterns from `src/modules/tenant/components/tenant-settings-form.tsx`
  - [x] Company name field (pre-filled from tenant, editable)
  - [x] Fiscal year start month dropdown
  - [x] Currency dropdown (USD default)
  - [x] Timezone dropdown (reuse from tenant settings)
  - [x] Statement frequency radio buttons (quarterly/annual)
  - [x] Call `updateTenantSettings` action on submit
  - [x] Test: Form validation works

- [x] Create `step-invite-team.tsx`
  - [x] Reference existing `src/modules/users/components/invite-user-dialog.tsx`
  - [x] Email input with validation (reuse `inviteUserSchema`)
  - [x] Name input (optional)
  - [x] Role dropdown (Admin, Editor, Finance)
  - [x] Call `inviteUser` action on submit
  - [x] Skip button
  - [x] Test: Invitation is sent via Clerk

- [x] Create `step-add-contact.tsx`
  - [x] Reference existing `src/modules/contacts/components/contact-form.tsx`
  - [x] Simplified contact form (name required, email optional)
  - [x] Role preset to "Author" (simplify multi-select)
  - [x] Call `createContact` action on submit
  - [x] Skip button
  - [x] Test: Contact is created in database

- [x] Create `step-create-title.tsx`
  - [x] Reference existing `src/modules/titles/components/title-form.tsx`
  - [x] Title, subtitle fields
  - [x] Format dropdown (Paperback default)
  - [x] Publication date picker (optional)
  - [x] Author dropdown (from Step 3 contact if created)
  - [x] Call `createTitle` action on submit
  - [x] Skip button
  - [x] Test: Title is created in database

- [x] Create `step-configure-isbn.tsx`
  - [x] Reference existing `src/modules/isbn-prefixes/components/isbn-prefix-form.tsx`
  - [x] Two-option layout (add prefix or import)
  - [x] Prefix input with validation (reuse `createIsbnPrefixSchema`)
  - [x] Block size selector (100, 1000, 10000)
  - [x] Call `createIsbnPrefix` action on submit
  - [x] Link to ISBN import page (redirect option)
  - [x] Skip/finish button
  - [x] Test: ISBN prefix is created

### Core Wizard Components
- [x] Create `onboarding-progress.tsx`
  - [x] Use existing `Progress` component from `@/components/ui/progress`
  - [x] Step circles with status indicators (completed/current/upcoming)
  - [x] Current step label
  - [x] Percentage calculation logic
  - [x] Test: Progress updates correctly

- [x] Create `onboarding-wizard.tsx`
  - [x] Step navigation (back/next/skip)
  - [x] Form state management
  - [x] Progress persistence on step change
  - [x] Keyboard navigation (Enter to advance)
  - [x] Test: Can navigate all steps

- [x] Create `onboarding-completion.tsx`
  - [x] Celebration animation
  - [x] Summary of created items
  - [x] "Go to Dashboard" button
  - [x] Test: Shows correct summary

### Page Integration
- [x] Create `src/app/(onboarding)/onboarding/page.tsx`
  - [x] Load onboarding progress
  - [x] Render wizard component
  - [x] Handle completion redirect

- [x] Update `src/app/(onboarding)/welcome/page.tsx`
  - [x] Check onboarding status
  - [x] Redirect to /onboarding if not complete
  - [x] Or redirect to /dashboard if complete

- [x] Create `dashboard-widget.tsx`
  - [x] Compact progress display
  - [x] Continue setup button
  - [x] Dismiss button with confirmation
  - [x] Test: Widget shows/hides correctly

- [x] Update dashboard layout to include widget
  - [x] Conditionally render based on onboarding status
  - [x] Position at top of dashboard

### Testing

Reference existing test patterns:
- Unit tests: `tests/unit/` (e.g., `tests/unit/api-actions.test.ts`)
- Integration tests: `tests/integration/` (e.g., `tests/integration/api-auth.test.ts`)

- [x] Create `tests/unit/onboarding-actions.test.ts`
  - [x] Test `updateOnboardingStep` action
  - [x] Test `skipOnboardingStep` action
  - [x] Test `completeOnboarding` action
  - [x] Test `dismissOnboarding` action
- [x] Create `tests/unit/onboarding-progress.test.ts`
  - [x] Test progress calculation logic
  - [x] Test step completion tracking
- [x] Create `tests/unit/onboarding-wizard.test.tsx`
  - [x] Test wizard navigation (back/next/skip)
  - [x] Test step validation
- [x] Create `tests/integration/onboarding-flow.test.ts`
  - [x] Test: Complete full onboarding flow
  - [x] Test: Skip all steps and complete
  - [x] Test: Resume from middle of flow
  - [x] Test: RLS prevents cross-tenant access

---

## Dev Notes

### Wizard State Management

Use React Hook Form with FormProvider to share state across steps:

```tsx
const methods = useForm<OnboardingFormData>({
  defaultValues: {
    // Step 1
    companyName: tenant.name,
    logo: null,
    primaryColor: '#1E3A5F',
    fiscalYearStart: 1,
    currency: 'USD',
    statementFrequency: 'quarterly',
    // Step 2
    inviteEmail: '',
    inviteName: '',
    inviteRole: 'editor',
    // Step 3
    contactName: '',
    contactEmail: '',
    contactRoles: ['author'],
    // Step 4
    titleName: '',
    titleSubtitle: '',
    titleFormat: 'paperback',
    titlePubDate: null,
    titleAuthorId: null,
    // Step 5
    isbnPrefix: '',
    isbnBlockSize: 100,
  }
});
```

### Progress Calculation

```typescript
const calculateProgress = (stepsCompleted: Record<string, boolean | 'skipped'>) => {
  const REQUIRED_STEPS = [1]; // Only Step 1 is required
  const completedRequired = REQUIRED_STEPS.filter(
    step => stepsCompleted[step] === true
  ).length;
  return Math.round((completedRequired / REQUIRED_STEPS.length) * 100);
};
```

### Step Component Pattern

Each step component follows this structure:

```typescript
// src/modules/onboarding/components/step-add-contact.tsx
"use client";

import { useFormContext } from "react-hook-form";
import { createContact } from "@/modules/contacts/actions";
import type { OnboardingFormData } from "../types";

interface StepAddContactProps {
  onComplete: (contactId: string) => void;
  onSkip: () => void;
}

export function StepAddContact({ onComplete, onSkip }: StepAddContactProps) {
  const { watch, setValue } = useFormContext<OnboardingFormData>();

  const handleCreate = async () => {
    const result = await createContact({
      first_name: watch("contactName"),
      email: watch("contactEmail"),
    }, [{ role: "author" }]);

    if (result.success) {
      onComplete(result.data.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Form fields */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onSkip}>Skip</Button>
        <Button onClick={handleCreate}>Create Contact</Button>
      </div>
    </div>
  );
}
```

---

## Dev Agent Record

### File List

**Database Schema:**
- `src/db/schema/onboarding.ts` (created)
- `src/db/schema/index.ts` (modified - added onboarding export)
- `src/db/schema/relations.ts` (modified - added onboardingProgress relation)
- `drizzle/migrations/0007_fearless_snowbird.sql` (created - table migration)
- `drizzle/migrations/0008_onboarding_rls.sql` (created - RLS policies)

**Module Structure:**
- `src/modules/onboarding/actions.ts` (created)
- `src/modules/onboarding/queries.ts` (created)
- `src/modules/onboarding/types.ts` (created)
- `src/modules/onboarding/schema.ts` (created)
- `src/modules/onboarding/index.ts` (created)

**Components:**
- `src/modules/onboarding/components/onboarding-wizard.tsx` (created)
- `src/modules/onboarding/components/onboarding-progress.tsx` (created)
- `src/modules/onboarding/components/step-company-profile.tsx` (created)
- `src/modules/onboarding/components/step-invite-team.tsx` (created)
- `src/modules/onboarding/components/step-add-contact.tsx` (created)
- `src/modules/onboarding/components/step-create-title.tsx` (created)
- `src/modules/onboarding/components/step-configure-isbn.tsx` (created)
- `src/modules/onboarding/components/onboarding-completion.tsx` (created)
- `src/modules/onboarding/components/dashboard-widget.tsx` (created)

**Pages:**
- `src/app/(onboarding)/onboarding/page.tsx` (created)
- `src/app/(dashboard)/dashboard/components/onboarding-widget-wrapper.tsx` (created)
- `src/app/(onboarding)/welcome/page.tsx` (modified - added onboarding redirect)
- `src/app/(dashboard)/dashboard/page.tsx` (modified - added widget integration)

**Tests:**
- `tests/unit/onboarding-actions.test.ts` (created - 14 tests)
- `tests/unit/onboarding-progress.test.ts` (created - 17 tests)
- `tests/unit/onboarding-wizard.test.tsx` (created - 17 tests)
- `tests/integration/onboarding-flow.test.ts` (created - 22 tests)

---

## Changelog

| Date | Author | Changes |
|------|--------|---------|
| 2025-12-20 | SM Agent | Initial story creation |
| 2025-12-20 | SM Agent | Applied validation improvements: added UX design references, replaced SQL with Drizzle schema, added Existing Code to Reuse section, updated all step tasks with explicit action/schema references, added test file patterns, deferred logo upload to future enhancement |
| 2025-12-20 | Dev Agent | Code review fixes: Added Dev Agent Record with File List section; Updated StepCompanyProfile to pass company name to onComplete for step_data persistence |
