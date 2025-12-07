# Story 7.5: Add Customizable Royalty Period Setting

Status: review

## Story

As a **tenant owner**,
I want **to configure the royalty calculation period independently of fiscal year**,
So that **royalty periods match our business practices**.

## Acceptance Criteria

### AC-1: Navigate to Royalty Period Settings
**Given** I am logged in as Owner or Admin
**When** I navigate to /settings/tenant
**Then** I see a new "Royalty Period Settings" section below the existing settings

### AC-2: Period Type Selection
**Given** I am viewing the Royalty Period Settings section
**When** I view the Period Type dropdown
**Then** I see three options:
- Calendar Year (Jan 1 - Dec 31)
- Fiscal Year (uses existing fiscal_year_start setting)
- Custom

### AC-3: Custom Period Configuration
**Given** I have selected "Custom" as the Period Type
**When** the Custom option is selected
**Then** I see additional fields:
- Start Month dropdown (1-12)
- Start Day dropdown (1-31, validated per month)

### AC-4: Period Preview Display
**Given** I have configured a royalty period
**When** the settings are complete
**Then** I see a preview: "Your royalty year runs from [date] to [date]"

### AC-5: Statement Wizard Integration
**Given** royalty period settings are configured
**When** Finance user opens the statement generation wizard
**Then** the period selection respects the tenant's royalty period setting

### AC-6: Reports Period Default
**Given** royalty period settings are configured
**When** viewing royalty-related reports
**Then** period filter defaults to current royalty period

### AC-7: Start Date Validation
**Given** I am configuring a Custom period
**When** I enter an invalid start date (e.g., Feb 31)
**Then** I see a validation error indicating the date is invalid

### AC-8: Mid-Period Change Warning
**Given** I am changing royalty period settings
**When** the change would affect in-progress calculations
**Then** I see a warning: "Changing period settings may affect in-progress calculations"

### AC-9: Database Schema Update
**Given** the system needs to store royalty period settings
**When** new tenant settings fields are added
**Then** the database includes:
- royalty_period_type: enum('calendar_year', 'fiscal_year', 'custom')
- royalty_period_start_month: integer (1-12, nullable)
- royalty_period_start_day: integer (1-31, nullable)

### AC-10: Existing Tenant Migration
**Given** existing tenants without royalty period configuration
**When** the migration runs
**Then** all existing tenants default to "fiscal_year" period type

## Tasks / Subtasks

- [x] **Task 1: Database Schema Update** (AC: 9, 10)
  - [x] 1.1: Add columns to `src/db/schema/tenants.ts`:
    ```typescript
    royalty_period_type: text("royalty_period_type").notNull().default("fiscal_year"),
    royalty_period_start_month: integer("royalty_period_start_month"),
    royalty_period_start_day: integer("royalty_period_start_day"),
    ```
  - [x] 1.2: Run `npm run db:generate` to create migration
  - [x] 1.3: Migration defaults existing rows to 'fiscal_year'

- [x] **Task 2: Update Type Definitions** (AC: 9)
  - [x] 2.1: Add to `src/modules/tenant/types.ts`:
    ```typescript
    export type RoyaltyPeriodType = 'calendar_year' | 'fiscal_year' | 'custom';
    ```
  - [x] 2.2: Extend `TenantSettings` interface with new fields

- [x] **Task 3: Update Zod Validation Schemas** (AC: 7)
  - [x] 3.1: Update `src/modules/tenant/schema.ts` with:
    ```typescript
    royalty_period_type: z.enum(['calendar_year', 'fiscal_year', 'custom']),
    royalty_period_start_month: z.number().min(1).max(12).nullable(),
    royalty_period_start_day: z.number().min(1).max(31).nullable(),
    ```
  - [x] 3.2: Add superRefine for day-per-month validation
  - [x] 3.3: Add conditional required validation (month/day required when type is 'custom')

- [x] **Task 4: Update Server Actions** (AC: 9)
  - [x] 4.1: Update `getTenantSettings` in `src/modules/tenant/actions.ts`
  - [x] 4.2: Update `updateTenantSettings` to persist new fields

- [x] **Task 5: Update Tenant Settings Form UI** (AC: 1-4, 7, 8)
  - [x] 5.1: Add Royalty Period section to `src/modules/tenant/components/tenant-settings-form.tsx`
  - [x] 5.2: Period Type radio group (Calendar Year, Fiscal Year, Custom)
  - [x] 5.3: Conditional Month/Day dropdowns using `MONTHS` and `getDaysInMonth()` constants
  - [x] 5.4: Period preview with `formatRoyaltyPeriodPreview()`
  - [x] 5.5: Warning dialog for mid-period changes

- [x] **Task 6: Create Period Calculation Utility** (AC: 4, 5, 6)
  - [x] 6.1: Create `src/lib/royalty-period.ts`:
    ```typescript
    export const MONTHS = [
      { value: 1, label: 'January' }, { value: 2, label: 'February' },
      // ... all 12 months
    ] as const;

    export function getDaysInMonth(month: number): number;
    export function isValidDayForMonth(month: number, day: number): boolean;
    export function getRoyaltyPeriodDates(settings: TenantSettings, year: number): { start: Date; end: Date };
    export function getCurrentRoyaltyPeriod(settings: TenantSettings): { start: Date; end: Date };
    export function formatRoyaltyPeriodPreview(settings: TenantSettings): string;
    ```

- [x] **Task 7: Update Statement Wizard** (AC: 5)
  - [x] 7.1: Update `src/modules/statements/components/statement-wizard-modal.tsx`:
    - Add `'royalty_period'` to `PeriodType` type
    - Update `WizardFormData` interface
  - [x] 7.2: Update `src/modules/statements/components/statement-step-period.tsx`:
    - Add "Royalty Period" radio option as first choice
    - Fetch tenant settings when selected
    - Display calculated royalty period dates
  - [x] 7.3: Default selection to "Royalty Period" when tenant has it configured

- [x] **Task 8: Unit Tests** (AC: all)
  - [x] 8.1: Create `tests/unit/royalty-period.test.ts`:
    - Test `getDaysInMonth()` for all months
    - Test Feb 29 in leap years (2024, 2028) vs non-leap (2023, 2025)
    - Test `isValidDayForMonth()` edge cases (Feb 31 → false, Jan 31 → true)
    - Test period calculation for all three types
    - Test fiscal_year with null fiscal_year_start (should default to calendar year)
  - [x] 8.2: Update `tests/unit/tenant-schema.test.ts`:
    - Test validation for all period types
    - Test conditional required fields
  - [x] 8.3: Update `tests/support/fixtures/factories/tenant-factory.ts`:
    ```typescript
    export interface Tenant {
      // ... existing fields ...
      royalty_period_type: 'calendar_year' | 'fiscal_year' | 'custom';
      royalty_period_start_month: number | null;
      royalty_period_start_day: number | null;
    }
    ```

- [x] **Task 9: Integration Tests** (AC: 1-5)
  - [x] 9.1: Update `tests/integration/tenant-settings.test.ts`:
    - Test settings form load with new fields
    - Test save with each period type
    - Test validation errors display
  - [x] 9.2: Test period type transitions (calendar → fiscal → custom)
  - [x] 9.3: Test statement wizard integration

- [x] **Task 10: Reports Integration** (AC: 6)
  - [x] 10.1: Create date preset dropdown with "Royalty Period" option
  - [x] 10.2: Update `src/modules/reports/components/sales-report-filters.tsx` with date presets
  - [x] 10.3: Add presets: Custom, Royalty Period, Last 30 Days, Last 90 Days, This Year, Last Year

## Dev Notes

### Architecture Patterns

**Existing Module Pattern:**
- Settings form: `src/modules/tenant/components/tenant-settings-form.tsx`
- Server actions: `src/modules/tenant/actions.ts`
- Zod schemas: `src/modules/tenant/schema.ts`
- Types: `src/modules/tenant/types.ts`
- Database: `src/db/schema/tenants.ts`

**Form Pattern:** React Hook Form + Zod resolver with conditional field visibility

### Fiscal Year Edge Case Handling

**CRITICAL:** When `royalty_period_type === 'fiscal_year'` but `fiscal_year_start` is null:
- Default to calendar year behavior (Jan 1 - Dec 31)
- Show info message in UI: "Configure fiscal year start date for accurate period calculation"

```typescript
function getRoyaltyPeriodDates(settings: TenantSettings, year: number) {
  switch (settings.royalty_period_type) {
    case 'calendar_year':
      return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };

    case 'fiscal_year':
      if (!settings.fiscal_year_start) {
        // Fallback to calendar year when fiscal_year_start not set
        return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };
      }
      const fiscalStart = new Date(settings.fiscal_year_start);
      const startMonth = fiscalStart.getMonth();
      const startDay = fiscalStart.getDate();
      return {
        start: new Date(year, startMonth, startDay),
        end: new Date(year + 1, startMonth, startDay - 1)
      };

    case 'custom':
      const month = settings.royalty_period_start_month! - 1;
      const day = settings.royalty_period_start_day!;
      return {
        start: new Date(year, month, day),
        end: new Date(year + 1, month, day - 1)
      };
  }
}
```

### Day Validation Logic

```typescript
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function getDaysInMonth(month: number): number {
  return DAYS_IN_MONTH[month - 1];
}

export function isValidDayForMonth(month: number, day: number): boolean {
  return day >= 1 && day <= getDaysInMonth(month);
}
```

### Statement Wizard Integration Path

**Order of changes:**
1. `statement-wizard-modal.tsx` - Add `'royalty_period'` to `PeriodType` type
2. `statement-step-period.tsx` - Add radio option and period calculation display
3. Fetch tenant settings via `getTenantSettings()` when "Royalty Period" selected

### Project Structure

**Files to Create:**
- `src/lib/royalty-period.ts`
- `src/lib/hooks/use-royalty-period.ts`
- `tests/unit/royalty-period.test.ts`

**Files to Modify:**
- `src/db/schema/tenants.ts`
- `src/modules/tenant/types.ts`
- `src/modules/tenant/schema.ts`
- `src/modules/tenant/actions.ts`
- `src/modules/tenant/components/tenant-settings-form.tsx`
- `src/modules/statements/components/statement-wizard-modal.tsx`
- `src/modules/statements/components/statement-step-period.tsx`
- `tests/support/fixtures/factories/tenant-factory.ts`
- `tests/unit/tenant-schema.test.ts`
- `tests/integration/tenant-settings.test.ts`

### References

- [Source: src/modules/tenant/] - Existing tenant module
- [Source: src/modules/statements/components/statement-step-period.tsx] - Statement wizard period step
- [Source: src/modules/statements/components/statement-wizard-modal.tsx:39] - PeriodType definition
- [Source: tests/support/fixtures/factories/tenant-factory.ts:10-17] - Tenant interface

### Security

- Permission: `MANAGE_SETTINGS` (Owner/Admin only)
- Validate period type enum server-side
- Sanitize month (1-12) and day (1-31) inputs

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Fixed fiscal year date parsing timezone issue: Changed from `new Date("2024-07-01")` (UTC parsing) to parsing YYYY-MM-DD format directly to avoid timezone offset issues
- Fixed integration test mock: Added missing `royaltyPeriodTypeValues` export to mock

### Completion Notes List

- **Task 1**: Added royalty_period_type, royalty_period_start_month, royalty_period_start_day columns to tenants schema with proper defaults
- **Task 2**: Extended TenantSettings interface with RoyaltyPeriodType and new fields
- **Task 3**: Added Zod validation with superRefine for day-per-month validation and conditional required fields
- **Task 4**: Updated getTenantSettings and updateTenantSettings server actions
- **Task 5**: Added complete Royalty Period Settings section to tenant settings form with radio group, conditional dropdowns, preview, and warning dialog
- **Task 6**: Created src/lib/royalty-period.ts with all period calculation utilities
- **Task 7**: Integrated royalty period option into statement wizard
- **Task 8**: Created 38 unit tests for royalty-period.ts, 27 tests for tenant-schema.test.ts
- **Task 9**: Added AC-7 and AC-3.3 integration tests for custom period validation
- **Task 10**: Added date preset dropdown to sales report filters with Royalty Period option

### File List

**Created:**
- `src/lib/royalty-period.ts` - Period calculation utilities
- `tests/unit/royalty-period.test.ts` - 38 unit tests
- `drizzle/migrations/0012_young_kat_farrell.sql` - Database migration

**Modified:**
- `src/db/schema/tenants.ts` - Added royalty period columns and type exports
- `src/modules/tenant/types.ts` - Extended TenantSettings interface
- `src/modules/tenant/schema.ts` - Added Zod validation with superRefine
- `src/modules/tenant/actions.ts` - Updated server actions
- `src/modules/tenant/components/tenant-settings-form.tsx` - Added UI section
- `src/modules/statements/components/statement-wizard-modal.tsx` - Added 'royalty_period' type
- `src/modules/statements/components/statement-step-period.tsx` - Added royalty period option
- `src/modules/reports/components/sales-report-filters.tsx` - Added date presets
- `tests/unit/tenant-schema.test.ts` - Added royalty period tests
- `tests/integration/tenant-settings.test.ts` - Added AC-7, AC-3.3 tests
- `tests/support/fixtures/factories/tenant-factory.ts` - Extended Tenant interface
